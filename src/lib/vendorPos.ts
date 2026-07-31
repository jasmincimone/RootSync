import {
  appBaseUrl,
  fetchConnectAccountStatus,
  getConnectStripeClient,
  stripeConnectErrorMessage,
  stripeTerminalKeyHint,
} from "@/lib/stripeConnectDemo";
import { sendPosSaleReceiptEmail } from "@/lib/email";
import { platformApplicationFeeCents } from "@/lib/platformFee";
import { connectDestinationPaymentIntentData } from "@/lib/stripeCheckoutWebhook";
import { prisma } from "@/lib/prisma";
import {
  OFFERING_STATUS,
  ORDER_ITEM_TYPE,
  VENDOR_STATUS,
  orderItemTypeForListingType,
} from "@/lib/roles";

export type VendorPosContext = {
  userId: string;
  email: string;
  vendorProfileId: string;
  displayName: string;
  connectAccountId: string;
};

export async function requireVendorPosContext(userId: string): Promise<
  | { ok: true; ctx: VendorPosContext }
  | { ok: false; error: string; status: number }
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      stripeConnectAccountId: true,
      vendorProfile: { select: { id: true, status: true, displayName: true } },
    },
  });

  if (!user?.vendorProfile || user.vendorProfile.status !== VENDOR_STATUS.APPROVED) {
    return { ok: false, error: "Approved vendor profile required.", status: 403 };
  }
  if (!user.stripeConnectAccountId) {
    return {
      ok: false,
      error: "Connect Stripe in Payment Hub before taking in-person payments.",
      status: 400,
    };
  }

  const status = await fetchConnectAccountStatus(user.stripeConnectAccountId);
  if (!status.readyToProcessPayments) {
    return {
      ok: false,
      error: "Stripe onboarding isn’t finished yet — complete Payment Hub setup first.",
      status: 400,
    };
  }

  return {
    ok: true,
    ctx: {
      userId: user.id,
      email: user.email,
      vendorProfileId: user.vendorProfile.id,
      displayName: user.vendorProfile.displayName,
      connectAccountId: user.stripeConnectAccountId,
    },
  };
}

function parseAmountCents(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  const cents = Math.round(raw);
  if (cents < 50) return null; // Stripe practical minimum for card
  if (cents > 1_000_000_00) return null;
  return cents;
}

export type PosSellableListing = {
  listingId: string;
  variantId: string | null;
  offeringId: string;
  title: string;
  listingType: string;
  priceCents: number;
  /** Display line for the picker */
  label: string;
};

/**
 * Active vendor offerings for Terminal / counter POS.
 * Live from Postgres — new ACTIVE listings appear on the next fetch (no separate import).
 * Includes PUBLIC and HIDDEN (in-person can sell before Discover publish).
 */
export async function listVendorPosSellableListings(
  ctx: VendorPosContext,
): Promise<PosSellableListing[]> {
  const listings = await prisma.listing.findMany({
    where: {
      vendorProfileId: ctx.vendorProfileId,
      offering: { status: OFFERING_STATUS.ACTIVE },
    },
    include: {
      offering: {
        select: {
          id: true,
          variants: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            select: { id: true, title: true, priceCents: true },
          },
        },
      },
    },
    orderBy: [{ title: "asc" }, { updatedAt: "desc" }],
  });

  const rows: PosSellableListing[] = [];
  for (const listing of listings) {
    const variants = listing.offering.variants;
    if (variants.length > 0) {
      for (const v of variants) {
        if (v.priceCents < 50) continue;
        rows.push({
          listingId: listing.id,
          variantId: v.id,
          offeringId: listing.offering.id,
          title: listing.title,
          listingType: listing.listingType,
          priceCents: v.priceCents,
          label: `${listing.title} · ${v.title}`,
        });
      }
      continue;
    }
    if (listing.priceCents < 50) continue;
    rows.push({
      listingId: listing.id,
      variantId: null,
      offeringId: listing.offering.id,
      title: listing.title,
      listingType: listing.listingType,
      priceCents: listing.priceCents,
      label: listing.title,
    });
  }
  return rows;
}

async function resolveTerminalChargeFromListing(args: {
  ctx: VendorPosContext;
  listingId: string;
  variantId?: string | null;
}): Promise<{
  amountCents: number;
  description: string;
  listingId: string;
  variantId: string | null;
  listingType: string;
  productId: string;
}> {
  const listing = await prisma.listing.findFirst({
    where: {
      id: args.listingId,
      vendorProfileId: args.ctx.vendorProfileId,
      offering: { status: OFFERING_STATUS.ACTIVE },
    },
    include: {
      offering: {
        select: {
          id: true,
          variants: {
            select: { id: true, title: true, priceCents: true },
          },
        },
      },
    },
  });
  if (!listing) {
    throw new Error("Listing not found, not yours, or not ACTIVE.");
  }

  const variantId = args.variantId?.trim() || null;
  if (variantId) {
    const variant = listing.offering.variants.find((v) => v.id === variantId);
    if (!variant) {
      throw new Error("That option is not on this listing.");
    }
    if (variant.priceCents < 50) {
      throw new Error("This option is under $0.50 and can’t be charged on the card reader.");
    }
    return {
      amountCents: variant.priceCents,
      description: `${listing.title} · ${variant.title}`.slice(0, 200),
      listingId: listing.id,
      variantId: variant.id,
      listingType: listing.listingType,
      productId: listing.id,
    };
  }

  if (listing.offering.variants.length > 0) {
    throw new Error("Choose a listing option (variant) for this item.");
  }
  if (listing.priceCents < 50) {
    throw new Error("This listing is under $0.50 and can’t be charged on the card reader.");
  }
  return {
    amountCents: listing.priceCents,
    description: listing.title.slice(0, 200),
    listingId: listing.id,
    variantId: null,
    listingType: listing.listingType,
    productId: listing.id,
  };
}

/**
 * Phone/tablet counter checkout — destination charge to the vendor's Connect account.
 * Customer pays on device (card / Apple Pay / Google Pay). Works without an M2 reader.
 */
export async function createVendorPosCheckout(args: {
  ctx: VendorPosContext;
  amountCents: unknown;
  description?: unknown;
  origin?: string;
}): Promise<{ orderId: string; checkoutUrl: string; amountCents: number }> {
  const amountCents = parseAmountCents(args.amountCents);
  if (amountCents == null) {
    throw new Error("Enter an amount of at least $0.50.");
  }

  const description =
    typeof args.description === "string" && args.description.trim()
      ? args.description.trim().slice(0, 200)
      : `In-person sale · ${args.ctx.displayName}`;

  const fee = platformApplicationFeeCents(amountCents);
  const piData = connectDestinationPaymentIntentData(
    amountCents,
    args.ctx.connectAccountId,
    fee,
  );

  const order = await prisma.order.create({
    data: {
      userId: args.ctx.userId,
      email: args.ctx.email,
      status: "pending",
      subtotalCents: amountCents,
      totalCents: amountCents,
      items: {
        create: {
          productId: `pos:${args.ctx.vendorProfileId}`,
          name: description,
          quantity: 1,
          priceCents: amountCents,
          type: ORDER_ITEM_TYPE.POS,
        },
      },
    },
  });

  const baseUrl = appBaseUrl(args.origin);
  const stripe = getConnectStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: amountCents,
          product_data: {
            name: description,
            description: `Paid to ${args.ctx.displayName} via RootSync`,
          },
        },
      },
    ],
    success_url: `${baseUrl}/account/vendor/pos?paid=1&orderId=${encodeURIComponent(order.id)}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/account/vendor/pos?canceled=1`,
    metadata: {
      orderId: order.id,
      type: "vendor_pos",
      vendorProfileId: args.ctx.vendorProfileId,
      connectAccountId: args.ctx.connectAccountId,
    },
    payment_intent_data: {
      ...piData,
      on_behalf_of: args.ctx.connectAccountId,
      metadata: {
        orderId: order.id,
        type: "vendor_pos",
        vendorProfileId: args.ctx.vendorProfileId,
      },
    },
  });

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.");
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  return { orderId: order.id, checkoutUrl: session.url, amountCents };
}

/** Platform Terminal location for destination-charge readers (owned by RootSync). */
export async function ensurePlatformTerminalLocation(displayName: string): Promise<string> {
  const existing = process.env.STRIPE_TERMINAL_LOCATION_ID?.trim();
  if (existing) return existing;

  const stripe = getConnectStripeClient();
  const listed = await stripe.terminal.locations.list({ limit: 100 });
  const match = listed.data.find((loc) => (loc.display_name || "").startsWith("RootSync"));
  if (match) return match.id;

  const location = await stripe.terminal.locations.create({
    display_name: (displayName.slice(0, 90) || "RootSync vendor POS").replace(/\n/g, " "),
    address: {
      line1: "Address on file",
      city: "Atlanta",
      state: "GA",
      country: "US",
      postal_code: "30301",
    },
  });
  console.warn(
    `[terminal] Created platform location ${location.id}. Set STRIPE_TERMINAL_LOCATION_ID=${location.id} in env.`,
  );
  return location.id;
}

export async function createTerminalConnectionToken(locationId?: string | null) {
  const stripe = getConnectStripeClient();
  try {
    const token = await stripe.terminal.connectionTokens.create(
      locationId ? { location: locationId } : {},
    );
    if (!token.secret) {
      throw new Error("Stripe returned an empty Terminal connection token.");
    }
    return token.secret;
  } catch (err) {
    // If a stale/invalid location id is configured, retry without location restriction.
    if (locationId) {
      try {
        const token = await stripe.terminal.connectionTokens.create({});
        if (!token.secret) {
          throw new Error("Stripe returned an empty Terminal connection token.");
        }
        console.warn(
          `[terminal] connection token with location ${locationId} failed; issued unrestricted token.`,
          err,
        );
        return token.secret;
      } catch {
        // fall through to original error
      }
    }
    const message = stripeConnectErrorMessage(err);
    throw new Error(
      message.includes("terminal") || message.toLowerCase().includes("connection")
        ? message
        : `Stripe Terminal error: ${message}. In the RootSync platform Stripe Dashboard, open Terminal and finish setup (Locations).`,
    );
  }
}

/**
 * card_present PaymentIntent for Stripe Terminal (destination charge).
 * M2 collection requires a native Terminal SDK app — not the browser.
 * Pass listingId (+ optional variantId) to charge a RootSync listing price from Postgres,
 * or amountCents for a custom counter amount.
 */
export async function createVendorTerminalPaymentIntent(args: {
  ctx: VendorPosContext;
  amountCents?: unknown;
  description?: unknown;
  listingId?: unknown;
  variantId?: unknown;
}): Promise<{
  orderId: string;
  clientSecret: string;
  paymentIntentId: string;
  amountCents: number;
  listingId?: string;
  variantId?: string | null;
}> {
  const listingIdRaw =
    typeof args.listingId === "string" && args.listingId.trim() ? args.listingId.trim() : null;

  let amountCents: number;
  let description: string;
  let listingId: string | null = null;
  let variantId: string | null = null;
  let itemType: string = ORDER_ITEM_TYPE.POS;
  let productId = `pos-terminal:${args.ctx.vendorProfileId}`;

  if (listingIdRaw) {
    const resolved = await resolveTerminalChargeFromListing({
      ctx: args.ctx,
      listingId: listingIdRaw,
      variantId: typeof args.variantId === "string" ? args.variantId : null,
    });
    amountCents = resolved.amountCents;
    description = resolved.description;
    listingId = resolved.listingId;
    variantId = resolved.variantId;
    itemType = orderItemTypeForListingType(resolved.listingType);
    productId = resolved.productId;
  } else {
    const parsed = parseAmountCents(args.amountCents);
    if (parsed == null) {
      throw new Error("Enter an amount of at least $0.50, or choose a listing.");
    }
    amountCents = parsed;
    description =
      typeof args.description === "string" && args.description.trim()
        ? args.description.trim().slice(0, 200)
        : `Card reader sale · ${args.ctx.displayName}`;
  }

  const fee = platformApplicationFeeCents(amountCents);
  const piData = connectDestinationPaymentIntentData(
    amountCents,
    args.ctx.connectAccountId,
    fee,
  );

  const order = await prisma.order.create({
    data: {
      userId: args.ctx.userId,
      email: args.ctx.email,
      status: "pending",
      subtotalCents: amountCents,
      totalCents: amountCents,
      items: {
        create: {
          productId,
          name: description,
          quantity: 1,
          priceCents: amountCents,
          type: itemType,
          listingId: listingId ?? undefined,
          variantId: variantId ?? undefined,
        },
      },
    },
  });

  const stripe = getConnectStripeClient();
  let intent;
  try {
    intent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      ...piData,
      on_behalf_of: args.ctx.connectAccountId,
      metadata: {
        orderId: order.id,
        type: "vendor_pos_terminal",
        vendorProfileId: args.ctx.vendorProfileId,
        connectAccountId: args.ctx.connectAccountId,
        ...(listingId ? { listingId } : {}),
        ...(variantId ? { variantId } : {}),
      },
    });
  } catch (err) {
    const hint = stripeTerminalKeyHint(err);
    throw new Error(hint || stripeConnectErrorMessage(err));
  }

  if (!intent.client_secret) {
    throw new Error("Stripe did not return a PaymentIntent client secret.");
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { stripePaymentIntent: intent.id },
  });

  return {
    orderId: order.id,
    clientSecret: intent.client_secret,
    paymentIntentId: intent.id,
    amountCents,
    listingId: listingId ?? undefined,
    variantId,
  };
}

export async function markPosOrderPaidFromPaymentIntent(paymentIntentId: string) {
  const stripe = getConnectStripeClient();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  const orderId = intent.metadata?.orderId?.trim();
  if (!orderId) return null;
  if (intent.status !== "succeeded") return null;

  const order = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: "paid",
      stripePaymentIntent: intent.id,
    },
  });
  return order;
}

export type PosOrderSummary = {
  id: string;
  status: string;
  totalCents: number;
  createdAt: string;
  itemLabel: string;
  paymentIntentId: string | null;
  sessionId: string | null;
};

/** Recent in-person / Terminal orders for this vendor (Postgres). */
export async function listVendorPosOrders(
  ctx: VendorPosContext,
  limit = 25,
): Promise<PosOrderSummary[]> {
  const take = Math.min(50, Math.max(1, limit));
  const orders = await prisma.order.findMany({
    where: {
      userId: ctx.userId,
      OR: [
        { items: { some: { type: ORDER_ITEM_TYPE.POS } } },
        { items: { some: { productId: { startsWith: "pos-terminal:" } } } },
        {
          stripePaymentIntent: { not: null },
          items: {
            some: {
              listingId: { not: null },
              listing: { vendorProfileId: ctx.vendorProfileId },
            },
          },
        },
      ],
    },
    include: {
      items: {
        select: { name: true, quantity: true, priceCents: true },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return orders.map((o) => ({
    id: o.id,
    status: o.status,
    totalCents: o.totalCents,
    createdAt: o.createdAt.toISOString(),
    itemLabel:
      o.items.map((i) => (i.quantity > 1 ? `${i.name} ×${i.quantity}` : i.name)).join(", ") ||
      "Sale",
    paymentIntentId: o.stripePaymentIntent,
    sessionId: o.stripeSessionId,
  }));
}

export async function sendVendorPosOrderReceiptEmail(args: {
  ctx: VendorPosContext;
  orderId: string;
  toEmail: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const order = await prisma.order.findFirst({
    where: {
      id: args.orderId,
      userId: args.ctx.userId,
    },
    include: {
      items: {
        select: {
          name: true,
          quantity: true,
          priceCents: true,
          type: true,
          productId: true,
          listingId: true,
          listing: { select: { vendorProfileId: true } },
        },
      },
    },
  });
  if (!order) {
    return { ok: false, error: "Order not found." };
  }

  const isPos =
    order.items.some((i) => i.type === ORDER_ITEM_TYPE.POS) ||
    order.items.some((i) => i.productId.startsWith("pos-terminal:")) ||
    (Boolean(order.stripePaymentIntent) &&
      order.items.some((i) => i.listing?.vendorProfileId === args.ctx.vendorProfileId));
  if (!isPos) {
    return { ok: false, error: "That order is not an in-person Terminal sale." };
  }

  const sent = await sendPosSaleReceiptEmail({
    to: args.toEmail,
    vendorDisplayName: args.ctx.displayName,
    orderId: order.id,
    totalCents: order.totalCents,
    itemLines: order.items.map((i) => ({
      name: i.name,
      quantity: i.quantity,
      priceCents: i.priceCents,
    })),
    paidAt: order.createdAt,
    paymentIntentId: order.stripePaymentIntent,
  });
  if (!sent.ok) {
    return { ok: false, error: sent.error || "Could not send receipt." };
  }
  return { ok: true };
}

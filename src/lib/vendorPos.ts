import { appBaseUrl, fetchConnectAccountStatus, getConnectStripeClient } from "@/lib/stripeConnectDemo";
import { platformApplicationFeeCents } from "@/lib/platformFee";
import { connectDestinationPaymentIntentData } from "@/lib/stripeCheckoutWebhook";
import { prisma } from "@/lib/prisma";
import { ORDER_ITEM_TYPE, VENDOR_STATUS } from "@/lib/roles";

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
  const token = await stripe.terminal.connectionTokens.create(
    locationId ? { location: locationId } : {},
  );
  return token.secret;
}

/**
 * card_present PaymentIntent for Stripe Terminal (destination charge).
 * M2 collection requires a native Terminal SDK app — not the browser.
 */
export async function createVendorTerminalPaymentIntent(args: {
  ctx: VendorPosContext;
  amountCents: unknown;
  description?: unknown;
}): Promise<{ orderId: string; clientSecret: string; paymentIntentId: string; amountCents: number }> {
  const amountCents = parseAmountCents(args.amountCents);
  if (amountCents == null) {
    throw new Error("Enter an amount of at least $0.50.");
  }

  const description =
    typeof args.description === "string" && args.description.trim()
      ? args.description.trim().slice(0, 200)
      : `Card reader sale · ${args.ctx.displayName}`;

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
          productId: `pos-terminal:${args.ctx.vendorProfileId}`,
          name: description,
          quantity: 1,
          priceCents: amountCents,
          type: ORDER_ITEM_TYPE.POS,
        },
      },
    },
  });

  const stripe = getConnectStripeClient();
  const intent = await stripe.paymentIntents.create({
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
    },
  });

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

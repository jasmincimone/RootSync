import { prisma } from "@/lib/prisma";
import { LISTING_TYPE, ORDER_ITEM_TYPE, orderItemTypeForListingType } from "@/lib/roles";
import { publicListingWhere } from "@/lib/offeringListing";
import {
  formatUnitSelectionsSummary,
  serializeOfferingOptionGroups,
  validateAndSnapshotUnitSelections,
  type UnitSelectionSnapshot,
} from "@/lib/offeringOptions";
import { resolveOfferingVariant } from "@/lib/offeringVariants";
import {
  assertInventoryAvailable,
  resolveAvailableInventory,
} from "@/lib/listingInventory";
import { discoverListingPath } from "@/config/discoverPaths";
import {
  appBaseUrl,
  fetchConnectAccountStatus,
  getConnectStripeClient,
} from "@/lib/stripeConnectDemo";
import { platformApplicationFeeCents } from "@/lib/platformFee";
import { connectDestinationPaymentIntentData } from "@/lib/stripeCheckoutWebhook";

export type MarketplaceListingCheckout = {
  id: string;
  offeringId: string;
  title: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  listingType: string;
  publicSlug: string | null;
  vendorProfile: {
    id: string;
    displayName: string;
    user: {
      id: string;
      stripeConnectAccountId: string | null;
    };
  };
  offering: {
    paymentUrl: string | null;
    productUrl: string | null;
    productDetails: {
      inventoryQuantity: number | null;
    } | null;
    variants: Array<{
      id: string;
      title: string;
      priceCents: number;
      unitsIncluded: number;
      durationMinutes: number | null;
      sku: string | null;
      inventoryQuantity: number | null;
    }>;
    optionGroups: Array<{
      id: string;
      sortOrder: number;
      name: string;
      values: Array<{
        id: string;
        sortOrder: number;
        label: string;
        imageUrl: string | null;
      }>;
    }>;
    eventDetails: {
      capacity: number | null;
    } | null;
  };
};

export async function loadListingForCheckout(
  listingId: string,
): Promise<MarketplaceListingCheckout | null> {
  const listing = await prisma.listing.findFirst({
    where: {
      id: listingId,
      ...publicListingWhere,
      priceCents: { gt: 0 },
    },
    select: {
      id: true,
      title: true,
      description: true,
      priceCents: true,
      imageUrl: true,
      listingType: true,
      publicSlug: true,
      offeringId: true,
      vendorProfile: {
        select: {
          id: true,
          displayName: true,
          user: {
            select: {
              id: true,
              stripeConnectAccountId: true,
            },
          },
        },
      },
      offering: {
        select: {
          paymentUrl: true,
          productUrl: true,
          productDetails: { select: { inventoryQuantity: true } },
          variants: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              priceCents: true,
              unitsIncluded: true,
              durationMinutes: true,
              sku: true,
              inventoryQuantity: true,
            },
          },
          optionGroups: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              sortOrder: true,
              name: true,
              values: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  sortOrder: true,
                  label: true,
                  imageUrl: true,
                },
              },
            },
          },
          eventDetails: { select: { capacity: true } },
        },
      },
    },
  });
  return listing;
}

function listingImageUrl(imageUrl: string | null, baseUrl: string): string[] | undefined {
  if (!imageUrl?.trim()) return undefined;
  try {
    return [new URL(imageUrl, baseUrl).href];
  } catch {
    return undefined;
  }
}

export async function createMarketplaceListingCheckout(args: {
  listing: MarketplaceListingCheckout;
  quantity: number;
  email: string;
  userId?: string;
  origin: string;
  variantId?: string | null;
  unitSelections?: unknown;
}): Promise<{ url: string; orderId: string }> {
  const { listing, quantity, email, userId, origin } = args;
  const variant = await resolveOfferingVariant(listing.offeringId, args.variantId);
  const unitsIncluded = variant?.unitsIncluded ?? 1;
  const optionGroups = serializeOfferingOptionGroups(listing.offering.optionGroups ?? []);
  let unitSelections: UnitSelectionSnapshot[] | null = null;
  try {
    unitSelections = validateAndSnapshotUnitSelections({
      unitsIncluded,
      optionGroups,
      raw: args.unitSelections,
    });
  } catch (e) {
    throw e instanceof Error ? e : new Error("Invalid option selections.");
  }

  const unitPriceCents = variant?.priceCents ?? listing.priceCents;
  const lineName = variant ? `${listing.title} — ${variant.title}` : listing.title;
  const selectionSummary = formatUnitSelectionsSummary(unitSelections);
  const subtotalCents = unitPriceCents * quantity;
  const baseUrl = appBaseUrl(origin);
  const stockUnits = quantity * unitsIncluded;

  const eventCapacity = listing.offering.eventDetails?.capacity;
  if (listing.listingType === LISTING_TYPE.EVENT && eventCapacity != null) {
    const sold = await prisma.orderItem.aggregate({
      where: {
        listingId: listing.id,
        type: ORDER_ITEM_TYPE.EVENT,
        order: { status: "paid" },
      },
      _sum: { quantity: true },
    });
    const remaining = Math.max(0, eventCapacity - (sold._sum.quantity ?? 0));
    if (quantity > remaining) {
      throw new Error(
        remaining === 0
          ? "This Event is sold out."
          : `Only ${remaining} ticket${remaining === 1 ? "" : "s"} remaining.`,
      );
    }
  }

  const available = resolveAvailableInventory({
    listingType: listing.listingType,
    productInventory: listing.offering.productDetails?.inventoryQuantity,
    variantInventory: variant?.inventoryQuantity,
  });
  // Deal-level inventory counts deals; product inventory counts individual units.
  const inventoryQty =
    variant?.inventoryQuantity != null ? quantity : stockUnits;
  assertInventoryAvailable({ available, quantity: inventoryQty });

  const order = await prisma.order.create({
    data: {
      userId: userId ?? null,
      email,
      status: "pending",
      subtotalCents,
      totalCents: subtotalCents,
      items: {
        create: {
          productId: listing.id,
          name: lineName,
          quantity,
          priceCents: unitPriceCents,
          type: orderItemTypeForListingType(listing.listingType),
          listingId: listing.id,
          variantId: variant?.id ?? null,
          unitSelections: unitSelections ?? undefined,
        },
      },
    },
  });

  const connectAccountId = listing.vendorProfile.user.stripeConnectAccountId;
  let useConnect = false;
  if (connectAccountId) {
    try {
      const onboarding = await fetchConnectAccountStatus(connectAccountId);
      useConnect = onboarding.readyToProcessPayments;
    } catch {
      useConnect = false;
    }
  }

  if (!useConnect || !connectAccountId) {
    throw new Error(
      "This vendor is not ready to accept card payments on RootSync yet. Use their payment link if available, or try again later.",
    );
  }

  const stripe = getConnectStripeClient();
  const images = listingImageUrl(listing.imageUrl, baseUrl);
  const applicationFeeCents = platformApplicationFeeCents(subtotalCents);
  const stripeDescription = [selectionSummary, listing.description]
    .filter(Boolean)
    .join(" — ")
    .slice(0, 500);

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "payment",
    customer_email: email,
    line_items: [
      {
        quantity,
        price_data: {
          currency: "usd",
          unit_amount: unitPriceCents,
          product_data: {
            name: lineName,
            description: stripeDescription || undefined,
            images,
          },
        },
      },
    ],
    success_url: `${baseUrl}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}${discoverListingPath(listing)}`,
    metadata: {
      orderId: order.id,
      listingId: listing.id,
      vendorProfileId: listing.vendorProfile.id,
      ...(variant ? { variantId: variant.id } : {}),
      ...(selectionSummary
        ? { unitSelections: selectionSummary.slice(0, 450) }
        : {}),
    },
    payment_intent_data: connectDestinationPaymentIntentData(
      subtotalCents,
      connectAccountId,
      applicationFeeCents,
    ),
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  if (!session.url) {
    throw new Error("Stripe Checkout session missing URL");
  }

  return { url: session.url, orderId: order.id };
}

export type MarketplaceCartCheckoutItem = {
  listingId: string;
  quantity: number;
  variantId?: string | null;
  unitSelections?: unknown;
};

type PreparedCartLine = {
  listing: MarketplaceListingCheckout;
  quantity: number;
  variantId: string | null;
  unitPriceCents: number;
  lineName: string;
  unitSelections: UnitSelectionSnapshot[] | null;
  selectionSummary: string;
};

async function prepareCartLine(item: MarketplaceCartCheckoutItem): Promise<PreparedCartLine> {
  const quantity = Math.floor(item.quantity);
  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
    throw new Error("Each cart item quantity must be between 1 and 99.");
  }

  const listing = await loadListingForCheckout(item.listingId);
  if (!listing) {
    throw new Error("A cart item is no longer available.");
  }

  if (
    listing.listingType === LISTING_TYPE.SERVICE ||
    listing.listingType === LISTING_TYPE.EVENT
  ) {
    throw new Error(
      `${listing.title} can’t go in the cart — book or buy tickets from the listing page.`,
    );
  }

  const variant = await resolveOfferingVariant(listing.offeringId, item.variantId);
  const unitsIncluded = variant?.unitsIncluded ?? 1;
  const optionGroups = serializeOfferingOptionGroups(listing.offering.optionGroups ?? []);
  const unitSelections = validateAndSnapshotUnitSelections({
    unitsIncluded,
    optionGroups,
    raw: item.unitSelections,
  });

  const unitPriceCents = variant?.priceCents ?? listing.priceCents;
  const lineName = variant ? `${listing.title} — ${variant.title}` : listing.title;
  const selectionSummary = formatUnitSelectionsSummary(unitSelections);

  const available = resolveAvailableInventory({
    listingType: listing.listingType,
    productInventory: listing.offering.productDetails?.inventoryQuantity,
    variantInventory: variant?.inventoryQuantity,
  });
  const inventoryQty =
    variant?.inventoryQuantity != null ? quantity : quantity * unitsIncluded;
  assertInventoryAvailable({ available, quantity: inventoryQty });

  return {
    listing,
    quantity,
    variantId: variant?.id ?? null,
    unitPriceCents,
    lineName,
    unitSelections,
    selectionSummary,
  };
}

/**
 * Same-vendor multi-item checkout → one Stripe Connect destination charge.
 */
export async function createMarketplaceCartCheckout(args: {
  items: MarketplaceCartCheckoutItem[];
  email: string;
  userId?: string;
  origin: string;
}): Promise<{ url: string; orderId: string }> {
  if (!Array.isArray(args.items) || args.items.length === 0) {
    throw new Error("Your cart is empty.");
  }
  if (args.items.length > 40) {
    throw new Error("Cart is too large. Remove some items and try again.");
  }

  const prepared: PreparedCartLine[] = [];
  for (const item of args.items) {
    if (!item?.listingId || typeof item.listingId !== "string") {
      throw new Error("Cart contains an invalid listing.");
    }
    prepared.push(await prepareCartLine(item));
  }

  const vendorProfileId = prepared[0]!.listing.vendorProfile.id;
  if (prepared.some((row) => row.listing.vendorProfile.id !== vendorProfileId)) {
    throw new Error("Checkout one vendor at a time. Clear mixed-vendor items from your cart.");
  }

  const connectAccountId = prepared[0]!.listing.vendorProfile.user.stripeConnectAccountId;
  let useConnect = false;
  if (connectAccountId) {
    try {
      const onboarding = await fetchConnectAccountStatus(connectAccountId);
      useConnect = onboarding.readyToProcessPayments;
    } catch {
      useConnect = false;
    }
  }
  if (!useConnect || !connectAccountId) {
    throw new Error(
      "This vendor is not ready to accept card payments on RootSync yet. Try Buy now on a single listing, or use their payment link.",
    );
  }

  const subtotalCents = prepared.reduce(
    (sum, row) => sum + row.unitPriceCents * row.quantity,
    0,
  );
  if (subtotalCents <= 0) {
    throw new Error("Cart total must be greater than zero.");
  }

  const baseUrl = appBaseUrl(args.origin);
  const order = await prisma.order.create({
    data: {
      userId: args.userId ?? null,
      email: args.email,
      status: "pending",
      subtotalCents,
      totalCents: subtotalCents,
      items: {
        create: prepared.map((row) => ({
          productId: row.listing.id,
          name: row.lineName,
          quantity: row.quantity,
          priceCents: row.unitPriceCents,
          type: orderItemTypeForListingType(row.listing.listingType),
          listingId: row.listing.id,
          variantId: row.variantId,
          unitSelections: row.unitSelections ?? undefined,
        })),
      },
    },
  });

  const stripe = getConnectStripeClient();
  const applicationFeeCents = platformApplicationFeeCents(subtotalCents);
  const vendorName = prepared[0]!.listing.vendorProfile.displayName;

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "payment",
    customer_email: args.email,
    line_items: prepared.map((row) => {
      const images = listingImageUrl(row.listing.imageUrl, baseUrl);
      const description = [row.selectionSummary, row.listing.description]
        .filter(Boolean)
        .join(" — ")
        .slice(0, 500);
      return {
        quantity: row.quantity,
        price_data: {
          currency: "usd",
          unit_amount: row.unitPriceCents,
          product_data: {
            name: row.lineName,
            description: description || undefined,
            images,
          },
        },
      };
    }),
    success_url: `${baseUrl}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}&clear_cart=1`,
    cancel_url: `${baseUrl}/cart`,
    metadata: {
      orderId: order.id,
      vendorProfileId,
      cart: "1",
      itemCount: String(prepared.length),
      vendorName: vendorName.slice(0, 100),
    },
    payment_intent_data: connectDestinationPaymentIntentData(
      subtotalCents,
      connectAccountId,
      applicationFeeCents,
    ),
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeSessionId: session.id },
  });

  if (!session.url) {
    throw new Error("Stripe Checkout session missing URL");
  }

  return { url: session.url, orderId: order.id };
}

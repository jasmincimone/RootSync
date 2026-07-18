import { prisma } from "@/lib/prisma";
import { LISTING_TYPE, ORDER_ITEM_TYPE, orderItemTypeForListingType } from "@/lib/roles";
import { publicListingWhere } from "@/lib/offeringListing";
import { resolveOfferingVariant } from "@/lib/offeringVariants";
import {
  appBaseUrl,
  fetchConnectAccountStatus,
  getConnectStripeClient,
} from "@/lib/stripeConnectDemo";
import { platformApplicationFeeCents } from "@/lib/platformFee";

export type MarketplaceListingCheckout = {
  id: string;
  offeringId: string;
  title: string;
  description: string;
  priceCents: number;
  imageUrl: string | null;
  listingType: string;
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
    variants: Array<{
      id: string;
      title: string;
      priceCents: number;
      durationMinutes: number | null;
      sku: string | null;
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
          variants: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              priceCents: true,
              durationMinutes: true,
              sku: true,
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
}): Promise<{ url: string; orderId: string }> {
  const { listing, quantity, email, userId, origin } = args;
  const variant = await resolveOfferingVariant(listing.offeringId, args.variantId);
  const unitPriceCents = variant?.priceCents ?? listing.priceCents;
  const lineName = variant ? `${listing.title} — ${variant.title}` : listing.title;
  const subtotalCents = unitPriceCents * quantity;
  const baseUrl = appBaseUrl(origin);

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
            description: listing.description.slice(0, 500) || undefined,
            images,
          },
        },
      },
    ],
    success_url: `${baseUrl}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/discover/listings/${listing.id}`,
    metadata: {
      orderId: order.id,
      listingId: listing.id,
      vendorProfileId: listing.vendorProfile.id,
      ...(variant ? { variantId: variant.id } : {}),
    },
    payment_intent_data: {
      application_fee_amount: applicationFeeCents,
      transfer_data: { destination: connectAccountId },
    },
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

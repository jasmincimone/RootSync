import { prisma } from "@/lib/prisma";
import { publicListingWhere } from "@/lib/offeringListing";
import { resolveOfferingVariant } from "@/lib/offeringVariants";
import { LISTING_TYPE, ORDER_ITEM_TYPE } from "@/lib/roles";

export type FreeResourceClaimResult = {
  orderId: string;
  itemId: string;
  downloadHref: string;
  alreadyOwned: boolean;
};

/**
 * Grant a signed-in Member free download access to a $0 Resource.
 * Creates a paid $0 order (no Stripe) so /api/download ownership checks still apply.
 */
export async function claimFreeResourceListing(args: {
  listingId: string;
  userId: string;
  email: string;
  variantId?: string | null;
}): Promise<FreeResourceClaimResult> {
  const listing = await prisma.listing.findFirst({
    where: {
      id: args.listingId,
      listingType: LISTING_TYPE.RESOURCE,
      ...publicListingWhere,
    },
    select: {
      id: true,
      title: true,
      priceCents: true,
      offeringId: true,
      offering: {
        select: {
          resourceDetails: { select: { fileUrl: true } },
          variants: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, title: true, priceCents: true },
          },
        },
      },
    },
  });

  if (!listing) {
    throw new Error("Resource not found or not available.");
  }

  const fileUrl = listing.offering.resourceDetails?.fileUrl?.trim();
  if (!fileUrl) {
    throw new Error("This Resource has no downloadable file yet.");
  }

  const variant = await resolveOfferingVariant(listing.offeringId, args.variantId);
  const unitPriceCents = variant?.priceCents ?? listing.priceCents;
  if (!Number.isFinite(unitPriceCents) || unitPriceCents > 0) {
    throw new Error("This Resource is not free. Use Buy now to purchase it.");
  }

  const email = args.email.trim().toLowerCase();
  if (!email) {
    throw new Error("Email is required to claim this Resource.");
  }

  const existing = await prisma.orderItem.findFirst({
    where: {
      listingId: listing.id,
      type: { in: [ORDER_ITEM_TYPE.RESOURCE, ORDER_ITEM_TYPE.DIGITAL] },
      order: {
        status: "paid",
        OR: [{ userId: args.userId }, { email: { equals: email, mode: "insensitive" } }],
      },
    },
    select: { id: true, orderId: true },
  });

  if (existing) {
    return {
      orderId: existing.orderId,
      itemId: existing.id,
      downloadHref: `/api/download?orderId=${encodeURIComponent(existing.orderId)}&itemId=${encodeURIComponent(existing.id)}`,
      alreadyOwned: true,
    };
  }

  const lineName = variant ? `${listing.title} — ${variant.title}` : listing.title;

  const order = await prisma.order.create({
    data: {
      userId: args.userId,
      email,
      status: "paid",
      subtotalCents: 0,
      totalCents: 0,
      items: {
        create: {
          productId: listing.id,
          name: lineName,
          quantity: 1,
          priceCents: 0,
          type: ORDER_ITEM_TYPE.RESOURCE,
          listingId: listing.id,
          variantId: variant?.id ?? null,
        },
      },
    },
    include: { items: { select: { id: true } } },
  });

  const itemId = order.items[0]?.id;
  if (!itemId) {
    throw new Error("Could not create free Resource order.");
  }

  return {
    orderId: order.id,
    itemId,
    downloadHref: `/api/download?orderId=${encodeURIComponent(order.id)}&itemId=${encodeURIComponent(itemId)}`,
    alreadyOwned: false,
  };
}

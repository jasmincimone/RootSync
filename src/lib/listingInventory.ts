import { prisma } from "@/lib/prisma";
import { LISTING_TYPE } from "@/lib/roles";

export type InventorySource = {
  listingType: string;
  productInventory: number | null | undefined;
  variantInventory?: number | null;
};

/**
 * Effective remaining stock for a purchase.
 * Variant inventory wins when set; else product-level; null = unlimited.
 */
export function resolveAvailableInventory(source: InventorySource): number | null {
  if (source.listingType !== LISTING_TYPE.PRODUCT) return null;
  if (source.variantInventory != null) return Math.max(0, source.variantInventory);
  if (source.productInventory != null) return Math.max(0, source.productInventory);
  return null;
}

export function assertInventoryAvailable(args: {
  available: number | null;
  quantity: number;
}): void {
  if (args.available == null) return;
  if (args.quantity > args.available) {
    throw new Error(
      args.available === 0
        ? "This item is sold out."
        : `Only ${args.available} left in stock.`,
    );
  }
}

/**
 * Decrement RootSync inventory after payment. Call only when the order
 * transitions into paid (not on webhook retries for already-paid orders).
 */
export async function decrementInventoryForPaidOrder(orderId: string): Promise<void> {
  const items = await prisma.orderItem.findMany({
    where: {
      orderId,
      listingId: { not: null },
    },
    select: {
      quantity: true,
      listingId: true,
      variantId: true,
      listing: {
        select: {
          listingType: true,
          offeringId: true,
          offering: {
            select: {
              productDetails: { select: { inventoryQuantity: true } },
            },
          },
        },
      },
    },
  });

  for (const item of items) {
    if (!item.listing || item.listing.listingType !== LISTING_TYPE.PRODUCT) continue;
    const dealQty = item.quantity;
    if (dealQty < 1) continue;

    if (item.variantId) {
      const variant = await prisma.offeringVariant.findUnique({
        where: { id: item.variantId },
        select: { inventoryQuantity: true, unitsIncluded: true },
      });
      if (variant?.inventoryQuantity != null) {
        await prisma.offeringVariant.updateMany({
          where: {
            id: item.variantId,
            inventoryQuantity: { gte: dealQty },
          },
          data: { inventoryQuantity: { decrement: dealQty } },
        });
        continue;
      }
      const units = dealQty * Math.max(1, variant?.unitsIncluded ?? 1);
      const productQty = item.listing.offering.productDetails?.inventoryQuantity;
      if (productQty == null) continue;
      await prisma.productDetails.updateMany({
        where: {
          offeringId: item.listing.offeringId,
          inventoryQuantity: { gte: units },
        },
        data: { inventoryQuantity: { decrement: units } },
      });
      continue;
    }

    const productQty = item.listing.offering.productDetails?.inventoryQuantity;
    if (productQty == null) continue;

    await prisma.productDetails.updateMany({
      where: {
        offeringId: item.listing.offeringId,
        inventoryQuantity: { gte: dealQty },
      },
      data: { inventoryQuantity: { decrement: dealQty } },
    });
  }
}

/** Mark order paid once; returns true if this call transitioned it to paid. */
export async function markOrderPaidOnce(args: {
  orderId: string;
  stripeSessionId?: string | null;
  stripePaymentIntent?: string | null;
}): Promise<boolean> {
  const result = await prisma.order.updateMany({
    where: {
      id: args.orderId,
      status: { not: "paid" },
    },
    data: {
      status: "paid",
      ...(args.stripeSessionId ? { stripeSessionId: args.stripeSessionId } : {}),
      ...(args.stripePaymentIntent
        ? { stripePaymentIntent: args.stripePaymentIntent }
        : {}),
    },
  });
  return result.count > 0;
}

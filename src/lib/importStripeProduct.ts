import type Stripe from "stripe";

import {
  createOfferingWithListing,
  updateOfferingAndSyncListing,
  vendorOfferingInclude,
} from "@/lib/offeringListing";
import { hookOfferingPublished } from "@/lib/pulse/hooks";
import { prisma } from "@/lib/prisma";
import { LISTING_TYPE, OFFERING_STATUS, VENDOR_STATUS } from "@/lib/roles";
import { getConnectStripeClient } from "@/lib/stripeConnectDemo";

export type ImportStripeProductResult = {
  action: "created" | "updated" | "archived" | "skipped";
  offeringId?: string;
  listingId?: string;
  reason?: string;
};

function resolvePriceCents(product: Stripe.Product): {
  priceCents: number;
  stripePriceId: string | null;
} {
  const defaultPrice = product.default_price;
  if (defaultPrice && typeof defaultPrice !== "string") {
    return {
      priceCents: defaultPrice.unit_amount ?? 0,
      stripePriceId: defaultPrice.id,
    };
  }
  if (typeof defaultPrice === "string") {
    return { priceCents: 0, stripePriceId: defaultPrice };
  }
  return { priceCents: 0, stripePriceId: null };
}

async function resolveVendorForConnectAccount(accountId: string) {
  const user = await prisma.user.findFirst({
    where: { stripeConnectAccountId: accountId },
    select: {
      id: true,
      vendorProfile: { select: { id: true, status: true } },
    },
  });
  if (!user?.vendorProfile) return null;
  if (user.vendorProfile.status !== VENDOR_STATUS.APPROVED) return null;
  return { userId: user.id, vendorProfileId: user.vendorProfile.id };
}

/**
 * Upsert a RootSync Offering/Listing from a Stripe Product on a connected account.
 * Used by webhooks (Dashboard-created products) and manual Payment Hub sync.
 */
export async function upsertOfferingFromStripeProduct(args: {
  connectAccountId: string;
  product: Stripe.Product;
  /** When true, inactive products become PAUSED; deleted flow should call archive instead. */
  source?: "webhook" | "manual_sync";
}): Promise<ImportStripeProductResult> {
  const { connectAccountId, product } = args;
  const vendor = await resolveVendorForConnectAccount(connectAccountId);
  if (!vendor) {
    return {
      action: "skipped",
      reason: "No approved vendor mapped to this Connect account.",
    };
  }

  // Prefer metadata link if RootSync already created this product.
  const metaOfferingId =
    typeof product.metadata?.rootsync_offering_id === "string"
      ? product.metadata.rootsync_offering_id.trim()
      : "";

  let existing = await prisma.offering.findFirst({
    where: {
      OR: [
        { stripeProductId: product.id },
        ...(metaOfferingId ? [{ id: metaOfferingId, vendorProfileId: vendor.vendorProfileId }] : []),
      ],
    },
    include: { listing: { select: { id: true } } },
  });

  let { priceCents, stripePriceId } = resolvePriceCents(product);

  // If default_price is only an id string, fetch amount from the connected account.
  if (priceCents <= 0 && stripePriceId) {
    try {
      const stripeClient = getConnectStripeClient();
      const price = await stripeClient.prices.retrieve(stripePriceId, {}, { stripeAccount: connectAccountId });
      priceCents = price.unit_amount ?? 0;
    } catch {
      /* keep 0 */
    }
  }

  const title = product.name?.trim() || "Untitled product";
  const description = (product.description?.trim() || title).slice(0, 5000);
  const imageUrl = product.images?.[0]?.trim() || null;
  const nextStatus = product.active ? OFFERING_STATUS.ACTIVE : OFFERING_STATUS.PAUSED;

  if (existing) {
    const previousStatus = existing.status;
    await prisma.$transaction(async (tx) => {
      await updateOfferingAndSyncListing(tx, existing!.id, {
        title,
        description,
        priceCents: Math.max(0, priceCents),
        imageUrl,
        status: nextStatus,
        stripeProductId: product.id,
        stripePriceId,
        listingType: LISTING_TYPE.PRODUCT,
      });
    });

    if (existing.listing && nextStatus === OFFERING_STATUS.ACTIVE) {
      await hookOfferingPublished(previousStatus, {
        listingId: existing.listing.id,
        vendorUserId: vendor.userId,
        currentStatus: nextStatus,
      });
    }

    return {
      action: "updated",
      offeringId: existing.id,
      listingId: existing.listing?.id,
    };
  }

  // Skip creating zero-price inactive junk from incomplete Dashboard drafts if desired —
  // still create so vendors see them as paused drafts.
  const offering = await prisma.$transaction(async (tx) => {
    const created = await createOfferingWithListing(tx, {
      vendorProfileId: vendor.vendorProfileId,
      listingType: LISTING_TYPE.PRODUCT,
      status: nextStatus,
      title,
      description,
      priceCents: Math.max(0, priceCents),
      imageUrl,
      details: { product: {} },
    });

    await tx.offering.update({
      where: { id: created.id },
      data: {
        stripeProductId: product.id,
        stripePriceId,
      },
    });

    // Link back so future RootSync → Stripe syncs update this product.
    try {
      const stripeClient = getConnectStripeClient();
      await stripeClient.products.update(
        product.id,
        { metadata: { ...product.metadata, rootsync_offering_id: created.id } },
        { stripeAccount: connectAccountId },
      );
    } catch (err) {
      console.warn("[importStripeProduct] could not write rootsync_offering_id metadata:", err);
    }

    return tx.offering.findUniqueOrThrow({
      where: { id: created.id },
      include: vendorOfferingInclude,
    });
  });

  if (offering.listing) {
    await hookOfferingPublished(null, {
      listingId: offering.listing.id,
      vendorUserId: vendor.userId,
      currentStatus: offering.status,
    });
  }

  return {
    action: "created",
    offeringId: offering.id,
    listingId: offering.listing?.id,
  };
}

/** Pause/archive a RootSync offering when its Stripe product is deleted. */
export async function archiveOfferingForStripeProduct(
  connectAccountId: string,
  productId: string,
): Promise<ImportStripeProductResult> {
  const vendor = await resolveVendorForConnectAccount(connectAccountId);
  if (!vendor) {
    return { action: "skipped", reason: "No approved vendor mapped to this Connect account." };
  }

  const existing = await prisma.offering.findFirst({
    where: { stripeProductId: productId, vendorProfileId: vendor.vendorProfileId },
    select: { id: true },
  });
  if (!existing) {
    return { action: "skipped", reason: "No offering linked to this Stripe product." };
  }

  await prisma.$transaction(async (tx) => {
    await updateOfferingAndSyncListing(tx, existing.id, {
      status: OFFERING_STATUS.ARCHIVED,
    });
  });

  return { action: "archived", offeringId: existing.id };
}

/**
 * Pull active (and optionally inactive) products from a connected account into offerings.
 */
export async function syncConnectedAccountProductsToOfferings(args: {
  connectAccountId: string;
  includeInactive?: boolean;
}): Promise<{
  imported: number;
  updated: number;
  archived: number;
  skipped: number;
  results: ImportStripeProductResult[];
}> {
  const stripeClient = getConnectStripeClient();
  const products = await stripeClient.products.list(
    {
      limit: 100,
      active: args.includeInactive ? undefined : true,
      expand: ["data.default_price"],
    },
    { stripeAccount: args.connectAccountId },
  );

  const results: ImportStripeProductResult[] = [];
  let imported = 0;
  let updated = 0;
  let archived = 0;
  let skipped = 0;

  for (const product of products.data) {
    const result = await upsertOfferingFromStripeProduct({
      connectAccountId: args.connectAccountId,
      product,
      source: "manual_sync",
    });
    results.push(result);
    if (result.action === "created") imported += 1;
    else if (result.action === "updated") updated += 1;
    else if (result.action === "archived") archived += 1;
    else skipped += 1;
  }

  return { imported, updated, archived, skipped, results };
}

export function isStripeProductEventType(type: string): boolean {
  return (
    type === "product.created" ||
    type === "product.updated" ||
    type === "product.deleted" ||
    type === "price.created" ||
    type === "price.updated"
  );
}

/**
 * Handle Connect product/price webhook events.
 * `event.account` is the connected account id for Connect destinations.
 */
export async function handleStripeProductWebhookEvent(event: Stripe.Event): Promise<void> {
  const connectAccountId =
    typeof event.account === "string" && event.account.startsWith("acct_")
      ? event.account
      : null;

  if (!connectAccountId) {
    // Platform-level product events are ignored for vendor offerings.
    console.info("[stripe product webhook] ignoring event without connected account", event.type);
    return;
  }

  const stripeClient = getConnectStripeClient();

  if (event.type === "product.deleted") {
    const product = event.data.object as Stripe.Product;
    await archiveOfferingForStripeProduct(connectAccountId, product.id);
    return;
  }

  if (event.type === "product.created" || event.type === "product.updated") {
    let product = event.data.object as Stripe.Product;
    // Ensure default_price is expanded for amount.
    if (typeof product.default_price === "string" || !product.default_price) {
      try {
        product = await stripeClient.products.retrieve(
          product.id,
          { expand: ["default_price"] },
          { stripeAccount: connectAccountId },
        );
      } catch (err) {
        console.warn("[stripe product webhook] retrieve failed:", err);
      }
    }
    await upsertOfferingFromStripeProduct({
      connectAccountId,
      product,
      source: "webhook",
    });
    return;
  }

  if (event.type === "price.created" || event.type === "price.updated") {
    const price = event.data.object as Stripe.Price;
    const productId = typeof price.product === "string" ? price.product : price.product?.id;
    if (!productId) return;

    try {
      const product = await stripeClient.products.retrieve(
        productId,
        { expand: ["default_price"] },
        { stripeAccount: connectAccountId },
      );
      // Only sync when this price is (or becomes) the default, or offering has no price yet.
      const defaultId =
        typeof product.default_price === "string"
          ? product.default_price
          : product.default_price?.id;
      const offering = await prisma.offering.findFirst({
        where: { stripeProductId: productId },
        select: { stripePriceId: true },
      });
      if (defaultId === price.id || !offering?.stripePriceId || offering.stripePriceId === price.id) {
        await upsertOfferingFromStripeProduct({
          connectAccountId,
          product,
          source: "webhook",
        });
      }
    } catch (err) {
      console.warn("[stripe product webhook] price sync failed:", err);
    }
  }
}

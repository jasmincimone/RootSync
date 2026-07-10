import { prisma } from "@/lib/prisma";
import {
  getConnectStripeClient,
  getDefaultCurrency,
  stripeConnectErrorMessage,
} from "@/lib/stripeConnectDemo";

export type SyncOfferingStripeProductResult =
  | {
      ok: true;
      skipped?: boolean;
      reason?: string;
      stripeProductId: string | null;
      stripePriceId: string | null;
    }
  | { ok: false; error: string };

/**
 * Creates or updates a Stripe Product (+ default Price) on the vendor's
 * connected account for this Offering. Stores `stripeProductId` / `stripePriceId`
 * on the Offering row (PostgreSQL remains source of truth for the listing).
 *
 * Skips quietly when the vendor has no Connect account or price is zero —
 * Discover can still use payment links / destination checkout.
 */
export async function syncOfferingStripeProduct(
  offeringId: string,
): Promise<SyncOfferingStripeProductResult> {
  try {
    return await syncOfferingStripeProductInner(offeringId);
  } catch (err) {
    // Never fail listing publish because of Stripe/Prisma sync issues.
    console.error("[offeringStripeProduct] unexpected sync error:", err);
    return { ok: false, error: stripeConnectErrorMessage(err) };
  }
}

async function syncOfferingStripeProductInner(
  offeringId: string,
): Promise<SyncOfferingStripeProductResult> {
  const offering = await prisma.offering.findUnique({
    where: { id: offeringId },
    select: {
      id: true,
      title: true,
      description: true,
      priceCents: true,
      imageUrl: true,
      stripeProductId: true,
      stripePriceId: true,
      vendorProfile: {
        select: {
          user: { select: { stripeConnectAccountId: true } },
        },
      },
    },
  });

  if (!offering) {
    return { ok: false, error: "Offering not found." };
  }

  const accountId = offering.vendorProfile.user.stripeConnectAccountId;
  if (!accountId) {
    return {
      ok: true,
      skipped: true,
      reason: "No Stripe Connect account linked.",
      stripeProductId: offering.stripeProductId,
      stripePriceId: offering.stripePriceId,
    };
  }

  if (offering.priceCents <= 0) {
    return {
      ok: true,
      skipped: true,
      reason: "Price must be greater than zero to create a Stripe product.",
      stripeProductId: offering.stripeProductId,
      stripePriceId: offering.stripePriceId,
    };
  }

  try {
    const stripeClient = getConnectStripeClient();
    const currency = getDefaultCurrency();
    const metadata = {
      rootsync_offering_id: offering.id,
    };

    if (offering.stripeProductId) {
      // Update existing product on the connected account.
      await stripeClient.products.update(
        offering.stripeProductId,
        {
          name: offering.title,
          description: offering.description.slice(0, 500) || undefined,
          images: offering.imageUrl ? [offering.imageUrl] : undefined,
          metadata,
          active: true,
        },
        { stripeAccount: accountId },
      );

      // Prices are immutable — create a new default price when amount changes.
      let priceId = offering.stripePriceId;
      let needsNewPrice = !priceId;
      if (priceId) {
        try {
          const existingPrice = await stripeClient.prices.retrieve(
            priceId,
            {},
            { stripeAccount: accountId },
          );
          if (existingPrice.unit_amount !== offering.priceCents || existingPrice.currency !== currency) {
            needsNewPrice = true;
          }
        } catch {
          needsNewPrice = true;
        }
      }

      if (needsNewPrice) {
        const price = await stripeClient.prices.create(
          {
            product: offering.stripeProductId,
            unit_amount: offering.priceCents,
            currency,
            metadata,
          },
          { stripeAccount: accountId },
        );
        priceId = price.id;
        await stripeClient.products.update(
          offering.stripeProductId,
          { default_price: priceId },
          { stripeAccount: accountId },
        );
      }

      await prisma.offering.update({
        where: { id: offering.id },
        data: {
          stripeProductId: offering.stripeProductId,
          stripePriceId: priceId,
        },
      });

      return {
        ok: true,
        stripeProductId: offering.stripeProductId,
        stripePriceId: priceId,
      };
    }

    // Create product + default price on the connected account (Stripe-Account header).
    const product = await stripeClient.products.create(
      {
        name: offering.title,
        description: offering.description.slice(0, 500) || undefined,
        images: offering.imageUrl ? [offering.imageUrl] : undefined,
        metadata,
        default_price_data: {
          unit_amount: offering.priceCents,
          currency,
        },
      },
      { stripeAccount: accountId },
    );

    const defaultPrice =
      typeof product.default_price === "string"
        ? product.default_price
        : product.default_price?.id ?? null;

    await prisma.offering.update({
      where: { id: offering.id },
      data: {
        stripeProductId: product.id,
        stripePriceId: defaultPrice,
      },
    });

    return {
      ok: true,
      stripeProductId: product.id,
      stripePriceId: defaultPrice,
    };
  } catch (err) {
    console.error("[offeringStripeProduct] sync failed:", err);
    return { ok: false, error: stripeConnectErrorMessage(err) };
  }
}

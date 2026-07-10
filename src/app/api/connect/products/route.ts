import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import {
  createOfferingWithListing,
  serializeVendorOffering,
  vendorOfferingInclude,
} from "@/lib/offeringListing";
import { coercePriceCents, getConnectStripeClient, getDefaultCurrency } from "@/lib/stripeConnectDemo";
import { hookOfferingPublished } from "@/lib/pulse/hooks";
import { prisma } from "@/lib/prisma";
import { LISTING_TYPE, OFFERING_STATUS, VENDOR_STATUS } from "@/lib/roles";

export const runtime = "nodejs";

/**
 * Creates a Product + default Price on the **connected account**, then creates a
 * matching RootSync Offering + Listing so Payment Hub and Vendor Listings stay in sync.
 *
 * Uses `{ stripeAccount: accountId }` for the Stripe-Account header.
 * On publish (ACTIVE), records LISTING_PUBLISHED Pulse for the RootSync dashboard.
 *
 * PLACEHOLDER: requires `STRIPE_SECRET_KEY` and a mapped `User.stripeConnectAccountId`.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const currency = getDefaultCurrency(typeof body?.currency === "string" ? body.currency : undefined);

    if (!name) return NextResponse.json({ error: "Product name is required." }, { status: 400 });

    let priceInCents: number;
    try {
      priceInCents = coercePriceCents(body?.priceInCents);
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Invalid price." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeConnectAccountId: true,
        vendorProfile: { select: { id: true, status: true } },
      },
    });
    const accountId = user?.stripeConnectAccountId;
    if (!accountId) {
      return NextResponse.json(
        { error: "No connected account mapping found. Create a connected account first." },
        { status: 400 },
      );
    }

    const vendorProfile = user.vendorProfile;
    if (!vendorProfile || vendorProfile.status !== VENDOR_STATUS.APPROVED) {
      return NextResponse.json(
        { error: "An approved vendor profile is required to create a listing from Payment Hub." },
        { status: 403 },
      );
    }

    const stripeClient = getConnectStripeClient();
    const product = await stripeClient.products.create(
      {
        name,
        description: description || undefined,
        default_price_data: {
          unit_amount: priceInCents,
          currency,
        },
      },
      {
        stripeAccount: accountId,
      },
    );

    const defaultPriceId =
      typeof product.default_price === "string"
        ? product.default_price
        : product.default_price?.id ?? null;

    // Create the Discover offering/listing and store Stripe ids on the Offering.
    const offering = await prisma.$transaction(async (tx) => {
      const created = await createOfferingWithListing(tx, {
        vendorProfileId: vendorProfile.id,
        listingType: LISTING_TYPE.PRODUCT,
        status: OFFERING_STATUS.ACTIVE,
        title: name,
        description: description || name,
        priceCents: priceInCents,
        details: { product: {} },
      });

      await tx.offering.update({
        where: { id: created.id },
        data: {
          stripeProductId: product.id,
          stripePriceId: defaultPriceId,
        },
      });

      // Attach RootSync offering id on the Stripe product for reconciliation.
      await stripeClient.products.update(
        product.id,
        { metadata: { rootsync_offering_id: created.id } },
        { stripeAccount: accountId },
      );

      return tx.offering.findUniqueOrThrow({
        where: { id: created.id },
        include: vendorOfferingInclude,
      });
    });

    if (offering.listing) {
      await hookOfferingPublished(null, {
        listingId: offering.listing.id,
        vendorUserId: userId,
        currentStatus: offering.status,
      });
    }

    return NextResponse.json(
      {
        product,
        listing: serializeVendorOffering(offering),
      },
      { status: 201 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create product.";
    console.error("[connect/products POST]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

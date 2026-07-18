import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import {
  assertPublishableOfferingDetails,
  parseOfferingDetailsFromBody,
} from "@/lib/offeringDetails";
import {
  createOfferingWithListing,
  isListingType,
  legacyListingStatusToOfferingStatus,
  resolveOfferingScheduleOnSave,
  serializeVendorOffering,
  vendorOfferingInclude,
} from "@/lib/offeringListing";
import { parseServiceBookingConfigFromBody } from "@/lib/serviceBookingConfig";
import { parseOfferingVariantsFromBody } from "@/lib/offeringVariants";
import { publishOfferingIfDue } from "@/lib/publishScheduledOfferings";
import { normalizePaymentUrl, normalizeProductUrl } from "@/lib/paymentUrl";
import { assertListingDescription } from "@/lib/listingLimits";
import { provisionEventMeetIfNeeded } from "@/lib/eventMeetProvision";
import { hookOfferingPublished } from "@/lib/pulse/hooks";
import { syncOfferingStripeProduct } from "@/lib/offeringStripeProduct";
import { prisma } from "@/lib/prisma";
import { LISTING_TYPE, OFFERING_STATUS } from "@/lib/roles";
import { requireApprovedVendorGate } from "@/lib/vendorListingAccess";
import { rateLimitResponse } from "@/lib/rateLimit";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const gate = await requireApprovedVendorGate(session.user.id);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  const offerings = await prisma.offering.findMany({
    where: { vendorProfileId: gate.vendorProfileId },
    include: vendorOfferingInclude,
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ listings: offerings.map(serializeVendorOffering) });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = rateLimitResponse(request, "upload", {
    userId: session.user.id,
    scope: "vendor-listing-write",
    message: "Too many listing saves. Try again shortly.",
  });
  if (limited) return limited;
  const gate = await requireApprovedVendorGate(session.user.id);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const {
    title,
    description,
    priceCents,
    category,
    imageUrl,
    status,
    paymentUrl,
    productUrl,
    listingType,
    vendorNotes,
    scheduledPublishAt,
  } = body;

  let descriptionNorm: string;
  try {
    if (typeof description !== "string") throw new Error("Description is required.");
    descriptionNorm = assertListingDescription(description);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid description" },
      { status: 400 },
    );
  }

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof priceCents !== "number" ||
    priceCents < 0
  ) {
    return NextResponse.json({ error: "Invalid listing data" }, { status: 400 });
  }

  let paymentUrlNorm: string | null;
  let productUrlNorm: string | null;
  try {
    paymentUrlNorm = normalizePaymentUrl(paymentUrl ?? null);
    productUrlNorm = normalizeProductUrl(productUrl ?? null);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid link";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const type =
    typeof listingType === "string" && isListingType(listingType)
      ? listingType
      : LISTING_TYPE.PRODUCT;
  const offeringStatus = legacyListingStatusToOfferingStatus(
    typeof status === "string" ? status : OFFERING_STATUS.DRAFT,
  );

  let scheduledAt: Date | null = null;
  if (scheduledPublishAt) {
    if (typeof scheduledPublishAt !== "string") {
      return NextResponse.json({ error: "Invalid scheduled publish date" }, { status: 400 });
    }
    const parsed = new Date(scheduledPublishAt);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json({ error: "Invalid scheduled publish date" }, { status: 400 });
    }
    scheduledAt = parsed;
  }

  let resolvedSchedule;
  try {
    resolvedSchedule = resolveOfferingScheduleOnSave({
      status: offeringStatus,
      scheduledPublishAt: scheduledAt,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid schedule" },
      { status: 400 },
    );
  }

  let details;
  try {
    details = parseOfferingDetailsFromBody(body, type);
    assertPublishableOfferingDetails({
      listingType: type,
      status: resolvedSchedule.status,
      details,
      priceCents: Math.round(priceCents),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid type-specific fields" },
      { status: 400 },
    );
  }

  let bookingConfig;
  try {
    bookingConfig = parseServiceBookingConfigFromBody(
      body,
      details.service?.defaultTimeZone ?? "America/New_York",
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid booking configuration" },
      { status: 400 },
    );
  }

  let variants;
  try {
    variants = parseOfferingVariantsFromBody(body, type);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid offering options" },
      { status: 400 },
    );
  }

  try {
    const offering = await prisma.$transaction(async (tx) => {
      const created = await createOfferingWithListing(tx, {
        vendorProfileId: gate.vendorProfileId,
        listingType: type,
        status: resolvedSchedule.status,
        title: title.trim(),
        description: descriptionNorm,
        priceCents: Math.round(priceCents),
        category: typeof category === "string" ? category.trim() || null : null,
        imageUrl: typeof imageUrl === "string" ? imageUrl.trim() || null : null,
        paymentUrl: paymentUrlNorm,
        productUrl: productUrlNorm,
        vendorNotes: typeof vendorNotes === "string" ? vendorNotes.trim() || null : null,
        scheduledPublishAt: resolvedSchedule.scheduledPublishAt,
        details,
        bookingConfig,
        variants,
      });
      await publishOfferingIfDue(tx, created.id);
      return tx.offering.findUniqueOrThrow({
        where: { id: created.id },
        include: vendorOfferingInclude,
      });
    });

    if (offering.listing) {
      await hookOfferingPublished(null, {
        listingId: offering.listing.id,
        vendorUserId: session.user.id,
        currentStatus: offering.status,
      });
    }

    // Sync Stripe Product on the connected account (never fail the listing save).
    let stripeSync: Awaited<ReturnType<typeof syncOfferingStripeProduct>>;
    try {
      stripeSync = await syncOfferingStripeProduct(offering.id);
    } catch (err) {
      console.error("[vendor/listings POST] stripe sync threw:", err);
      stripeSync = { ok: false, error: err instanceof Error ? err.message : "Stripe sync failed" };
    }

    if (type === LISTING_TYPE.EVENT) {
      await provisionEventMeetIfNeeded(offering.id);
    }

    let refreshed = offering;
    try {
      refreshed = await prisma.offering.findUniqueOrThrow({
        where: { id: offering.id },
        include: vendorOfferingInclude,
      });
    } catch (err) {
      console.warn("[vendor/listings POST] refresh after stripe sync failed:", err);
    }

    return NextResponse.json({
      listing: serializeVendorOffering(refreshed),
      stripeSync: stripeSync.ok
        ? {
            ok: true,
            skipped: stripeSync.skipped ?? false,
            reason: stripeSync.reason,
            stripeProductId: stripeSync.stripeProductId,
            stripePriceId: stripeSync.stripePriceId,
          }
        : { ok: false, error: stripeSync.error },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create offering";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

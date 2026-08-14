import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

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
import { parseOfferingOptionGroupsFromBody } from "@/lib/offeringOptions";
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
import { validateListingPublicSlug } from "@/lib/listingPublicSlug";

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
    where: {
      vendorProfileId: gate.vendorProfileId,
      listing: { isNot: null },
    },
    include: vendorOfferingInclude,
  });
  const listings = offerings
    .map(serializeVendorOffering)
    .sort((a, b) => {
      const byOrder = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (byOrder !== 0) return byOrder;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  return NextResponse.json({ listings });
}

/**
 * Reorder listings. Body: { listingIds: string[] } in desired display order.
 * Lives here (not /listings/reorder) so it can’t collide with /listings/[id].
 */
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = rateLimitResponse(request, "upload", {
    userId: session.user.id,
    scope: "vendor-listing-write",
    message: "Too many listing changes. Try again shortly.",
  });
  if (limited) return limited;

  const gate = await requireApprovedVendorGate(session.user.id);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { listingIds?: unknown };
  const listingIds = Array.isArray(body.listingIds)
    ? body.listingIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];

  if (listingIds.length === 0) {
    return NextResponse.json({ error: "listingIds must be a non-empty array." }, { status: 400 });
  }

  const uniqueIds = [...new Set(listingIds)];
  if (uniqueIds.length !== listingIds.length) {
    return NextResponse.json({ error: "listingIds must not contain duplicates." }, { status: 400 });
  }

  // Same set GET exposes (offerings that still have a Listing row).
  const owned = await prisma.offering.findMany({
    where: {
      vendorProfileId: gate.vendorProfileId,
      listing: { isNot: null },
    },
    select: { listing: { select: { id: true } } },
  });
  const ownedIds = new Set(
    owned.map((row) => row.listing?.id).filter((id): id is string => Boolean(id)),
  );
  if (
    uniqueIds.length !== ownedIds.size ||
    uniqueIds.some((id) => !ownedIds.has(id))
  ) {
    return NextResponse.json(
      {
        error:
          "Listing order is out of date. Refresh the page, then try reordering again.",
      },
      { status: 409 },
    );
  }

  try {
    // Raw SQL: works even if a long-lived next-dev PrismaClient was generated before
    // Listing.sortOrder existed (field-level client cache drift).
    for (let index = 0; index < uniqueIds.length; index++) {
      await prisma.$executeRaw`
        UPDATE "Listing"
        SET "sortOrder" = ${index}, "updatedAt" = NOW()
        WHERE "id" = ${uniqueIds[index]!}
          AND "vendorProfileId" = ${gate.vendorProfileId}
      `;
    }
  } catch (e) {
    console.error("[vendor listings reorder]", e);
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "Could not save listing order.",
        hint: detail.slice(0, 400),
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
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
      { error: e instanceof Error ? e.message : "Invalid offering deals" },
      { status: 400 },
    );
  }

  let optionGroups;
  try {
    optionGroups = parseOfferingOptionGroupsFromBody(body);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid offering options" },
      { status: 400 },
    );
  }

  let publicSlug: string | null = null;
  if ("publicSlug" in body) {
    const parsed =
      typeof body.publicSlug === "string"
        ? validateListingPublicSlug(body.publicSlug)
        : body.publicSlug === null
          ? ({ ok: true as const, slug: null })
          : ({ ok: false as const, error: "Invalid listing URL." });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    publicSlug = parsed.slug;
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
        publicSlug,
        details,
        bookingConfig,
        variants,
        optionGroups,
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
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "That listing URL is already taken. Choose another." },
        { status: 409 },
      );
    }
    const msg = e instanceof Error ? e.message : "Failed to create offering";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

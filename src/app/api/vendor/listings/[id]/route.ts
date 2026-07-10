import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { parseOfferingDetailsFromBody } from "@/lib/offeringDetails";
import {
  isListingType,
  isOfferingStatus,
  legacyListingStatusToOfferingStatus,
  resolveOfferingScheduleOnSave,
  serializeVendorOffering,
  updateOfferingAndSyncListing,
  vendorOfferingInclude,
} from "@/lib/offeringListing";
import { parseServiceBookingConfigFromBody } from "@/lib/serviceBookingConfig";
import { parseOfferingVariantsFromBody } from "@/lib/offeringVariants";
import { publishOfferingIfDue } from "@/lib/publishScheduledOfferings";
import { normalizePaymentUrlPatch, normalizeProductUrlPatch } from "@/lib/paymentUrl";
import { hookOfferingPublished } from "@/lib/pulse/hooks";
import { syncOfferingStripeProduct } from "@/lib/offeringStripeProduct";
import { prisma } from "@/lib/prisma";
import { OFFERING_STATUS, type ListingType } from "@/lib/roles";
import { canManageVendorListings } from "@/lib/vendorListingAccess";

async function getVendorOfferingByListingId(userId: string, listingId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { vendorProfile: true },
  });
  if (!user?.vendorProfile || !canManageVendorListings(user.role, user.vendorProfile.status)) {
    return null;
  }
  const listing = await prisma.listing.findFirst({
    where: { id: listingId, vendorProfileId: user.vendorProfile.id },
    include: {
      offering: {
        include: vendorOfferingInclude,
      },
    },
  });
  if (!listing) return null;
  return { offering: listing.offering, listing };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const row = await getVendorOfferingByListingId(session.user.id, id);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({
    listing: serializeVendorOffering(row.offering),
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getVendorOfferingByListingId(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;
  const { title, description, priceCents, category, imageUrl, status, listingType, vendorNotes } =
    body;

  const previousListingType = existing.offering.listingType as ListingType;
  const nextListingType =
    typeof listingType === "string" && isListingType(listingType)
      ? listingType
      : previousListingType;

  const data: Prisma.OfferingUpdateInput = {};
  if (typeof title === "string") data.title = title.trim();
  if (typeof description === "string") data.description = description.trim();
  if (typeof priceCents === "number" && priceCents >= 0 && !Number.isNaN(priceCents)) {
    data.priceCents = Math.round(priceCents);
  }
  if ("category" in body) {
    if (category === null || category === "") data.category = null;
    else if (typeof category === "string") data.category = category.trim() || null;
  }
  if ("imageUrl" in body) {
    if (imageUrl === null || imageUrl === "") data.imageUrl = null;
    else if (typeof imageUrl === "string") data.imageUrl = imageUrl.trim() || null;
  }
  if (typeof listingType === "string" && isListingType(listingType)) {
    data.listingType = listingType;
  }
  if ("vendorNotes" in body) {
    if (vendorNotes === null || vendorNotes === "") data.vendorNotes = null;
    else if (typeof vendorNotes === "string") data.vendorNotes = vendorNotes.trim() || null;
  }

  let scheduledAt: Date | null | undefined;
  if ("scheduledPublishAt" in body) {
    const raw = body.scheduledPublishAt;
    if (raw === null || raw === "") scheduledAt = null;
    else if (typeof raw === "string") {
      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "Invalid scheduled publish date" }, { status: 400 });
      }
      scheduledAt = parsed;
    }
  }

  const nextStatus =
    typeof status === "string"
      ? legacyListingStatusToOfferingStatus(status)
      : (existing.offering.status as typeof OFFERING_STATUS[keyof typeof OFFERING_STATUS]);

  if (typeof status === "string" && isOfferingStatus(nextStatus)) {
    try {
      const resolved = resolveOfferingScheduleOnSave({
        status: nextStatus,
        scheduledPublishAt:
          scheduledAt !== undefined ? scheduledAt : existing.offering.scheduledPublishAt,
      });
      data.status = resolved.status;
      data.scheduledPublishAt = resolved.scheduledPublishAt;
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid schedule" },
        { status: 400 },
      );
    }
  } else if (scheduledAt !== undefined) {
    try {
      const resolved = resolveOfferingScheduleOnSave({
        status: existing.offering.status as typeof OFFERING_STATUS[keyof typeof OFFERING_STATUS],
        scheduledPublishAt: scheduledAt,
      });
      data.status = resolved.status;
      data.scheduledPublishAt = resolved.scheduledPublishAt;
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid schedule" },
        { status: 400 },
      );
    }
  }

  try {
    const paymentPatch = normalizePaymentUrlPatch(body);
    if (paymentPatch !== undefined) {
      data.paymentUrl = paymentPatch;
    }
    const productPatch = normalizeProductUrlPatch(body);
    if (productPatch !== undefined) {
      data.productUrl = productPatch;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid link";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  let details;
  try {
    details = parseOfferingDetailsFromBody(body, nextListingType);
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
      details.service?.defaultTimeZone ??
        existing.offering.serviceDetails?.defaultTimeZone ??
        "America/New_York",
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid booking configuration" },
      { status: 400 },
    );
  }

  let variants;
  try {
    variants = parseOfferingVariantsFromBody(body, nextListingType);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid offering options" },
      { status: 400 },
    );
  }

  const hasDetails =
    body.details !== undefined ||
    body.product !== undefined ||
    body.service !== undefined ||
    body.resource !== undefined ||
    body.event !== undefined;

  const hasBookingConfig =
    body.booking !== undefined ||
    body.availabilityRules !== undefined ||
    body.intakeQuestions !== undefined;

  const hasVariants = "variants" in body;

  if (
    Object.keys(data).length === 0 &&
    !hasDetails &&
    !hasBookingConfig &&
    !hasVariants &&
    previousListingType === nextListingType
  ) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const previousStatus = existing.offering.status;

  try {
    const { offering } = await prisma.$transaction(async (tx) => {
      const result = await updateOfferingAndSyncListing(tx, existing.offering.id, data, {
        previousListingType,
        details: hasDetails ? details : undefined,
        bookingConfig: hasBookingConfig ? bookingConfig : undefined,
        variants: hasVariants ? variants : undefined,
      });
      await publishOfferingIfDue(tx, existing.offering.id);
      const refreshed = await tx.offering.findUniqueOrThrow({
        where: { id: existing.offering.id },
        include: vendorOfferingInclude,
      });
      return { offering: refreshed, listing: result.listing };
    });

    if (offering.listing) {
      await hookOfferingPublished(previousStatus, {
        listingId: offering.listing.id,
        vendorUserId: session.user.id,
        currentStatus: offering.status,
      });
    }

    let stripeSync: Awaited<ReturnType<typeof syncOfferingStripeProduct>>;
    try {
      stripeSync = await syncOfferingStripeProduct(offering.id);
    } catch (err) {
      console.error("[vendor/listings PATCH] stripe sync threw:", err);
      stripeSync = { ok: false, error: err instanceof Error ? err.message : "Stripe sync failed" };
    }

    let refreshed = offering;
    try {
      refreshed = await prisma.offering.findUniqueOrThrow({
        where: { id: offering.id },
        include: vendorOfferingInclude,
      });
    } catch (err) {
      console.warn("[vendor/listings PATCH] refresh after stripe sync failed:", err);
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
    const msg = e instanceof Error ? e.message : "Failed to update offering";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const existing = await getVendorOfferingByListingId(session.user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.offering.delete({ where: { id: existing.offering.id } });
  return NextResponse.json({ ok: true });
}

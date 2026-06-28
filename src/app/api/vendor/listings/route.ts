import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { parseOfferingDetailsFromBody } from "@/lib/offeringDetails";
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
import { prisma } from "@/lib/prisma";
import { LISTING_TYPE, OFFERING_STATUS } from "@/lib/roles";
import { requireApprovedVendorGate } from "@/lib/vendorListingAccess";

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

  if (
    typeof title !== "string" ||
    !title.trim() ||
    typeof description !== "string" ||
    !description.trim() ||
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
        description: description.trim(),
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

    return NextResponse.json({ listing: serializeVendorOffering(offering) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to create offering";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

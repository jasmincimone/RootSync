import { NextRequest, NextResponse } from "next/server";

import { loadBookableServiceListing, requireBookingMemberSession } from "@/lib/bookingAccess";
import { getServiceDurationMinutes, generateAvailableSlots } from "@/lib/bookingSlots";
import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id: listingId } = await context.params;
    const variantId = request.nextUrl.searchParams.get("variant");
    const listing = await loadBookableServiceListing(listingId, variantId);
    if (!listing) {
      return NextResponse.json({ error: "Service listing not found or not bookable." }, { status: 404 });
    }

    const days = Number.parseInt(request.nextUrl.searchParams.get("days") || "14", 10);
    const safeDays = Number.isFinite(days) ? Math.min(Math.max(days, 1), 60) : 14;

    const from = new Date();
    const to = new Date();
    to.setUTCDate(to.getUTCDate() + safeDays);

    const booked = await prisma.booking.findMany({
      where: {
        listingId,
        status: { in: [BOOKING_STATUS.PENDING_PAYMENT, BOOKING_STATUS.CONFIRMED] },
        scheduledStartAt: { lt: to },
        scheduledEndAt: { gt: from },
      },
      select: { scheduledStartAt: true, scheduledEndAt: true },
    });

    const bookedRanges = booked.map((b) => ({
      startAt: b.scheduledStartAt,
      endAt: b.scheduledEndAt,
    }));

    const slots = generateAvailableSlots({
      listing,
      from,
      to,
      bookedRanges,
      variantId: listing.selectedVariantId,
    });

    return NextResponse.json({
      listingId,
      durationMinutes: getServiceDurationMinutes(listing, listing.selectedVariantId),
      timeZone: listing.offering.serviceDetails?.defaultTimeZone ?? "America/New_York",
      slots,
    });
  } catch (e) {
    console.error("[availability]", e);
    return NextResponse.json({ error: "Could not load availability." }, { status: 500 });
  }
}

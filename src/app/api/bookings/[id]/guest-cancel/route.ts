import { NextRequest, NextResponse } from "next/server";

import { guestBookingCancelTokenValid } from "@/lib/auth-tokens";
import { cancelServiceBooking } from "@/lib/confirmBooking";
import { prisma } from "@/lib/prisma";
import { rateLimitResponse } from "@/lib/rateLimit";
import { BOOKING_STATUS } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const limited = rateLimitResponse(request, "checkout", {
    scope: "guest-booking-cancel",
    message: "Too many attempts. Try again shortly.",
  });
  if (limited) return limited;

  const { id: bookingId } = await context.params;
  const body = await request.json().catch(() => ({}));
  if (body.action !== "cancel") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { id: true, memberUserId: true, memberEmail: true },
  });

  // Guest links only work for guest bookings; members cancel from their account.
  if (!booking || booking.memberUserId) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  if (!token || !guestBookingCancelTokenValid(booking.id, booking.memberEmail, token)) {
    return NextResponse.json({ error: "This cancellation link is not valid." }, { status: 403 });
  }

  try {
    const result = await cancelServiceBooking({
      bookingId,
      reason: typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : "Cancelled by guest",
      cancelledBy: "member",
      cancelCalendar: true,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      status: BOOKING_STATUS.CANCELLED,
      refunded: result.refunded,
      refundAmountCents: result.refundAmountCents,
    });
  } catch (e) {
    console.error("[bookings/guest-cancel]", bookingId, e);
    return NextResponse.json({ error: "Could not cancel booking." }, { status: 500 });
  }
}

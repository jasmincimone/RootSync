import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { cancelServiceBooking } from "@/lib/confirmBooking";
import { memberOwnsBooking } from "@/lib/bookingAccess";
import { BOOKING_STATUS } from "@/lib/roles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const { id: bookingId } = await context.params;
  const owns = await memberOwnsBooking(bookingId, session.user.id);
  if (!owns) {
    return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.action !== "cancel") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason : undefined;

  try {
    const result = await cancelServiceBooking({
      bookingId,
      reason: reason || "Cancelled by member",
      cancelledBy: "member",
      cancelCalendar: true,
    });

    if (!result.ok) {
      const status = result.error === "Booking not found." ? 404 : 400;
      return NextResponse.json({ error: result.error }, { status });
    }

    return NextResponse.json({
      ok: true,
      status: BOOKING_STATUS.CANCELLED,
      refunded: result.refunded,
      refundAmountCents: result.refundAmountCents,
    });
  } catch (e) {
    console.error("[account/bookings/cancel]", bookingId, e);
    const message =
      e instanceof Error && e.message.includes("stripeRefundId")
        ? "Server needs a restart after the latest database update. Run npx prisma generate and restart npm run dev:3001."
        : "Could not cancel booking.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

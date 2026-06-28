import { NextRequest, NextResponse } from "next/server";

import { confirmPaidServiceBookingFromStripeSession } from "@/lib/confirmBooking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const sessionId =
      typeof body.sessionId === "string"
        ? body.sessionId
        : request.nextUrl.searchParams.get("session_id");

    if (!sessionId?.trim()) {
      return NextResponse.json({ error: "Missing session_id." }, { status: 400 });
    }

    const result = await confirmPaidServiceBookingFromStripeSession(sessionId.trim());
    return NextResponse.json(result);
  } catch (e) {
    console.error("[bookings/confirm-from-session]", e);
    return NextResponse.json({ error: "Could not confirm booking." }, { status: 500 });
  }
}

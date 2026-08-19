import { NextResponse } from "next/server";

import { requireBookingMemberSession } from "@/lib/bookingAccess";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireBookingMemberSession();
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  // Match on email too, so bookings made as a guest show up once that person
  // creates an account — the same way guest orders are claimed.
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [{ memberUserId: gate.userId }, { memberEmail: gate.email }],
    },
    orderBy: { scheduledStartAt: "desc" },
    include: {
      listing: { select: { id: true, title: true, imageUrl: true } },
      vendorProfile: { select: { id: true, displayName: true } },
      order: { select: { id: true } },
    },
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      orderId: b.orderId,
      status: b.status,
      serviceKind: b.serviceKind,
      fulfillmentMethod: b.fulfillmentMethod,
      scheduledStartAt: b.scheduledStartAt.toISOString(),
      scheduledEndAt: b.scheduledEndAt.toISOString(),
      timeZone: b.timeZone,
      priceCents: b.priceCents,
      meetLink: b.meetLink,
      calendarHtmlLink: b.calendarHtmlLink,
      listing: b.listing,
      vendor: b.vendorProfile,
    })),
  });
}

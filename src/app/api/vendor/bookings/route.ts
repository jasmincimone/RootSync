import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { requireApprovedVendorForBookings } from "@/lib/bookingAccess";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const gate = await requireApprovedVendorForBookings(session.user.id);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const bookings = await prisma.booking.findMany({
    where: { vendorProfileId: gate.vendorProfileId },
    orderBy: { scheduledStartAt: "desc" },
    include: {
      listing: { select: { id: true, title: true } },
      member: { select: { id: true, name: true, email: true } },
      order: { select: { id: true } },
    },
  });

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      id: b.id,
      orderId: b.orderId,
      status: b.status,
      scheduledStartAt: b.scheduledStartAt.toISOString(),
      scheduledEndAt: b.scheduledEndAt.toISOString(),
      timeZone: b.timeZone,
      priceCents: b.priceCents,
      meetLink: b.meetLink,
      calendarHtmlLink: b.calendarHtmlLink,
      fulfillmentMethod: b.fulfillmentMethod,
      memberEmail: b.memberEmail,
      memberName: b.memberName,
      vendorNotes: b.vendorNotes,
      intakeNotes: b.intakeNotes,
      listing: b.listing,
      member: b.member,
    })),
  });
}

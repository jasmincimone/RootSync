import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { stripeSessionId: sessionId },
    include: {
      items: true,
      booking: {
        select: {
          id: true,
          status: true,
          scheduledStartAt: true,
          scheduledEndAt: true,
          timeZone: true,
          meetLink: true,
          calendarHtmlLink: true,
          listing: { select: { title: true } },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: order.id,
    email: order.email,
    status: order.status,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    totalCents: order.totalCents,
    shippingName: order.shippingName,
    shippingLine1: order.shippingLine1,
    shippingLine2: order.shippingLine2,
    shippingCity: order.shippingCity,
    shippingState: order.shippingState,
    shippingPostal: order.shippingPostal,
    shippingCountry: order.shippingCountry,
    trackingCarrier: order.trackingCarrier,
    trackingNumber: order.trackingNumber,
    shippedAt: order.shippedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      priceCents: i.priceCents,
      type: i.type,
      format: i.format,
    })),
    booking: order.booking
      ? {
          id: order.booking.id,
          status: order.booking.status,
          scheduledStartAt: order.booking.scheduledStartAt.toISOString(),
          scheduledEndAt: order.booking.scheduledEndAt.toISOString(),
          timeZone: order.booking.timeZone,
          meetLink: order.booking.meetLink,
          calendarHtmlLink: order.booking.calendarHtmlLink,
          serviceTitle: order.booking.listing.title,
        }
      : null,
  });
}

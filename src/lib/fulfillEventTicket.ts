import { sendEventTicketConfirmationEmail } from "@/lib/email";
import { provisionEventMeetIfNeeded } from "@/lib/eventMeetProvision";
import { prisma } from "@/lib/prisma";
import {
  EVENT_ATTENDANCE_MODE,
  ORDER_ITEM_TYPE,
  type EventAttendanceMode,
} from "@/lib/roles";

const ATTENDANCE_LABELS: Record<EventAttendanceMode, string> = {
  [EVENT_ATTENDANCE_MODE.IN_PERSON]: "In person",
  [EVENT_ATTENDANCE_MODE.VIRTUAL_MEET]: "Digital — Google Meet",
  [EVENT_ATTENDANCE_MODE.VIRTUAL_EXTERNAL]: "Digital — external event space",
};

export type EventJoinInfo = {
  eventTitle: string;
  ticketLabel: string;
  quantity: number;
  startsAt: string | null;
  endsAt: string | null;
  attendanceMode: string;
  attendanceLabel: string;
  venue: string | null;
  location: string | null;
  meetUrl: string | null;
  externalJoinUrl: string | null;
};

/**
 * After a paid marketplace order with EVENT line items: ensure Meet exists when needed,
 * email join details to the buyer (and vendor), once per order.
 */
export async function fulfillPaidEventTicketOrder(
  orderId: string,
): Promise<{ sent: boolean; eventJoin: EventJoinInfo | null }> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { name: true } },
      items: {
        where: { type: ORDER_ITEM_TYPE.EVENT },
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              offeringId: true,
              offering: {
                select: {
                  eventDetails: true,
                },
              },
              vendorProfile: {
                select: {
                  displayName: true,
                  user: { select: { email: true, name: true } },
                },
              },
            },
          },
          variant: { select: { title: true } },
        },
      },
    },
  });

  if (!order || order.status !== "paid") {
    return { sent: false, eventJoin: null };
  }

  const eventItem = order.items[0];
  if (!eventItem?.listing) {
    return { sent: false, eventJoin: null };
  }

  const offeringId = eventItem.listing.offeringId;
  let details = eventItem.listing.offering.eventDetails;

  if (details?.attendanceMode === EVENT_ATTENDANCE_MODE.VIRTUAL_MEET) {
    await provisionEventMeetIfNeeded(offeringId);
    details = await prisma.eventDetails.findUnique({ where: { offeringId } });
  }

  const attendanceMode =
    (details?.attendanceMode as EventAttendanceMode | undefined) ??
    EVENT_ATTENDANCE_MODE.IN_PERSON;
  const attendanceLabel = ATTENDANCE_LABELS[attendanceMode] ?? attendanceMode;

  const meetUrl =
    attendanceMode === EVENT_ATTENDANCE_MODE.VIRTUAL_MEET
      ? details?.meetUrl?.trim() || null
      : null;
  const externalJoinUrl =
    attendanceMode === EVENT_ATTENDANCE_MODE.VIRTUAL_EXTERNAL
      ? details?.externalJoinUrl?.trim() || null
      : null;

  const eventJoin: EventJoinInfo = {
    eventTitle: eventItem.listing.title,
    ticketLabel: eventItem.variant?.title
      ? `${eventItem.listing.title} — ${eventItem.variant.title}`
      : eventItem.name,
    quantity: eventItem.quantity,
    startsAt: details?.startsAt?.toISOString() ?? null,
    endsAt: details?.endsAt?.toISOString() ?? null,
    attendanceMode,
    attendanceLabel,
    venue: details?.venue?.trim() || null,
    location: details?.location?.trim() || null,
    meetUrl,
    externalJoinUrl,
  };

  if (order.buyerConfirmationEmailedAt) {
    return { sent: false, eventJoin };
  }

  const claimed = await prisma.order.updateMany({
    where: { id: orderId, buyerConfirmationEmailedAt: null, status: "paid" },
    data: { buyerConfirmationEmailedAt: new Date() },
  });
  if (claimed.count === 0) {
    return { sent: false, eventJoin };
  }

  const emailResult = await sendEventTicketConfirmationEmail({
    memberEmail: order.email,
    vendorEmail: eventItem.listing.vendorProfile.user.email,
    eventTitle: eventItem.listing.title,
    ticketLabel: eventItem.variant?.title ?? eventItem.name,
    quantity: eventItem.quantity,
    vendorName: eventItem.listing.vendorProfile.displayName,
    memberName: order.user?.name ?? null,
    startsAt: details?.startsAt ?? null,
    endsAt: details?.endsAt ?? null,
    attendanceLabel,
    venue: eventJoin.venue,
    location: eventJoin.location,
    meetUrl,
    externalJoinUrl,
    orderId: order.id,
    totalCents: order.totalCents,
  });

  if (!emailResult.ok) {
    // Allow retry on next webhook / confirmation page load
    await prisma.order.update({
      where: { id: orderId },
      data: { buyerConfirmationEmailedAt: null },
    });
    console.warn("[eventTicket] confirmation email failed:", emailResult.error);
    return { sent: false, eventJoin };
  }

  return { sent: true, eventJoin };
}

/** Load join info for confirmation UI without sending email. */
export async function getEventJoinInfoForOrder(
  orderId: string,
): Promise<EventJoinInfo | null> {
  const result = await fulfillPaidEventTicketOrder(orderId);
  return result.eventJoin;
}

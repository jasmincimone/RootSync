import { PULSE_EVENT_TYPES } from "@/lib/pulse/eventTypes";
import { recordPulseEventOnce } from "@/lib/pulse/recordEvent";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, OFFERING_STATUS } from "@/lib/roles";

function logPulseHookFailure(label: string, error: unknown) {
  console.warn(`[pulse] ${label}:`, error);
}

function isActiveOfferingStatus(status: string | null | undefined): boolean {
  return status === OFFERING_STATUS.ACTIVE || status === LISTING_STATUS.PUBLISHED;
}

export type OfferingPublishSnapshot = {
  listingId: string;
  vendorUserId: string;
  currentStatus: string;
};

/** Award LISTING_PUBLISHED once when an offering first becomes public. */
export async function hookOfferingPublished(
  previousStatus: string | null | undefined,
  snapshot: OfferingPublishSnapshot,
): Promise<void> {
  try {
    if (isActiveOfferingStatus(previousStatus)) return;
    if (!isActiveOfferingStatus(snapshot.currentStatus)) return;

    await recordPulseEventOnce({
      userId: snapshot.vendorUserId,
      eventType: PULSE_EVENT_TYPES.LISTING_PUBLISHED,
      relatedEntityType: "listing",
      relatedEntityId: snapshot.listingId,
    });
  } catch (e) {
    logPulseHookFailure("LISTING_PUBLISHED", e);
  }
}

/** Fallback when only the offering id is known (e.g. scheduled publish cron). */
export async function hookOfferingPublishedIfActive(
  offeringId: string,
  previousStatus?: string | null,
): Promise<void> {
  try {
    if (isActiveOfferingStatus(previousStatus)) return;

    const row = await prisma.offering.findUnique({
      where: { id: offeringId },
      select: {
        status: true,
        listing: { select: { id: true } },
        vendorProfile: { select: { userId: true } },
      },
    });
    if (!row?.listing) return;

    await hookOfferingPublished(previousStatus, {
      listingId: row.listing.id,
      vendorUserId: row.vendorProfile.userId,
      currentStatus: row.status,
    });
  } catch (e) {
    logPulseHookFailure("LISTING_PUBLISHED", e);
  }
}

/** Award PROFILE_COMPLETED once when the member sets a display name. */
export async function hookProfileCompleted(userId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (!user?.name?.trim()) return;

    await recordPulseEventOnce({
      userId,
      eventType: PULSE_EVENT_TYPES.PROFILE_COMPLETED,
      relatedEntityType: "user",
      relatedEntityId: userId,
    });
  } catch (e) {
    logPulseHookFailure("PROFILE_COMPLETED", e);
  }
}

async function resolveOrderMemberUserId(order: {
  userId: string | null;
  email: string;
}): Promise<string | null> {
  if (order.userId) return order.userId;
  const user = await prisma.user.findFirst({
    where: { email: order.email },
    select: { id: true },
  });
  return user?.id ?? null;
}

/** Award ORDER_VERIFIED once when an order is paid (marketplace or booking checkout). */
export async function hookOrderVerified(orderId: string): Promise<void> {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, email: true, status: true },
    });
    if (!order || order.status !== "paid") return;

    const userId = await resolveOrderMemberUserId(order);
    if (!userId) return;

    await recordPulseEventOnce({
      userId,
      eventType: PULSE_EVENT_TYPES.ORDER_VERIFIED,
      relatedEntityType: "order",
      relatedEntityId: orderId,
    });
  } catch (e) {
    logPulseHookFailure("ORDER_VERIFIED", e);
  }
}

/** Award BOOKING_COMPLETED to member and vendor when a service booking is marked complete. */
export async function hookBookingCompleted(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        memberUserId: true,
        vendorProfile: { select: { userId: true } },
      },
    });
    if (!booking) return;

    await Promise.all([
      recordPulseEventOnce({
        userId: booking.memberUserId,
        eventType: PULSE_EVENT_TYPES.BOOKING_COMPLETED,
        relatedEntityType: "booking",
        relatedEntityId: bookingId,
        metadata: { role: "member" },
      }),
      recordPulseEventOnce({
        userId: booking.vendorProfile.userId,
        eventType: PULSE_EVENT_TYPES.BOOKING_COMPLETED,
        relatedEntityType: "booking",
        relatedEntityId: bookingId,
        metadata: { role: "vendor" },
      }),
    ]);
  } catch (e) {
    logPulseHookFailure("BOOKING_COMPLETED", e);
  }
}

/** Award MESSAGE_SENT once per member per conversation (first message only). */
export async function hookMessageSent(userId: string, threadId: string, messageId: string): Promise<void> {
  try {
    await recordPulseEventOnce({
      userId,
      eventType: PULSE_EVENT_TYPES.MESSAGE_SENT,
      relatedEntityType: "direct_thread",
      relatedEntityId: threadId,
      metadata: { messageId },
    });
  } catch (e) {
    logPulseHookFailure("MESSAGE_SENT", e);
  }
}

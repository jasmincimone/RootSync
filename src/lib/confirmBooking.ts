import { prisma } from "@/lib/prisma";
import { discoverBookPath } from "@/config/discoverPaths";
import { sendBookingConfirmationEmail, sendBookingCancellationEmail } from "@/lib/email";
import { refundBookingPayment } from "@/lib/bookingRefund";
import { selfCancellationRefundable } from "@/lib/bookingPolicy";
import { guestBookingManageUrl } from "@/lib/guestBookingLink";
import { hookOrderVerified } from "@/lib/pulse/hooks";
import { BOOKING_STATUS, FULFILLMENT_METHOD } from "@/lib/roles";
import { appBaseUrl, getConnectStripeClient } from "@/lib/stripeConnectDemo";
import { CALENDAR_PROVIDER } from "@/services/calendar/calendar.constants";
import { getCalendarService } from "@/services/calendar/calendar.service";

/**
 * Idempotent: marks order paid (if needed), creates calendar event + Meet link, sends confirmation emails.
 * Safe to call from Stripe webhooks and from checkout confirmation when webhooks are delayed (local dev).
 */
export async function confirmPaidServiceBooking(
  bookingId: string,
  options?: { siblingBookingIds?: string[] },
): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { title: true } },
      vendorProfile: { select: { displayName: true } },
      intakeAnswers: true,
    },
  });

  if (!booking) {
    console.warn("[booking] confirm skipped — booking not found:", bookingId);
    return;
  }

  if (booking.status === BOOKING_STATUS.CONFIRMED && booking.calendarEventId) {
    return;
  }

  if (booking.status === BOOKING_STATUS.CANCELLED) {
    console.warn("[booking] confirm skipped — booking cancelled:", bookingId);
    return;
  }

  const excludeIds = new Set([booking.id, ...(options?.siblingBookingIds ?? [])]);
  const slotTaken = await prisma.booking.findFirst({
    where: {
      id: { notIn: [...excludeIds] },
      listingId: booking.listingId,
      status: BOOKING_STATUS.CONFIRMED,
      scheduledStartAt: { lt: booking.scheduledEndAt },
      scheduledEndAt: { gt: booking.scheduledStartAt },
    },
    select: { id: true },
  });

  if (slotTaken) {
    await releaseBookingToSlotWinner(bookingId);
    return;
  }

  const includeMeetLink =
    booking.fulfillmentMethod === FULFILLMENT_METHOD.VIRTUAL ||
    booking.fulfillmentMethod === FULFILLMENT_METHOD.HYBRID;

  let calendarEventId = booking.calendarEventId;
  let meetLink = booking.meetLink;
  let calendarHtmlLink = booking.calendarHtmlLink;

  if (!calendarEventId) {
    try {
      const calendar = getCalendarService();
      const appointment = await calendar.createAppointment({
        title: `${booking.listing.title} · ${booking.vendorProfile.displayName}`,
        description: [
          `RootSync service booking (${booking.id})`,
          booking.memberName ? `Member: ${booking.memberName}` : null,
          `Member email: ${booking.memberEmail}`,
          `Vendor email: ${booking.vendorEmail}`,
          booking.intakeNotes ? `Notes: ${booking.intakeNotes}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
        startAt: booking.scheduledStartAt,
        endAt: booking.scheduledEndAt,
        timeZone: booking.timeZone,
        includeMeetLink,
        attendees: [
          { email: booking.memberEmail, displayName: booking.memberName ?? undefined },
          { email: booking.vendorEmail, displayName: booking.vendorProfile.displayName },
        ],
      });

      calendarEventId = appointment.eventId;
      meetLink = appointment.meetLink ?? null;
      calendarHtmlLink = appointment.htmlLink ?? null;
    } catch (err) {
      console.error("[booking] calendar sync failed for", bookingId, err);
    }
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: BOOKING_STATUS.CONFIRMED,
      calendarEventId,
      calendarProvider: calendarEventId ? CALENDAR_PROVIDER.GOOGLE : booking.calendarProvider,
      meetLink,
      calendarHtmlLink,
    },
  });

  const emailResult = await sendBookingConfirmationEmail({
    memberEmail: booking.memberEmail,
    vendorEmail: booking.vendorEmail,
    serviceTitle: booking.listing.title,
    vendorName: booking.vendorProfile.displayName,
    memberName: booking.memberName,
    scheduledStartAt: booking.scheduledStartAt,
    scheduledEndAt: booking.scheduledEndAt,
    timeZone: booking.timeZone,
    meetLink,
    calendarHtmlLink,
    bookingId: booking.id,
    manageBookingUrl: booking.memberUserId
      ? undefined
      : guestBookingManageUrl(booking.id, booking.memberEmail),
  });

  if (!emailResult.ok) {
    console.warn("[booking] confirmation email failed:", bookingId, emailResult.error);
  }
}

/**
 * Two buyers paid for the same slot. The first to confirm keeps it; this refunds the
 * runner-up, cancels their booking, and points them back at the calendar.
 */
async function releaseBookingToSlotWinner(bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      listing: { select: { title: true, publicSlug: true, id: true } },
      vendorProfile: { select: { displayName: true } },
      order: {
        select: {
          id: true,
          status: true,
          totalCents: true,
          stripePaymentIntent: true,
          stripeSessionId: true,
          stripeRefundId: true,
        },
      },
    },
  });
  if (!booking) return;

  const refundResult = await refundBookingPayment({
    bookingId: booking.id,
    bookingStatus: booking.status,
    priceCents: booking.priceCents,
    stripeSessionId: booking.stripeSessionId,
    order: booking.order,
  });

  if (!refundResult.refunded && !refundResult.skipped) {
    // Leave the booking pending so the vendor can sort it out rather than silently
    // cancelling someone who paid and was never refunded.
    console.error(
      "[booking] slot lost but refund failed — needs manual review:",
      bookingId,
      refundResult.error,
    );
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: BOOKING_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: "That time was booked by someone who paid first.",
      },
    });
    if (booking.order) {
      await tx.booking.updateMany({
        where: {
          orderId: booking.order.id,
          id: { not: bookingId },
          status: { not: BOOKING_STATUS.CANCELLED },
        },
        data: {
          status: BOOKING_STATUS.CANCELLED,
          cancelledAt: new Date(),
          cancellationReason: "Checkout could not be completed for every session.",
        },
      });
      if (booking.order.status !== "refunded") {
        await tx.order.update({
          where: { id: booking.order.id },
          data: { status: "cancelled" },
        });
      }
    }
  });

  const emailResult = await sendBookingCancellationEmail({
    memberEmail: booking.memberEmail,
    vendorEmail: booking.vendorEmail,
    serviceTitle: booking.listing.title,
    vendorName: booking.vendorProfile.displayName,
    memberName: booking.memberName,
    scheduledStartAt: booking.scheduledStartAt,
    scheduledEndAt: booking.scheduledEndAt,
    timeZone: booking.timeZone,
    cancelledBy: "slot_taken",
    bookingId: booking.id,
    refundAmountCents: refundResult.refunded ? refundResult.amountCents : undefined,
    rebookUrl: `${appBaseUrl()}${discoverBookPath(
      { id: booking.listing.id, publicSlug: booking.listing.publicSlug },
      booking.variantId,
    )}`,
  });

  if (!emailResult.ok) {
    console.warn("[booking] slot-taken email failed:", bookingId, emailResult.error);
  }
}

export type CancelServiceBookingInput = {
  bookingId: string;
  reason?: string;
  cancelledBy: "member" | "vendor";
  cancelCalendar?: boolean;
};

export async function cancelServiceBooking(
  args: CancelServiceBookingInput,
): Promise<
  | { ok: true; refunded: boolean; refundAmountCents?: number }
  | { ok: false; error: string }
> {
  const booking = await prisma.booking.findUnique({
    where: { id: args.bookingId },
    include: {
      listing: { select: { title: true } },
      vendorProfile: { select: { displayName: true } },
      order: {
        select: {
          id: true,
          status: true,
          totalCents: true,
          stripePaymentIntent: true,
          stripeSessionId: true,
          stripeRefundId: true,
        },
      },
    },
  });

  if (!booking) {
    return { ok: false, error: "Booking not found." };
  }
  if (booking.status === BOOKING_STATUS.CANCELLED) {
    return { ok: false, error: "This booking is already cancelled." };
  }
  if (booking.status === BOOKING_STATUS.COMPLETED) {
    return { ok: false, error: "Completed bookings cannot be cancelled." };
  }
  if (
    booking.status !== BOOKING_STATUS.PENDING_PAYMENT &&
    booking.status !== BOOKING_STATUS.CONFIRMED
  ) {
    return { ok: false, error: "This booking cannot be cancelled." };
  }

  let refundAmountCents: number | undefined;
  let wasRefunded = false;

  // Vendors always refund the customer; self-serve cancellations must beat the cutoff.
  const refundOwed =
    args.cancelledBy === "vendor" ||
    selfCancellationRefundable({ scheduledStartAt: booking.scheduledStartAt });

  if (booking.status === BOOKING_STATUS.CONFIRMED && refundOwed) {
    const refundResult = await refundBookingPayment({
      bookingId: booking.id,
      bookingStatus: booking.status,
      priceCents: booking.priceCents,
      stripeSessionId: booking.stripeSessionId,
      order: booking.order,
    });

    if (!refundResult.refunded && !refundResult.skipped) {
      return {
        ok: false,
        error: refundResult.error || "Could not process refund. Booking was not cancelled.",
      };
    }

    if (refundResult.refunded) {
      wasRefunded = true;
      refundAmountCents = refundResult.amountCents;
    }
  }

  if (args.cancelCalendar !== false && booking.calendarEventId) {
    try {
      const calendar = getCalendarService();
      await calendar.cancelAppointment({
        eventId: booking.calendarEventId,
        reason: args.reason,
        notifyAttendees: true,
      });
    } catch (err) {
      console.error("[booking] calendar cancel failed for", args.bookingId, err);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.booking.update({
      where: { id: args.bookingId },
      data: {
        status: BOOKING_STATUS.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: args.reason?.trim() || null,
      },
    });

    if (booking.order?.status === "pending") {
      await tx.order.update({
        where: { id: booking.order.id },
        data: { status: "cancelled" },
      });
    }
  });

  const emailResult = await sendBookingCancellationEmail({
    memberEmail: booking.memberEmail,
    vendorEmail: booking.vendorEmail,
    serviceTitle: booking.listing.title,
    vendorName: booking.vendorProfile.displayName,
    memberName: booking.memberName,
    scheduledStartAt: booking.scheduledStartAt,
    scheduledEndAt: booking.scheduledEndAt,
    timeZone: booking.timeZone,
    cancelledBy: args.cancelledBy,
    reason: args.reason,
    bookingId: booking.id,
    refundAmountCents: wasRefunded ? refundAmountCents : undefined,
  });

  if (!emailResult.ok) {
    console.warn("[booking] cancellation email failed:", args.bookingId, emailResult.error);
  }

  return { ok: true, refunded: wasRefunded, refundAmountCents };
}

export async function confirmPaidServiceBookingFromStripeSession(
  stripeSessionId: string,
): Promise<{ confirmed: boolean; bookingId?: string }> {
  const stripe = getConnectStripeClient();
  const session = await stripe.checkout.sessions.retrieve(stripeSessionId);

  if (session.payment_status !== "paid") {
    return { confirmed: false };
  }

  const orderId = session.metadata?.orderId;
  const bookingIds = parseBookingIdsFromStripeSession(session);
  if (bookingIds.length === 0) {
    return { confirmed: false };
  }

  if (orderId) {
    await prisma.order.updateMany({
      where: { id: orderId },
      data: {
        status: "paid",
        stripeSessionId: session.id,
        stripePaymentIntent:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : session.payment_intent?.id ?? null,
      },
    });
    await hookOrderVerified(orderId);
  }

  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    select: {
      id: true,
      status: true,
      listingId: true,
      scheduledStartAt: true,
      scheduledEndAt: true,
    },
  });

  for (const booking of bookings) {
    if (booking.status === BOOKING_STATUS.CANCELLED) continue;
    const slotTaken = await prisma.booking.findFirst({
      where: {
        id: { notIn: bookingIds },
        listingId: booking.listingId,
        status: BOOKING_STATUS.CONFIRMED,
        scheduledStartAt: { lt: booking.scheduledEndAt },
        scheduledEndAt: { gt: booking.scheduledStartAt },
      },
      select: { id: true },
    });
    if (slotTaken) {
      await releaseBookingToSlotWinner(booking.id);
      return { confirmed: false };
    }
  }

  for (const bookingId of bookingIds) {
    await confirmPaidServiceBooking(bookingId, { siblingBookingIds: bookingIds });
  }

  return { confirmed: true, bookingId: bookingIds[0] };
}

function parseBookingIdsFromStripeSession(
  session: { metadata?: Record<string, string> | null },
): string[] {
  const raw = session.metadata?.bookingIds;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
      }
    } catch {
      // fall through to single bookingId
    }
  }
  const single = session.metadata?.bookingId?.trim();
  return single ? [single] : [];
}

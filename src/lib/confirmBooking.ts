import { prisma } from "@/lib/prisma";
import { sendBookingConfirmationEmail, sendBookingCancellationEmail } from "@/lib/email";
import { refundBookingPayment } from "@/lib/bookingRefund";
import { BOOKING_STATUS, FULFILLMENT_METHOD } from "@/lib/roles";
import { getConnectStripeClient } from "@/lib/stripeConnectDemo";
import { CALENDAR_PROVIDER } from "@/services/calendar/calendar.constants";
import { getCalendarService } from "@/services/calendar/calendar.service";

/**
 * Idempotent: marks order paid (if needed), creates calendar event + Meet link, sends confirmation emails.
 * Safe to call from Stripe webhooks and from checkout confirmation when webhooks are delayed (local dev).
 */
export async function confirmPaidServiceBooking(bookingId: string): Promise<void> {
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
  });

  if (!emailResult.ok) {
    console.warn("[booking] confirmation email failed:", bookingId, emailResult.error);
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

  if (booking.status === BOOKING_STATUS.CONFIRMED) {
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

  const bookingId = session.metadata?.bookingId;
  const orderId = session.metadata?.orderId;
  if (!bookingId) {
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
  }

  await confirmPaidServiceBooking(bookingId);
  return { confirmed: true, bookingId };
}

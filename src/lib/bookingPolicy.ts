/**
 * Cancellation and refund policy for service bookings.
 *
 * Members and guests cancel themselves for a full refund up to the cutoff. Inside the
 * cutoff the seat is the vendor's to give back: they can still cancel from their
 * dashboard, and a vendor-initiated cancellation always refunds in full.
 */

export const BOOKING_FREE_CANCELLATION_HOURS = 24;

const CANCELLATION_WINDOW_MS = BOOKING_FREE_CANCELLATION_HOURS * 60 * 60 * 1000;

/** Last moment a member or guest can cancel themselves and still be refunded. */
export function refundCutoffAt(scheduledStartAt: Date): Date {
  return new Date(scheduledStartAt.getTime() - CANCELLATION_WINDOW_MS);
}

/**
 * Whether a self-serve cancellation still earns a refund.
 * Vendor-initiated cancellations bypass this and always refund.
 */
export function selfCancellationRefundable(args: {
  scheduledStartAt: Date;
  now?: Date;
}): boolean {
  const now = args.now ?? new Date();
  return now.getTime() <= refundCutoffAt(args.scheduledStartAt).getTime();
}

/** Short policy line for listing pages and the booking wizard. */
export const BOOKING_CANCELLATION_POLICY_SHORT = `Free cancellation up to ${BOOKING_FREE_CANCELLATION_HOURS} hours before your appointment.`;

/** Fuller policy paragraph for confirmation emails and the cancel screen. */
export const BOOKING_CANCELLATION_POLICY_LONG = `Cancel at least ${BOOKING_FREE_CANCELLATION_HOURS} hours before your appointment for a full refund. Inside ${BOOKING_FREE_CANCELLATION_HOURS} hours the booking is non-refundable, but you can message the vendor — if they cancel it for you, you're refunded in full.`;

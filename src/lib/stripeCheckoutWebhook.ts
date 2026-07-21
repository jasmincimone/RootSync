/**
 * Pure helpers for Stripe Checkout webhook handling.
 * Keep DB/Stripe I/O in the route; test metadata/payment-intent parsing here.
 */

export type CheckoutSessionLike = {
  id: string;
  metadata?: Record<string, string> | null;
  payment_intent?: string | { id: string } | null;
};

export type CheckoutCompletedFields = {
  orderId: string | null;
  bookingId: string | null;
  checkoutType: string | null;
  paymentIntentId: string | null;
};

export function checkoutCompletedFields(session: CheckoutSessionLike): CheckoutCompletedFields {
  const orderId = session.metadata?.orderId?.trim() || null;
  const bookingId = session.metadata?.bookingId?.trim() || null;
  const checkoutType = session.metadata?.type?.trim() || null;
  const pi = session.payment_intent;
  const paymentIntentId =
    typeof pi === "string" ? pi : pi && typeof pi === "object" && "id" in pi ? pi.id : null;

  return { orderId, bookingId, checkoutType, paymentIntentId };
}

/** After marking the order paid — confirm booking vs fulfill event tickets. */
export function shouldConfirmServiceBooking(fields: CheckoutCompletedFields): boolean {
  return fields.checkoutType === "service_booking" && Boolean(fields.bookingId);
}

/**
 * Destination-charge payment_intent_data for RootSync Checkout.
 * Fee always leaves at least 1¢ for the connected vendor on positive charges.
 */
export function connectDestinationPaymentIntentData(
  chargeAmountCents: number,
  destinationAccountId: string,
  applicationFeeCents: number,
): {
  application_fee_amount: number;
  transfer_data: { destination: string };
} {
  const destination = destinationAccountId.trim();
  if (!destination.startsWith("acct_")) {
    throw new Error("Connected account id must start with acct_");
  }
  const amount = Math.round(chargeAmountCents);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Charge amount must be a positive integer (cents)");
  }
  const fee = Math.min(Math.max(Math.round(applicationFeeCents), 0), Math.max(amount - 1, 0));
  return {
    application_fee_amount: fee,
    transfer_data: { destination },
  };
}

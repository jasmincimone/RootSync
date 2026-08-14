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

type CheckoutShippingAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

type CheckoutShippingDetails = {
  name?: string | null;
  address?: CheckoutShippingAddress | null;
} | null;

/** Stripe Checkout Session fields used to persist shipping after pay. */
export type CheckoutSessionShippingLike = {
  amount_total?: number | null;
  shipping_cost?: { amount_total?: number | null } | null;
  shipping_details?: CheckoutShippingDetails;
  collected_information?: {
    shipping_details?: CheckoutShippingDetails;
  } | null;
};

/**
 * Map Stripe Checkout shipping + totals onto Order columns.
 * Platform fee stays on product subtotal; shippingCents is the chosen rate.
 */
export function orderShippingFieldsFromCheckoutSession(
  session: CheckoutSessionShippingLike,
): {
  shippingCents?: number;
  totalCents?: number;
  shippingName?: string | null;
  shippingLine1?: string | null;
  shippingLine2?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPostal?: string | null;
  shippingCountry?: string | null;
} {
  const details =
    session.shipping_details ?? session.collected_information?.shipping_details ?? null;
  const address = details?.address ?? null;
  const shippingCents =
    typeof session.shipping_cost?.amount_total === "number"
      ? Math.max(0, Math.round(session.shipping_cost.amount_total))
      : undefined;
  const totalCents =
    typeof session.amount_total === "number"
      ? Math.max(0, Math.round(session.amount_total))
      : undefined;

  const hasAddress = Boolean(
    details?.name?.trim() ||
      address?.line1?.trim() ||
      address?.city?.trim() ||
      address?.postal_code?.trim(),
  );

  return {
    ...(shippingCents !== undefined ? { shippingCents } : {}),
    ...(totalCents !== undefined ? { totalCents } : {}),
    ...(hasAddress
      ? {
          shippingName: details?.name?.trim() || null,
          shippingLine1: address?.line1?.trim() || null,
          shippingLine2: address?.line2?.trim() || null,
          shippingCity: address?.city?.trim() || null,
          shippingState: address?.state?.trim() || null,
          shippingPostal: address?.postal_code?.trim() || null,
          shippingCountry: address?.country?.trim() || null,
        }
      : {}),
  };
}

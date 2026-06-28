import { prisma } from "@/lib/prisma";
import { getConnectStripeClient } from "@/lib/stripeConnectDemo";
import { BOOKING_STATUS } from "@/lib/roles";

export type RefundBookingPaymentInput = {
  bookingId: string;
  bookingStatus: string;
  priceCents: number;
  stripeSessionId: string | null;
  order: {
    id: string;
    status: string;
    totalCents: number;
    stripePaymentIntent: string | null;
    stripeSessionId: string | null;
    stripeRefundId: string | null;
  } | null;
};

export type RefundBookingPaymentResult =
  | { refunded: false; skipped: true; reason: string }
  | { refunded: true; refundId: string; amountCents: number }
  | { refunded: false; skipped: false; error: string };

/**
 * Issues a full Stripe refund when a paid service booking is cancelled.
 * Skips when the booking was never paid or already refunded.
 */
export async function refundBookingPayment(
  input: RefundBookingPaymentInput,
): Promise<RefundBookingPaymentResult> {
  if (input.bookingStatus !== BOOKING_STATUS.CONFIRMED) {
    return { refunded: false, skipped: true, reason: "not_paid" };
  }

  const order = input.order;
  if (!order || order.status !== "paid") {
    return { refunded: false, skipped: true, reason: "order_not_paid" };
  }

  if (order.stripeRefundId) {
    return {
      refunded: true,
      refundId: order.stripeRefundId,
      amountCents: order.totalCents,
    };
  }

  const stripe = getConnectStripeClient();
  let paymentIntentId = order.stripePaymentIntent;

  if (!paymentIntentId) {
    const sessionId = order.stripeSessionId ?? input.stripeSessionId;
    if (!sessionId) {
      return {
        refunded: false,
        skipped: false,
        error: "No payment record found for this booking.",
      };
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;
  }

  if (!paymentIntentId) {
    return {
      refunded: false,
      skipped: false,
      error: "Could not find payment to refund.",
    };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const isDestinationCharge = Boolean(paymentIntent.transfer_data?.destination);

    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentIntentId,
        ...(isDestinationCharge
          ? { reverse_transfer: true, refund_application_fee: true }
          : {}),
        metadata: {
          bookingId: input.bookingId,
          orderId: order.id,
          reason: "booking_cancelled",
        },
      },
      { idempotencyKey: `booking-refund-${input.bookingId}` },
    );

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "refunded",
        stripeRefundId: refund.id,
        refundedAt: new Date(),
        stripePaymentIntent: paymentIntentId,
      },
    });

    return {
      refunded: true,
      refundId: refund.id,
      amountCents: refund.amount ?? order.totalCents,
    };
  } catch (err) {
    const stripeCode =
      err && typeof err === "object" && "code" in err
        ? String((err as { code?: string }).code)
        : null;

    if (stripeCode === "charge_already_refunded") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: "refunded",
          refundedAt: new Date(),
          stripePaymentIntent: paymentIntentId,
        },
      });
      return {
        refunded: true,
        refundId: order.stripeRefundId ?? "already_refunded",
        amountCents: order.totalCents,
      };
    }

    const message =
      err instanceof Error ? err.message : "Stripe refund failed.";
    console.error("[booking] refund failed for", input.bookingId, err);
    return { refunded: false, skipped: false, error: message };
  }
}

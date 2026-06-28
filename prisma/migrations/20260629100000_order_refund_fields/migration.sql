-- Track Stripe refunds for cancelled service bookings (and future order refunds).
ALTER TABLE "Order" ADD COLUMN "stripeRefundId" TEXT;
ALTER TABLE "Order" ADD COLUMN "refundedAt" TIMESTAMP(3);

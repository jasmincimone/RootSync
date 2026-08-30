-- Allow multiple service bookings per checkout order.

DROP INDEX IF EXISTS "Booking_orderId_key";
DROP INDEX IF EXISTS "Booking_stripeSessionId_key";

CREATE INDEX "Booking_orderId_idx" ON "Booking"("orderId");
CREATE INDEX "Booking_stripeSessionId_idx" ON "Booking"("stripeSessionId");

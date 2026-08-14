-- Idempotent admin alert when a paid order needs to be mailed
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "shippingAlertEmailedAt" TIMESTAMP(3);

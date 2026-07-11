-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "buyerConfirmationEmailedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "growth_contacts" ADD COLUMN "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "growth_contacts" ADD COLUMN "marketingOptInAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "marketingOptIn" BOOLEAN NOT NULL DEFAULT false;

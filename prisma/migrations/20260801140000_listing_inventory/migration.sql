-- Inventory tracked in RootSync (Stripe Product API has no stock field for Connect).
ALTER TABLE "ProductDetails" ADD COLUMN IF NOT EXISTS "inventoryQuantity" INTEGER;
ALTER TABLE "OfferingVariant" ADD COLUMN IF NOT EXISTS "inventoryQuantity" INTEGER;

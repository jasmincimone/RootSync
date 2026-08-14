-- Optional per-product shipping override (null = use vendor profile flat rate)
ALTER TABLE "ProductDetails" ADD COLUMN IF NOT EXISTS "shippingFlatCents" INTEGER;

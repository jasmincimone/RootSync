-- Vendor flat shipping + local pickup toggle for Stripe Checkout
ALTER TABLE "VendorProfile" ADD COLUMN IF NOT EXISTS "shippingFlatCents" INTEGER;
ALTER TABLE "VendorProfile" ADD COLUMN IF NOT EXISTS "offersLocalPickup" BOOLEAN NOT NULL DEFAULT true;

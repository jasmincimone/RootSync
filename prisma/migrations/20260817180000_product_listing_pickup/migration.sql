-- Physical products ship by default. Vendors opt into local pickup per listing.
ALTER TABLE "ProductDetails"
  ADD COLUMN IF NOT EXISTS "offersLocalPickup" BOOLEAN NOT NULL DEFAULT false;

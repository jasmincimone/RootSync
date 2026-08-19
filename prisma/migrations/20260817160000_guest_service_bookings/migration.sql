-- Guest service bookings: bookings may exist without a RootSync account.
-- Guests are identified by "memberEmail" alone, mirroring how guest orders use "Order"."email".
ALTER TABLE "Booking" ALTER COLUMN "memberUserId" DROP NOT NULL;

-- Vendors can require a signed-in account for a specific service listing.
ALTER TABLE "ServiceDetails"
  ADD COLUMN IF NOT EXISTS "requiresAccountToBook" BOOLEAN NOT NULL DEFAULT false;

-- Guest bookings are looked up by email when a guest later creates an account.
CREATE INDEX IF NOT EXISTS "Booking_memberEmail_idx" ON "Booking"("memberEmail");

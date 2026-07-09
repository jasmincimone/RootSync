-- Vendor Pulse reviews (Phase 7)

CREATE TABLE "vendor_pulse_reviews" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "listingId" TEXT,
    "orderId" TEXT,
    "bookingId" TEXT,
    "pulseRating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_pulse_reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendor_pulse_reviews_orderId_key" ON "vendor_pulse_reviews"("orderId");
CREATE UNIQUE INDEX "vendor_pulse_reviews_bookingId_key" ON "vendor_pulse_reviews"("bookingId");
CREATE INDEX "vendor_pulse_reviews_vendorProfileId_createdAt_idx" ON "vendor_pulse_reviews"("vendorProfileId", "createdAt");
CREATE INDEX "vendor_pulse_reviews_reviewerUserId_idx" ON "vendor_pulse_reviews"("reviewerUserId");

ALTER TABLE "vendor_pulse_reviews" ADD CONSTRAINT "vendor_pulse_reviews_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_pulse_reviews" ADD CONSTRAINT "vendor_pulse_reviews_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendor_pulse_reviews" ADD CONSTRAINT "vendor_pulse_reviews_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_pulse_reviews" ADD CONSTRAINT "vendor_pulse_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_pulse_reviews" ADD CONSTRAINT "vendor_pulse_reviews_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

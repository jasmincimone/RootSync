-- Offering variants: priced options within a single offering

CREATE TABLE "OfferingVariant" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "durationMinutes" INTEGER,
    "sku" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfferingVariant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Booking" ADD COLUMN "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "variantId" TEXT;

CREATE INDEX "OfferingVariant_offeringId_idx" ON "OfferingVariant"("offeringId");
CREATE INDEX "OfferingVariant_offeringId_sortOrder_idx" ON "OfferingVariant"("offeringId", "sortOrder");
CREATE INDEX "Booking_variantId_idx" ON "Booking"("variantId");
CREATE INDEX "OrderItem_variantId_idx" ON "OrderItem"("variantId");

ALTER TABLE "OfferingVariant" ADD CONSTRAINT "OfferingVariant_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "OfferingVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "OfferingVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

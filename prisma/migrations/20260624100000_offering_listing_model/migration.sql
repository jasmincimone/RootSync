-- ADR-001: Offering + Listing model (replaces MarketplaceListing)

-- CreateTable
CREATE TABLE "Offering" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "listingType" TEXT NOT NULL DEFAULT 'PRODUCT',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "imageUrl" TEXT,
    "paymentUrl" TEXT,
    "productUrl" TEXT,
    "vendorNotes" TEXT,
    "scheduledPublishAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offering_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "listingType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "imageUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'HIDDEN',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductDetails" (
    "offeringId" TEXT NOT NULL,
    "requiresShipping" BOOLEAN NOT NULL DEFAULT true,
    "sku" TEXT,

    CONSTRAINT "ProductDetails_pkey" PRIMARY KEY ("offeringId")
);

CREATE TABLE "ServiceDetails" (
    "offeringId" TEXT NOT NULL,
    "serviceKind" TEXT NOT NULL DEFAULT 'ONE_TIME',
    "durationMinutes" INTEGER,
    "serviceRadius" TEXT,
    "terms" TEXT,
    "bookingUrl" TEXT,

    CONSTRAINT "ServiceDetails_pkey" PRIMARY KEY ("offeringId")
);

CREATE TABLE "ResourceDetails" (
    "offeringId" TEXT NOT NULL,
    "format" TEXT,
    "fileUrl" TEXT,

    CONSTRAINT "ResourceDetails_pkey" PRIMARY KEY ("offeringId")
);

CREATE TABLE "EventDetails" (
    "offeringId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "location" TEXT,
    "venue" TEXT,
    "capacity" INTEGER,

    CONSTRAINT "EventDetails_pkey" PRIMARY KEY ("offeringId")
);

-- Migrate MarketplaceListing → Offering + Listing (preserve public Listing ids)
INSERT INTO "Offering" (
    "id",
    "vendorProfileId",
    "listingType",
    "status",
    "title",
    "description",
    "priceCents",
    "category",
    "imageUrl",
    "paymentUrl",
    "productUrl",
    "createdAt",
    "updatedAt"
)
SELECT
    'o' || "id",
    "vendorProfileId",
    'PRODUCT',
    CASE "status"
        WHEN 'PUBLISHED' THEN 'ACTIVE'
        WHEN 'ARCHIVED' THEN 'ARCHIVED'
        ELSE 'DRAFT'
    END,
    "title",
    "description",
    "priceCents",
    "category",
    "imageUrl",
    "paymentUrl",
    "productUrl",
    "createdAt",
    "updatedAt"
FROM "MarketplaceListing";

INSERT INTO "Listing" (
    "id",
    "offeringId",
    "vendorProfileId",
    "listingType",
    "title",
    "description",
    "priceCents",
    "category",
    "imageUrl",
    "visibility",
    "publishedAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    'o' || "id",
    "vendorProfileId",
    'PRODUCT',
    "title",
    "description",
    "priceCents",
    "category",
    "imageUrl",
    CASE "status"
        WHEN 'PUBLISHED' THEN 'PUBLIC'
        ELSE 'HIDDEN'
    END,
    CASE "status"
        WHEN 'PUBLISHED' THEN "updatedAt"
        ELSE NULL
    END,
    "createdAt",
    "updatedAt"
FROM "MarketplaceListing";

INSERT INTO "ProductDetails" ("offeringId")
SELECT 'o' || "id" FROM "MarketplaceListing";

-- Drop legacy FK before removing MarketplaceListing
ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_listingId_fkey";

DROP TABLE "MarketplaceListing";

-- CreateIndex
CREATE UNIQUE INDEX "Listing_offeringId_key" ON "Listing"("offeringId");
CREATE INDEX "Offering_vendorProfileId_idx" ON "Offering"("vendorProfileId");
CREATE INDEX "Offering_status_idx" ON "Offering"("status");
CREATE INDEX "Offering_listingType_idx" ON "Offering"("listingType");
CREATE INDEX "Listing_vendorProfileId_idx" ON "Listing"("vendorProfileId");
CREATE INDEX "Listing_listingType_idx" ON "Listing"("listingType");
CREATE INDEX "Listing_visibility_idx" ON "Listing"("visibility");

-- AddForeignKey
ALTER TABLE "Offering" ADD CONSTRAINT "Offering_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Listing" ADD CONSTRAINT "Listing_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductDetails" ADD CONSTRAINT "ProductDetails_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceDetails" ADD CONSTRAINT "ServiceDetails_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResourceDetails" ADD CONSTRAINT "ResourceDetails_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EventDetails" ADD CONSTRAINT "EventDetails_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Directory listings (USDA import + future claim workflow)
CREATE TABLE "DirectoryListing" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "directoryType" TEXT NOT NULL,
    "category" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "source" TEXT NOT NULL DEFAULT 'USDA',
    "externalId" TEXT NOT NULL,
    "externalUrl" TEXT,
    "rawSourceJson" JSONB,
    "lastSyncedAt" TIMESTAMP(3),
    "claimStatus" TEXT NOT NULL DEFAULT 'UNCLAIMED',
    "claimedVendorProfileId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryListing_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DirectoryListing_source_externalId_key" ON "DirectoryListing"("source", "externalId");
CREATE UNIQUE INDEX "DirectoryListing_claimedVendorProfileId_key" ON "DirectoryListing"("claimedVendorProfileId");
CREATE INDEX "DirectoryListing_directoryType_idx" ON "DirectoryListing"("directoryType");
CREATE INDEX "DirectoryListing_state_city_idx" ON "DirectoryListing"("state", "city");
CREATE INDEX "DirectoryListing_status_idx" ON "DirectoryListing"("status");
CREATE INDEX "DirectoryListing_latitude_longitude_idx" ON "DirectoryListing"("latitude", "longitude");

ALTER TABLE "DirectoryListing" ADD CONSTRAINT "DirectoryListing_claimedVendorProfileId_fkey" FOREIGN KEY ("claimedVendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

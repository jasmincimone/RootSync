-- AlterTable
ALTER TABLE "VendorProfile" ADD COLUMN "publicSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_publicSlug_key" ON "VendorProfile"("publicSlug");

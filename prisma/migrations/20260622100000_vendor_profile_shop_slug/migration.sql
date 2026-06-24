-- AlterTable
ALTER TABLE "VendorProfile" ADD COLUMN "shopSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_shopSlug_key" ON "VendorProfile"("shopSlug");

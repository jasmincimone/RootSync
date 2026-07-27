-- AlterTable
ALTER TABLE "Listing" ADD COLUMN "publicSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Listing_publicSlug_key" ON "Listing"("publicSlug");

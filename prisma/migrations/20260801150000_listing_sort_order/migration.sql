-- Vendor-controlled listing display order
ALTER TABLE "Listing" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

WITH ranked AS (
  SELECT
    id,
    (ROW_NUMBER() OVER (
      PARTITION BY "vendorProfileId"
      ORDER BY "updatedAt" DESC, id ASC
    ) - 1)::integer AS rn
  FROM "Listing"
)
UPDATE "Listing" AS l
SET "sortOrder" = ranked.rn
FROM ranked
WHERE l.id = ranked.id;

CREATE INDEX IF NOT EXISTS "Listing_vendorProfileId_sortOrder_idx"
  ON "Listing"("vendorProfileId", "sortOrder");

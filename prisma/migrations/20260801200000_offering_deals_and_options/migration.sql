-- Deals: units included per priced variant
ALTER TABLE "OfferingVariant" ADD COLUMN IF NOT EXISTS "unitsIncluded" INTEGER NOT NULL DEFAULT 1;

-- Per-unit option selections on order lines
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "unitSelections" JSONB;

-- Option groups + values
CREATE TABLE IF NOT EXISTS "OfferingOptionGroup" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfferingOptionGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "OfferingOptionValue" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "label" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OfferingOptionValue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OfferingOptionGroup_offeringId_idx" ON "OfferingOptionGroup"("offeringId");
CREATE INDEX IF NOT EXISTS "OfferingOptionGroup_offeringId_sortOrder_idx" ON "OfferingOptionGroup"("offeringId", "sortOrder");
CREATE INDEX IF NOT EXISTS "OfferingOptionValue_groupId_idx" ON "OfferingOptionValue"("groupId");
CREATE INDEX IF NOT EXISTS "OfferingOptionValue_groupId_sortOrder_idx" ON "OfferingOptionValue"("groupId", "sortOrder");

DO $$ BEGIN
  ALTER TABLE "OfferingOptionGroup"
    ADD CONSTRAINT "OfferingOptionGroup_offeringId_fkey"
    FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "OfferingOptionValue"
    ADD CONSTRAINT "OfferingOptionValue_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "OfferingOptionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- DropIndex
DROP INDEX "Booking_variantId_idx";

-- DropIndex
DROP INDEX "OrderItem_variantId_idx";

-- RenameIndex
ALTER INDEX "growth_marketing_events_vendorProfileId_eventType_occurredAt_id" RENAME TO "growth_marketing_events_vendorProfileId_eventType_occurredA_idx";

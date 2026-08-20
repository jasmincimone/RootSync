-- GrowSpace campaign builder: destinations, audience, recipients, follow-up steps, unsubscribe.

ALTER TABLE "growth_contacts"
  ADD COLUMN IF NOT EXISTS "unsubscribedAt" TIMESTAMP(3);

ALTER TABLE "growth_email_campaigns"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "objective" TEXT,
  ADD COLUMN IF NOT EXISTS "channel" TEXT NOT NULL DEFAULT 'EMAIL',
  ADD COLUMN IF NOT EXISTS "previewText" TEXT,
  ADD COLUMN IF NOT EXISTS "headline" TEXT,
  ADD COLUMN IF NOT EXISTS "ctaLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "ctaUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "senderName" TEXT,
  ADD COLUMN IF NOT EXISTS "replyTo" TEXT,
  ADD COLUMN IF NOT EXISTS "destinationType" TEXT,
  ADD COLUMN IF NOT EXISTS "destinationId" TEXT,
  ADD COLUMN IF NOT EXISTS "destinationUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "audienceType" TEXT NOT NULL DEFAULT 'ALL',
  ADD COLUMN IF NOT EXISTS "audienceJson" JSONB,
  ADD COLUMN IF NOT EXISTS "timezone" TEXT,
  ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "growth_campaign_recipients" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "contactId" TEXT,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "trackingToken" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "sentAt" TIMESTAMP(3),
  "openedAt" TIMESTAMP(3),
  "clickedAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  "attributedRevenueCents" INTEGER NOT NULL DEFAULT 0,
  "failReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "growth_campaign_recipients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_campaign_recipients_trackingToken_key"
  ON "growth_campaign_recipients"("trackingToken");
CREATE INDEX IF NOT EXISTS "growth_campaign_recipients_campaignId_email_idx"
  ON "growth_campaign_recipients"("campaignId", "email");
CREATE INDEX IF NOT EXISTS "growth_campaign_recipients_contactId_idx"
  ON "growth_campaign_recipients"("contactId");

CREATE TABLE IF NOT EXISTS "growth_campaign_steps" (
  "id" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL,
  "triggerType" TEXT NOT NULL,
  "delayHours" INTEGER NOT NULL DEFAULT 48,
  "subject" TEXT,
  "previewText" TEXT,
  "bodyHtml" TEXT,
  "ctaLabel" TEXT,
  "ctaUrl" TEXT,
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "growth_campaign_steps_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "growth_campaign_steps_campaignId_sortOrder_key"
  ON "growth_campaign_steps"("campaignId", "sortOrder");

ALTER TABLE "growth_marketing_events"
  ADD COLUMN IF NOT EXISTS "recipientId" TEXT;

CREATE INDEX IF NOT EXISTS "growth_marketing_events_campaignId_idx"
  ON "growth_marketing_events"("campaignId");
CREATE INDEX IF NOT EXISTS "growth_marketing_events_recipientId_idx"
  ON "growth_marketing_events"("recipientId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'growth_campaign_recipients_campaignId_fkey'
  ) THEN
    ALTER TABLE "growth_campaign_recipients"
      ADD CONSTRAINT "growth_campaign_recipients_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "growth_email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'growth_campaign_recipients_contactId_fkey'
  ) THEN
    ALTER TABLE "growth_campaign_recipients"
      ADD CONSTRAINT "growth_campaign_recipients_contactId_fkey"
      FOREIGN KEY ("contactId") REFERENCES "growth_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'growth_campaign_steps_campaignId_fkey'
  ) THEN
    ALTER TABLE "growth_campaign_steps"
      ADD CONSTRAINT "growth_campaign_steps_campaignId_fkey"
      FOREIGN KEY ("campaignId") REFERENCES "growth_email_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'growth_marketing_events_recipientId_fkey'
  ) THEN
    ALTER TABLE "growth_marketing_events"
      ADD CONSTRAINT "growth_marketing_events_recipientId_fkey"
      FOREIGN KEY ("recipientId") REFERENCES "growth_campaign_recipients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

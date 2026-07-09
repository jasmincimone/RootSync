-- Growth Workspace (ADR-007)
-- See docs/20_GROWTH_WORKSPACE_SCHEMA.md

-- CreateTable
CREATE TABLE "growth_funnels" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "objective" TEXT,
    "entrySource" TEXT,
    "landingPageId" TEXT,
    "leadMagnet" TEXT,
    "ctaLabel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metricsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_funnels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_landing_pages" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "funnelId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "headline" TEXT,
    "contentJson" JSONB,
    "leadMagnetUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_contacts" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "rootSyncUserId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "accountType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW_LEAD',
    "leadSource" TEXT,
    "geographicRegion" TEXT,
    "growingZone" TEXT,
    "interestsJson" JSONB,
    "funnelId" TEXT,
    "lastActivityAt" TIMESTAMP(3),
    "communityActivitySummary" TEXT,
    "purchaseSummary" TEXT,
    "consultationSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_tags" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_contact_tags" (
    "contactId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "growth_contact_tags_pkey" PRIMARY KEY ("contactId","tagId")
);

-- CreateTable
CREATE TABLE "growth_crm_notes" (
    "id" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_crm_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_tasks" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "contactId" TEXT,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_funnel_steps" (
    "id" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "stepType" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "referenceId" TEXT,
    "referenceType" TEXT,

    CONSTRAINT "growth_funnel_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_qr_campaigns" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "name" TEXT NOT NULL,
    "campaignType" TEXT NOT NULL,
    "destinationUrl" TEXT NOT NULL,
    "landingPageId" TEXT,
    "funnelId" TEXT,
    "scanCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_qr_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_segments" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rulesJson" JSONB,
    "isDynamic" BOOLEAN NOT NULL DEFAULT true,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_segments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_email_campaigns" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "bodyHtml" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "segmentId" TEXT,
    "openCount" INTEGER NOT NULL DEFAULT 0,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "unsubscribeCount" INTEGER NOT NULL DEFAULT 0,
    "providerMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_email_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_email_sequences" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "name" TEXT NOT NULL,
    "sequenceType" TEXT NOT NULL,
    "stepsJson" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "funnelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_email_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_consultation_leads" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "bookingId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'LEAD',
    "source" TEXT,
    "funnelId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "growth_consultation_leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "growth_marketing_events" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT,
    "eventType" TEXT NOT NULL,
    "contactId" TEXT,
    "rootSyncUserId" TEXT,
    "funnelId" TEXT,
    "landingPageId" TEXT,
    "qrCampaignId" TEXT,
    "campaignId" TEXT,
    "metadataJson" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "growth_marketing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "growth_funnels_vendorProfileId_isActive_idx" ON "growth_funnels"("vendorProfileId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "growth_landing_pages_vendorProfileId_slug_key" ON "growth_landing_pages"("vendorProfileId", "slug");

-- CreateIndex
CREATE INDEX "growth_landing_pages_vendorProfileId_isPublished_idx" ON "growth_landing_pages"("vendorProfileId", "isPublished");

-- CreateIndex
CREATE INDEX "growth_contacts_vendorProfileId_email_idx" ON "growth_contacts"("vendorProfileId", "email");

-- CreateIndex
CREATE INDEX "growth_contacts_vendorProfileId_status_idx" ON "growth_contacts"("vendorProfileId", "status");

-- CreateIndex
CREATE INDEX "growth_contacts_rootSyncUserId_idx" ON "growth_contacts"("rootSyncUserId");

-- CreateIndex
CREATE INDEX "growth_contacts_funnelId_idx" ON "growth_contacts"("funnelId");

-- CreateIndex
CREATE UNIQUE INDEX "growth_tags_vendorProfileId_name_key" ON "growth_tags"("vendorProfileId", "name");

-- CreateIndex
CREATE INDEX "growth_tags_vendorProfileId_idx" ON "growth_tags"("vendorProfileId");

-- CreateIndex
CREATE INDEX "growth_crm_notes_contactId_idx" ON "growth_crm_notes"("contactId");

-- CreateIndex
CREATE INDEX "growth_tasks_vendorProfileId_completedAt_idx" ON "growth_tasks"("vendorProfileId", "completedAt");

-- CreateIndex
CREATE INDEX "growth_tasks_contactId_idx" ON "growth_tasks"("contactId");

-- CreateIndex
CREATE UNIQUE INDEX "growth_funnel_steps_funnelId_sortOrder_key" ON "growth_funnel_steps"("funnelId", "sortOrder");

-- CreateIndex
CREATE INDEX "growth_funnel_steps_funnelId_idx" ON "growth_funnel_steps"("funnelId");

-- CreateIndex
CREATE INDEX "growth_qr_campaigns_vendorProfileId_isActive_idx" ON "growth_qr_campaigns"("vendorProfileId", "isActive");

-- CreateIndex
CREATE INDEX "growth_segments_vendorProfileId_idx" ON "growth_segments"("vendorProfileId");

-- CreateIndex
CREATE INDEX "growth_email_campaigns_vendorProfileId_status_idx" ON "growth_email_campaigns"("vendorProfileId", "status");

-- CreateIndex
CREATE INDEX "growth_email_sequences_vendorProfileId_isActive_idx" ON "growth_email_sequences"("vendorProfileId", "isActive");

-- CreateIndex
CREATE INDEX "growth_consultation_leads_vendorProfileId_stage_idx" ON "growth_consultation_leads"("vendorProfileId", "stage");

-- CreateIndex
CREATE INDEX "growth_consultation_leads_contactId_idx" ON "growth_consultation_leads"("contactId");

-- CreateIndex
CREATE INDEX "growth_consultation_leads_bookingId_idx" ON "growth_consultation_leads"("bookingId");

-- CreateIndex
CREATE INDEX "growth_marketing_events_vendorProfileId_eventType_occurredAt_idx" ON "growth_marketing_events"("vendorProfileId", "eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "growth_marketing_events_landingPageId_idx" ON "growth_marketing_events"("landingPageId");

-- CreateIndex
CREATE INDEX "growth_marketing_events_qrCampaignId_idx" ON "growth_marketing_events"("qrCampaignId");

-- AddForeignKey
ALTER TABLE "growth_funnels" ADD CONSTRAINT "growth_funnels_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_funnels" ADD CONSTRAINT "growth_funnels_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "growth_landing_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_landing_pages" ADD CONSTRAINT "growth_landing_pages_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_landing_pages" ADD CONSTRAINT "growth_landing_pages_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "growth_funnels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_contacts" ADD CONSTRAINT "growth_contacts_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_contacts" ADD CONSTRAINT "growth_contacts_rootSyncUserId_fkey" FOREIGN KEY ("rootSyncUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_contacts" ADD CONSTRAINT "growth_contacts_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "growth_funnels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_tags" ADD CONSTRAINT "growth_tags_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_contact_tags" ADD CONSTRAINT "growth_contact_tags_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "growth_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_contact_tags" ADD CONSTRAINT "growth_contact_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "growth_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_crm_notes" ADD CONSTRAINT "growth_crm_notes_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "growth_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_crm_notes" ADD CONSTRAINT "growth_crm_notes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_tasks" ADD CONSTRAINT "growth_tasks_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_tasks" ADD CONSTRAINT "growth_tasks_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "growth_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_funnel_steps" ADD CONSTRAINT "growth_funnel_steps_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "growth_funnels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_qr_campaigns" ADD CONSTRAINT "growth_qr_campaigns_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_qr_campaigns" ADD CONSTRAINT "growth_qr_campaigns_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "growth_landing_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_qr_campaigns" ADD CONSTRAINT "growth_qr_campaigns_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "growth_funnels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_segments" ADD CONSTRAINT "growth_segments_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_email_campaigns" ADD CONSTRAINT "growth_email_campaigns_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_email_campaigns" ADD CONSTRAINT "growth_email_campaigns_segmentId_fkey" FOREIGN KEY ("segmentId") REFERENCES "growth_segments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_email_sequences" ADD CONSTRAINT "growth_email_sequences_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_email_sequences" ADD CONSTRAINT "growth_email_sequences_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "growth_funnels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_consultation_leads" ADD CONSTRAINT "growth_consultation_leads_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_consultation_leads" ADD CONSTRAINT "growth_consultation_leads_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "growth_contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_consultation_leads" ADD CONSTRAINT "growth_consultation_leads_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_consultation_leads" ADD CONSTRAINT "growth_consultation_leads_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "growth_funnels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_marketing_events" ADD CONSTRAINT "growth_marketing_events_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_marketing_events" ADD CONSTRAINT "growth_marketing_events_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "growth_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_marketing_events" ADD CONSTRAINT "growth_marketing_events_rootSyncUserId_fkey" FOREIGN KEY ("rootSyncUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_marketing_events" ADD CONSTRAINT "growth_marketing_events_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "growth_funnels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_marketing_events" ADD CONSTRAINT "growth_marketing_events_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "growth_landing_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_marketing_events" ADD CONSTRAINT "growth_marketing_events_qrCampaignId_fkey" FOREIGN KEY ("qrCampaignId") REFERENCES "growth_qr_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "growth_marketing_events" ADD CONSTRAINT "growth_marketing_events_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "growth_email_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

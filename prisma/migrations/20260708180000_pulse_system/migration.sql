-- Pulse ecosystem tables (ADR-008)

CREATE TABLE "pulse_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "pulseValue" INTEGER NOT NULL,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pulse_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pulse_reactions" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "giverUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "pulse_reactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pulse_scores" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'EMERGING',
    "trend7d" INTEGER,
    "lastEventAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pulse_scores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pulse_score_weights" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "pulseValue" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "pulse_score_weights_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pulse_thresholds" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "minScore" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "pulse_thresholds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "platform_pulse_daily" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalPulseValue" INTEGER NOT NULL DEFAULT 0,
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "activeMemberCount" INTEGER NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_pulse_daily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public_dashboard_widgets" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "widgetType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "configJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "public_dashboard_widgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public_dashboard_announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "public_dashboard_announcements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pulse_reactions_postId_giverUserId_key" ON "pulse_reactions"("postId", "giverUserId");
CREATE INDEX "pulse_reactions_postId_idx" ON "pulse_reactions"("postId");
CREATE INDEX "pulse_events_userId_createdAt_idx" ON "pulse_events"("userId", "createdAt");
CREATE INDEX "pulse_events_eventType_createdAt_idx" ON "pulse_events"("eventType", "createdAt");
CREATE INDEX "pulse_events_relatedEntityType_relatedEntityId_idx" ON "pulse_events"("relatedEntityType", "relatedEntityId");
CREATE UNIQUE INDEX "pulse_scores_userId_key" ON "pulse_scores"("userId");
CREATE UNIQUE INDEX "pulse_score_weights_eventType_key" ON "pulse_score_weights"("eventType");
CREATE UNIQUE INDEX "pulse_thresholds_status_key" ON "pulse_thresholds"("status");
CREATE UNIQUE INDEX "platform_pulse_daily_date_key" ON "platform_pulse_daily"("date");
CREATE UNIQUE INDEX "public_dashboard_widgets_key_key" ON "public_dashboard_widgets"("key");

ALTER TABLE "pulse_events" ADD CONSTRAINT "pulse_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pulse_reactions" ADD CONSTRAINT "pulse_reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pulse_reactions" ADD CONSTRAINT "pulse_reactions_giverUserId_fkey" FOREIGN KEY ("giverUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pulse_scores" ADD CONSTRAINT "pulse_scores_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

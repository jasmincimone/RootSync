-- Pulse v2: categories, activity trend, platform weights/thresholds (Phase 3)

CREATE TABLE "pulse_categories" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "pulse_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "pulse_categories_key_key" ON "pulse_categories"("key");

ALTER TABLE "pulse_events" ADD COLUMN "categoryId" TEXT;
CREATE INDEX "pulse_events_categoryId_idx" ON "pulse_events"("categoryId");
ALTER TABLE "pulse_events" ADD CONSTRAINT "pulse_events_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "pulse_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pulse_scores" ADD COLUMN "activityTrend" TEXT;
ALTER TABLE "pulse_scores" ADD COLUMN "pulseThisWeek" INTEGER;

ALTER TABLE "pulse_score_weights" ADD COLUMN "categoryId" TEXT;
CREATE INDEX "pulse_score_weights_categoryId_idx" ON "pulse_score_weights"("categoryId");
ALTER TABLE "pulse_score_weights" ADD CONSTRAINT "pulse_score_weights_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "pulse_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "pulse_thresholds" ADD COLUMN "emoji" TEXT;

CREATE TABLE "platform_pulse_weights" (
    "id" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "platform_pulse_weights_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_pulse_weights_metricKey_key" ON "platform_pulse_weights"("metricKey");

CREATE TABLE "platform_pulse_thresholds" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "minValue" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "emoji" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "platform_pulse_thresholds_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "platform_pulse_thresholds_status_key" ON "platform_pulse_thresholds"("status");

CREATE TABLE "platform_pulse_snapshots" (
    "id" TEXT NOT NULL,
    "pulseValue" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "metricsJson" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "platform_pulse_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_pulse_snapshots_computedAt_idx" ON "platform_pulse_snapshots"("computedAt");

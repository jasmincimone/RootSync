import { DEFAULT_PUBLIC_DASHBOARD_WIDGETS } from "@/config/pulseTickerWidgets";
import {
  DEFAULT_PLATFORM_PULSE_THRESHOLDS,
  DEFAULT_PULSE_THRESHOLDS,
  DEFAULT_PULSE_WEIGHTS,
  LEGACY_PULSE_STATUS,
  type PulseEventType,
} from "@/lib/pulse/eventTypes";
import {
  DEFAULT_PULSE_CATEGORIES,
  EVENT_TYPE_CATEGORY,
} from "@/lib/pulse/categories";
import { prisma } from "@/lib/prisma";

let ensured = false;

const DEFAULT_PLATFORM_WEIGHTS: { metricKey: string; weight: number; description: string }[] = [
  { metricKey: "daily_active_members", weight: 120, description: "Members active today" },
  { metricKey: "new_members", weight: 200, description: "New members (rolling)" },
  { metricKey: "pulse_events", weight: 2, description: "Pulse events today" },
  { metricKey: "marketplace_activity", weight: 80, description: "Orders and bookings" },
  { metricKey: "messages_sent", weight: 0.5, description: "Stay Synced messages" },
  { metricKey: "consultations", weight: 100, description: "Completed consultations" },
  { metricKey: "vendor_activity", weight: 60, description: "Approved vendors + listings" },
  { metricKey: "ai_conversations", weight: 15, description: "RootSync AI conversations" },
];

async function seedCategories(): Promise<Map<string, string>> {
  const keyToId = new Map<string, string>();

  for (const cat of DEFAULT_PULSE_CATEGORIES) {
    const row = await prisma.pulseCategory.upsert({
      where: { key: cat.key },
      create: { key: cat.key, label: cat.label, sortOrder: cat.sortOrder, enabled: true },
      update: { label: cat.label, sortOrder: cat.sortOrder },
      select: { id: true, key: true },
    });
    keyToId.set(row.key, row.id);
  }

  return keyToId;
}

async function seedEventWeights(categoryIds: Map<string, string>): Promise<void> {
  for (const [eventType, pulseValue] of Object.entries(DEFAULT_PULSE_WEIGHTS) as [
    PulseEventType,
    number,
  ][]) {
    const categoryKey = EVENT_TYPE_CATEGORY[eventType];
    const categoryId = categoryIds.get(categoryKey) ?? null;

    await prisma.pulseScoreWeight.upsert({
      where: { eventType },
      create: {
        eventType,
        pulseValue,
        enabled: true,
        description: eventType.replace(/_/g, " ").toLowerCase(),
        categoryId,
      },
      update: {
        pulseValue,
        categoryId,
      },
    });
  }
}

async function upgradeIndividualThresholds(): Promise<void> {
  const existing = await prisma.pulseThreshold.findMany({ select: { status: true } });
  const hasV1 =
    existing.some((t) => t.status === LEGACY_PULSE_STATUS.STEADY) ||
    existing.some((t) => t.status === LEGACY_PULSE_STATUS.STRONG);
  const needsV2 = existing.length < DEFAULT_PULSE_THRESHOLDS.length || hasV1;

  if (!needsV2) return;

  if (hasV1 || existing.length > 0) {
    await prisma.pulseThreshold.deleteMany({
      where: {
        status: { in: [LEGACY_PULSE_STATUS.STEADY, LEGACY_PULSE_STATUS.STRONG] },
      },
    });
  }

  for (const [i, t] of DEFAULT_PULSE_THRESHOLDS.entries()) {
    await prisma.pulseThreshold.upsert({
      where: { status: t.status },
      create: {
        status: t.status,
        minScore: t.minScore,
        label: t.label,
        emoji: t.emoji ?? null,
        sortOrder: i,
      },
      update: {
        minScore: t.minScore,
        label: t.label,
        emoji: t.emoji ?? null,
        sortOrder: i,
      },
    });
  }
}

async function seedPublicDashboardWidgets(): Promise<void> {
  const count = await prisma.publicDashboardWidget.count();
  if (count > 0) return;

  await prisma.publicDashboardWidget.createMany({
    data: DEFAULT_PUBLIC_DASHBOARD_WIDGETS.map((w) => ({
      key: w.key,
      label: w.label,
      widgetType: w.widgetType,
      enabled: true,
      sortOrder: w.sortOrder,
      configJson: "configJson" in w ? (w.configJson ?? undefined) : undefined,
    })),
  });
}

async function seedPlatformConfig(): Promise<void> {
  const platformWeightCount = await prisma.platformPulseWeight.count();
  if (platformWeightCount === 0) {
    await prisma.platformPulseWeight.createMany({
      data: DEFAULT_PLATFORM_WEIGHTS.map((w) => ({
        metricKey: w.metricKey,
        weight: w.weight,
        enabled: true,
        description: w.description,
        updatedAt: new Date(),
      })),
    });
  }

  const platformThresholdCount = await prisma.platformPulseThreshold.count();
  if (platformThresholdCount === 0) {
    await prisma.platformPulseThreshold.createMany({
      data: DEFAULT_PLATFORM_PULSE_THRESHOLDS.map((t, i) => ({
        status: t.status,
        minValue: t.minValue,
        label: t.label,
        emoji: t.emoji ?? null,
        sortOrder: i,
      })),
    });
  }
}

/** Upsert Pulse categories, weights, thresholds, and platform config (idempotent). */
export async function ensurePulseConfig(): Promise<void> {
  if (ensured) return;
  try {
    const categoryIds = await seedCategories();
    await seedEventWeights(categoryIds);
    await upgradeIndividualThresholds();
    await seedPlatformConfig();
    await seedPublicDashboardWidgets();
    ensured = true;
  } catch {
    // Tables may not exist yet in dev — defaults in code still apply
  }
}

/** Resolve category id for an event type (after ensurePulseConfig). */
export async function resolveCategoryIdForEventType(
  eventType: PulseEventType,
): Promise<string | null> {
  const weight = await prisma.pulseScoreWeight.findUnique({
    where: { eventType },
    select: { categoryId: true },
  });
  if (weight?.categoryId) return weight.categoryId;

  const categoryKey = EVENT_TYPE_CATEGORY[eventType];
  const category = await prisma.pulseCategory.findUnique({
    where: { key: categoryKey },
    select: { id: true },
  });
  return category?.id ?? null;
}

/** Reset in-memory guard (tests / after schema reload). */
export function resetPulseConfigCache(): void {
  ensured = false;
}

import {
  DEFAULT_PLATFORM_PULSE_THRESHOLDS,
  PLATFORM_PULSE_MAX,
  type PlatformPulseStatus,
  type PlatformPulseThresholdRow,
} from "@/lib/pulse/eventTypes";
import { ensurePulseConfig } from "@/lib/pulse/ensureConfig";
import { loadPlatformDashboardMetrics } from "@/lib/pulse/platformMetrics";
import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/roles";

export type PlatformPulseSnapshot = {
  pulseValue: number;
  status: PlatformPulseStatus;
  label: string;
  metricsJson: Record<string, number>;
};

let cachedPlatformThresholds: PlatformPulseThresholdRow[] | null = null;

async function loadPlatformThresholds(): Promise<PlatformPulseThresholdRow[]> {
  if (cachedPlatformThresholds) return cachedPlatformThresholds;
  await ensurePulseConfig();
  try {
    const rows = await prisma.platformPulseThreshold.findMany({
      orderBy: { sortOrder: "asc" },
      select: { status: true, minValue: true, label: true, emoji: true },
    });
    if (rows.length > 0) {
      cachedPlatformThresholds = rows.map((r) => ({
        status: r.status as PlatformPulseStatus,
        minValue: r.minValue,
        label: r.label,
        emoji: r.emoji ?? undefined,
      }));
      return cachedPlatformThresholds;
    }
  } catch {
    // fall through
  }
  return DEFAULT_PLATFORM_PULSE_THRESHOLDS;
}

export function platformStatusForValue(
  value: number,
  thresholds: PlatformPulseThresholdRow[] = DEFAULT_PLATFORM_PULSE_THRESHOLDS,
): PlatformPulseStatus {
  let best = thresholds[0];
  for (const t of thresholds) {
    if (value >= t.minValue) best = t;
  }
  return best.status;
}

export function platformStatusLabelSync(
  status: PlatformPulseStatus | string,
  thresholds: PlatformPulseThresholdRow[] = DEFAULT_PLATFORM_PULSE_THRESHOLDS,
): string {
  const row = thresholds.find((t) => t.status === status);
  if (row) return row.emoji ? `${row.emoji} ${row.label}` : row.label;
  return "Awakening";
}

/** Weighted Platform Pulse index (0 – 1,000,000). */
export async function computePlatformPulseSnapshot(): Promise<PlatformPulseSnapshot> {
  await ensurePulseConfig();

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [metrics, weights, thresholds, newMembersToday, consultationsCompleted] = await Promise.all([
    loadPlatformDashboardMetrics(),
    prisma.platformPulseWeight.findMany({ where: { enabled: true } }),
    loadPlatformThresholds(),
    prisma.user.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.booking.count({ where: { status: BOOKING_STATUS.COMPLETED } }),
  ]);

  const weightMap = new Map(weights.map((w) => [w.metricKey, w.weight]));

  const inputMetrics: Record<string, number> = {
    daily_active_members: metrics.activeMembersToday,
    new_members: newMembersToday,
    pulse_events: metrics.pulsesToday,
    marketplace_activity: metrics.platformPulseToday,
    messages_sent: metrics.messagesSent,
    consultations: consultationsCompleted,
    vendor_activity: metrics.vendorsConnected + metrics.productsListed,
    ai_conversations: metrics.aiConversations,
  };

  let raw = 0;
  for (const [key, value] of Object.entries(inputMetrics)) {
    const weight = weightMap.get(key) ?? 0;
    raw += value * weight;
  }

  const pulseValue = Math.min(PLATFORM_PULSE_MAX, Math.max(0, Math.round(raw)));
  const status = platformStatusForValue(pulseValue, thresholds);
  const label = platformStatusLabelSync(status, thresholds);

  return { pulseValue, status, label, metricsJson: inputMetrics };
}

/** Persist latest snapshot and return it. */
export async function refreshPlatformPulseSnapshot(): Promise<PlatformPulseSnapshot> {
  const snapshot = await computePlatformPulseSnapshot();

  await prisma.platformPulseSnapshot.create({
    data: {
      pulseValue: snapshot.pulseValue,
      status: snapshot.status,
      metricsJson: snapshot.metricsJson,
    },
  });

  return snapshot;
}

/** Read latest snapshot or compute fresh if none exists. */
export async function loadLatestPlatformPulseSnapshot(): Promise<PlatformPulseSnapshot> {
  try {
    const latest = await prisma.platformPulseSnapshot.findFirst({
      orderBy: { computedAt: "desc" },
    });

    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    if (latest && latest.computedAt >= oneHourAgo) {
      const thresholds = await loadPlatformThresholds();
      return {
        pulseValue: latest.pulseValue,
        status: latest.status as PlatformPulseStatus,
        label: platformStatusLabelSync(latest.status, thresholds),
        metricsJson: (latest.metricsJson as Record<string, number>) ?? {},
      };
    }
  } catch {
    // compute fresh
  }

  return refreshPlatformPulseSnapshot();
}

export function clearPlatformPulseCache(): void {
  cachedPlatformThresholds = null;
}

import { computeActivityTrend } from "@/lib/pulse/activityTrend";
import {
  DEFAULT_PULSE_THRESHOLDS,
  LEGACY_PULSE_STATUS,
  type PulseEventType,
  type PulseStatus,
  type PulseThresholdRow,
} from "@/lib/pulse/eventTypes";
import { ensurePulseConfig } from "@/lib/pulse/ensureConfig";
import { prisma } from "@/lib/prisma";

const LEGACY_STATUSES = new Set<string>([
  LEGACY_PULSE_STATUS.STEADY,
  LEGACY_PULSE_STATUS.STRONG,
]);

let cachedThresholds: PulseThresholdRow[] | null = null;

export async function loadPulseThresholds(): Promise<PulseThresholdRow[]> {
  if (cachedThresholds) return cachedThresholds;
  await ensurePulseConfig();
  try {
    const rows = await prisma.pulseThreshold.findMany({
      orderBy: { sortOrder: "asc" },
      select: { status: true, minScore: true, label: true, emoji: true },
    });
    if (rows.length > 0) {
      cachedThresholds = rows.map((r) => ({
        status: r.status as PulseStatus,
        minScore: r.minScore,
        label: r.label,
        emoji: r.emoji ?? undefined,
      }));
      return cachedThresholds;
    }
  } catch {
    // fall through
  }
  return DEFAULT_PULSE_THRESHOLDS;
}

export function pulseStatusForScore(
  totalScore: number,
  thresholds: PulseThresholdRow[] = DEFAULT_PULSE_THRESHOLDS,
): PulseStatus {
  let best = thresholds[0];
  for (const t of thresholds) {
    if (totalScore >= t.minScore) best = t;
  }
  return best.status;
}

export async function pulseStatusLabel(status: PulseStatus | string): Promise<string> {
  const thresholds = await loadPulseThresholds();
  const row = thresholds.find((t) => t.status === status);
  if (row) {
    return row.emoji ? `${row.emoji} ${row.label}` : row.label;
  }
  return "Emerging";
}

export function pulseStatusLabelSync(
  status: PulseStatus | string,
  thresholds: PulseThresholdRow[] = DEFAULT_PULSE_THRESHOLDS,
): string {
  const row = thresholds.find((t) => t.status === status);
  if (row) {
    return row.emoji ? `${row.emoji} ${row.label}` : row.label;
  }
  return "Emerging";
}

export async function getPulseWeight(eventType: PulseEventType): Promise<number> {
  await ensurePulseConfig();
  const row = await prisma.pulseScoreWeight.findUnique({ where: { eventType } });
  if (row?.enabled) return row.pulseValue;
  return 1;
}

export function isLegacyPulseStatus(status: string): boolean {
  return LEGACY_STATUSES.has(status);
}

export async function recalculatePulseScore(userId: string): Promise<void> {
  await ensurePulseConfig();

  const [events, thresholds] = await Promise.all([
    prisma.pulseEvent.findMany({
      where: { userId },
      select: { pulseValue: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    loadPulseThresholds(),
  ]);

  const totalScore = events.reduce((sum, e) => sum + e.pulseValue, 0);
  const status = pulseStatusForScore(totalScore, thresholds);
  const lastEventAt = events.length > 0 ? events[events.length - 1].createdAt : null;
  const { trend: activityTrend, pulseThisWeek } = computeActivityTrend(events);

  await prisma.pulseScore.upsert({
    where: { userId },
    create: {
      userId,
      totalScore,
      status,
      activityTrend,
      pulseThisWeek,
      lastEventAt,
    },
    update: {
      totalScore,
      status,
      activityTrend,
      pulseThisWeek,
      lastEventAt,
    },
  });
}

/** Progress toward next tier (0–100) for meter UI. */
export function pulseTierProgress(
  totalScore: number,
  status: PulseStatus | string,
  thresholds: PulseThresholdRow[] = DEFAULT_PULSE_THRESHOLDS,
): number {
  const sorted = [...thresholds].sort((a, b) => a.minScore - b.minScore);
  const currentIdx = sorted.findIndex((t) => t.status === status);
  const current = sorted[Math.max(0, currentIdx)];
  const next = sorted[currentIdx + 1];

  if (!next) return 100;

  const range = next.minScore - current.minScore;
  if (range <= 0) return 100;

  return Math.min(100, Math.max(0, Math.round(((totalScore - current.minScore) / range) * 100)));
}

export function clearPulseThresholdCache(): void {
  cachedThresholds = null;
}

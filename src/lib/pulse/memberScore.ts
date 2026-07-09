import {
  ACTIVITY_TREND,
  PULSE_STATUS,
  type ActivityTrend,
  type PulseStatus,
} from "@/lib/pulse/eventTypes";
import { activityTrendLabel } from "@/lib/pulse/activityTrend";
import { backfillMemberPulseHistory } from "@/lib/pulse/backfill";
import {
  isLegacyPulseStatus,
  loadPulseThresholds,
  pulseStatusLabelSync,
  pulseTierProgress,
  recalculatePulseScore,
} from "@/lib/pulse/score";
import { prisma } from "@/lib/prisma";

export type MemberPulseSummary = {
  totalScore: number;
  status: PulseStatus;
  statusLabel: string;
  activityTrend: ActivityTrend | null;
  activityTrendLabel: string | null;
  pulseThisWeek: number | null;
  tierProgress: number;
};

const EMPTY_PULSE: MemberPulseSummary = {
  totalScore: 0,
  status: PULSE_STATUS.EMERGING,
  statusLabel: "🌱 Emerging",
  activityTrend: null,
  activityTrendLabel: null,
  pulseThisWeek: null,
  tierProgress: 0,
};

/** Load a member's Pulse Score — backfills historical activity, then reads the ledger. */
export async function loadMemberPulseScore(userId: string): Promise<MemberPulseSummary> {
  try {
    await backfillMemberPulseHistory(userId);

    let row = await prisma.pulseScore.findUnique({ where: { userId } });
    if (!row) {
      const eventCount = await prisma.pulseEvent.count({ where: { userId } });
      if (eventCount > 0) {
        await recalculatePulseScore(userId);
        row = await prisma.pulseScore.findUnique({ where: { userId } });
      }
    } else if (isLegacyPulseStatus(row.status)) {
      await recalculatePulseScore(userId);
      row = await prisma.pulseScore.findUnique({ where: { userId } });
    }

    if (!row) return EMPTY_PULSE;

    const thresholds = await loadPulseThresholds();
    const status = (row.status as PulseStatus) ?? PULSE_STATUS.EMERGING;
    const activityTrend = (row.activityTrend as ActivityTrend | null) ?? null;

    return {
      totalScore: row.totalScore,
      status,
      statusLabel: pulseStatusLabelSync(status, thresholds),
      activityTrend,
      activityTrendLabel: activityTrend ? activityTrendLabel(activityTrend) : null,
      pulseThisWeek: row.pulseThisWeek,
      tierProgress: pulseTierProgress(row.totalScore, status, thresholds),
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[pulse] loadMemberPulseScore failed:", error);
    }
    return EMPTY_PULSE;
  }
}

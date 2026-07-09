import { ACTIVITY_TREND, type ActivityTrend } from "@/lib/pulse/eventTypes";

type PulseEventSlice = {
  pulseValue: number;
  createdAt: Date;
};

export type ActivityTrendResult = {
  trend: ActivityTrend;
  pulseThisWeek: number;
};

/** Compute Activity Trend from event history — separate from lifetime score. */
export function computeActivityTrend(events: PulseEventSlice[]): ActivityTrendResult {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const pulseThisWeek = events
    .filter((e) => e.createdAt >= sevenDaysAgo)
    .reduce((sum, e) => sum + e.pulseValue, 0);

  const pulsePriorWeek = events
    .filter((e) => e.createdAt >= fourteenDaysAgo && e.createdAt < sevenDaysAgo)
    .reduce((sum, e) => sum + e.pulseValue, 0);

  const hasRecent30d = events.some((e) => e.createdAt >= thirtyDaysAgo);
  const hadActivityBeforePriorWeek = events.some((e) => e.createdAt < fourteenDaysAgo);

  if (!hasRecent30d) {
    return { trend: ACTIVITY_TREND.QUIET, pulseThisWeek };
  }

  if (pulseThisWeek > pulsePriorWeek) {
    return { trend: ACTIVITY_TREND.INCREASING, pulseThisWeek };
  }

  if (pulseThisWeek > 0 && pulsePriorWeek === 0 && hadActivityBeforePriorWeek) {
    return { trend: ACTIVITY_TREND.RETURNING, pulseThisWeek };
  }

  return { trend: ACTIVITY_TREND.STABLE, pulseThisWeek };
}

export function activityTrendLabel(trend: ActivityTrend): string {
  switch (trend) {
    case ACTIVITY_TREND.INCREASING:
      return "Increasing";
    case ACTIVITY_TREND.RETURNING:
      return "Returning";
    case ACTIVITY_TREND.QUIET:
      return "Quiet";
    default:
      return "Stable";
  }
}

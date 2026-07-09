import { pulseEventLabel } from "@/lib/pulse/eventLabels";
import { backfillMemberPulseHistory } from "@/lib/pulse/backfill";
import { prisma } from "@/lib/prisma";

export type PulseRecentEvent = {
  id: string;
  label: string;
  pulseValue: number;
  categoryLabel: string;
  createdAt: string;
};

export type PulseCategoryBreakdown = {
  key: string;
  label: string;
  totalPulse: number;
  percent: number;
};

export type PulseWeeklyBucket = {
  weekLabel: string;
  pulseValue: number;
};

export type PulseWorkspaceData = {
  recentEvents: PulseRecentEvent[];
  categoryBreakdown: PulseCategoryBreakdown[];
  weeklyHistory: PulseWeeklyBucket[];
};

const RECENT_LIMIT = 12;
const WEEKS_OF_HISTORY = 8;

function startOfUtcWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function buildWeeklyHistory(
  events: { pulseValue: number; createdAt: Date }[],
): PulseWeeklyBucket[] {
  const now = new Date();
  const buckets: PulseWeeklyBucket[] = [];

  for (let i = WEEKS_OF_HISTORY - 1; i >= 0; i--) {
    const weekStart = startOfUtcWeek(now);
    weekStart.setUTCDate(weekStart.getUTCDate() - i * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const pulseValue = events
      .filter((e) => e.createdAt >= weekStart && e.createdAt < weekEnd)
      .reduce((sum, e) => sum + e.pulseValue, 0);

    const weekLabel = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    buckets.push({ weekLabel, pulseValue });
  }

  return buckets;
}

/** Load recent events, category breakdown, and weekly history for workspace panels. */
export async function loadPulseWorkspace(userId: string): Promise<PulseWorkspaceData> {
  try {
    await backfillMemberPulseHistory(userId);

    const [recentRows, allEventsForHistory, grouped] = await Promise.all([
      prisma.pulseEvent.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: RECENT_LIMIT,
        select: {
          id: true,
          eventType: true,
          pulseValue: true,
          metadataJson: true,
          createdAt: true,
          category: { select: { key: true, label: true } },
        },
      }),
      prisma.pulseEvent.findMany({
        where: {
          userId,
          createdAt: {
            gte: (() => {
              const d = startOfUtcWeek(new Date());
              d.setUTCDate(d.getUTCDate() - (WEEKS_OF_HISTORY - 1) * 7);
              return d;
            })(),
          },
        },
        select: { pulseValue: true, createdAt: true },
      }),
      prisma.pulseEvent.groupBy({
        by: ["categoryId"],
        where: { userId },
        _sum: { pulseValue: true },
      }),
    ]);

    const categoryIds = grouped
      .map((g) => g.categoryId)
      .filter((id): id is string => Boolean(id));
    const categories =
      categoryIds.length > 0
        ? await prisma.pulseCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, key: true, label: true, sortOrder: true },
          })
        : [];
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const uncategorizedPulse = grouped
      .filter((g) => !g.categoryId)
      .reduce((sum, g) => sum + (g._sum.pulseValue ?? 0), 0);

    const breakdownRows = grouped
      .filter((g) => g.categoryId)
      .map((g) => {
        const cat = categoryById.get(g.categoryId!);
        return {
          key: cat?.key ?? "OTHER",
          label: cat?.label ?? "Other",
          sortOrder: cat?.sortOrder ?? 99,
          totalPulse: g._sum.pulseValue ?? 0,
        };
      })
      .sort((a, b) => b.totalPulse - a.totalPulse || a.sortOrder - b.sortOrder);

    if (uncategorizedPulse > 0) {
      breakdownRows.push({
        key: "OTHER",
        label: "Other",
        sortOrder: 99,
        totalPulse: uncategorizedPulse,
      });
    }

    const breakdownTotal = breakdownRows.reduce((sum, row) => sum + row.totalPulse, 0);

    return {
      recentEvents: recentRows.map((e) => ({
        id: e.id,
        label: pulseEventLabel(
          e.eventType,
          e.metadataJson as Record<string, unknown> | null,
        ),
        pulseValue: e.pulseValue,
        categoryLabel: e.category?.label ?? "Other",
        createdAt: e.createdAt.toISOString(),
      })),
      categoryBreakdown: breakdownRows.map((row) => ({
        key: row.key,
        label: row.label,
        totalPulse: row.totalPulse,
        percent: breakdownTotal > 0 ? Math.round((row.totalPulse / breakdownTotal) * 100) : 0,
      })),
      weeklyHistory: buildWeeklyHistory(allEventsForHistory),
    };
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.error("[pulse] loadPulseWorkspace failed:", e);
    }
    return { recentEvents: [], categoryBreakdown: [], weeklyHistory: [] };
  }
}

import { DEFAULT_PUBLIC_DASHBOARD_WIDGETS } from "@/config/pulseTickerWidgets";
import { ensurePulseConfig } from "@/lib/pulse/ensureConfig";
import { loadMemberPulseScore } from "@/lib/pulse/memberScore";
import { loadPlatformDashboardMetrics } from "@/lib/pulse/platformMetrics";
import { loadLatestPlatformPulseSnapshot } from "@/lib/pulse/platformPulse";
import { prisma } from "@/lib/prisma";

export type TickerItem = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  detail?: string;
  href?: string;
  highlight?: boolean;
  scope: "platform" | "personal";
};

export type DashboardWidgetRow = {
  id: string;
  key: string;
  label: string;
  widgetType: string;
  enabled: boolean;
  sortOrder: number;
};

type WidgetConfig = {
  target?: number;
};

async function loadEnabledWidgets(): Promise<DashboardWidgetRow[]> {
  await ensurePulseConfig();
  try {
    const rows = await prisma.publicDashboardWidget.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        key: true,
        label: true,
        widgetType: true,
        enabled: true,
        sortOrder: true,
      },
    });
    if (rows.length > 0) return rows;
  } catch {
    // tables may not exist
  }

  return DEFAULT_PUBLIC_DASHBOARD_WIDGETS.map((w, i) => ({
    id: w.key,
    key: w.key,
    label: w.label,
    widgetType: w.widgetType,
    enabled: true,
    sortOrder: i,
  }));
}

function resolvePlatformTickerItem(
  key: string,
  label: string,
  widgetType: string,
  metrics: Awaited<ReturnType<typeof loadPlatformDashboardMetrics>>,
  platformSnapshot: Awaited<ReturnType<typeof loadLatestPlatformPulseSnapshot>>,
  config?: WidgetConfig | null,
): TickerItem | null {
  const fmt = (n: number) => n.toLocaleString();

  switch (key) {
    case "platform_pulse":
      return {
        key,
        label,
        value: fmt(platformSnapshot.pulseValue),
        sub: platformSnapshot.label,
        detail: `Weighted ecosystem health index — ${platformSnapshot.label}`,
        href: "/rootsync/dashboard",
        highlight: true,
        scope: "platform",
      };
    case "members_synced": {
      const target = config?.target ?? metrics.membersMilestone;
      const pct = Math.min(100, Math.round((metrics.membersSynced / target) * 100));
      return {
        key,
        label,
        value: fmt(metrics.membersSynced),
        sub: `${pct}% to ${fmt(target)}`,
        detail: `Journey to ${fmt(target)} Members Synced — every connection strengthens the ecosystem.`,
        href: "/rootsync/dashboard",
        highlight: widgetType === "milestone",
        scope: "platform",
      };
    }
    case "pulses_today":
      return {
        key,
        label,
        value: fmt(metrics.pulsesToday),
        sub: `${fmt(metrics.platformPulseToday)} Pulse value`,
        detail: "Pulse events recorded across the platform today.",
        href: "/rootsync/dashboard",
        scope: "platform",
      };
    case "active_today":
      return {
        key,
        label,
        value: fmt(metrics.activeMembersToday),
        sub: "members active",
        detail: "Members who contributed Pulse activity today.",
        href: "/rootsync/dashboard",
        scope: "platform",
      };
    case "vendors_connected":
      return {
        key,
        label,
        value: fmt(metrics.vendorsConnected),
        sub: "approved vendors",
        detail: "Local vendors connected on Discover.",
        href: "/rootsync/dashboard",
        scope: "platform",
      };
    case "products_listed":
      return {
        key,
        label,
        value: fmt(metrics.productsListed),
        sub: "listings live",
        detail: "Products, services, resources, and events on Discover.",
        href: "/rootsync/dashboard",
        scope: "platform",
      };
    case "messages_sent":
      return {
        key,
        label,
        value: fmt(metrics.messagesSent),
        sub: "messages",
        detail: "Stay Synced conversations across the platform.",
        href: "/rootsync/dashboard",
        scope: "platform",
      };
    case "ai_conversations":
      return {
        key,
        label,
        value: fmt(metrics.aiConversations),
        sub: "AI chats",
        detail: "RootSync AI conversations helping members grow.",
        href: "/rootsync/dashboard",
        scope: "platform",
      };
    default:
      return null;
  }
}

/** Live platform metrics formatted for the ticker strip. */
export async function loadPlatformTickerItems(): Promise<TickerItem[]> {
  const [widgets, metrics, platformSnapshot] = await Promise.all([
    loadEnabledWidgets(),
    loadPlatformDashboardMetrics(),
    loadLatestPlatformPulseSnapshot(),
  ]);

  const configByKey = new Map<string, WidgetConfig>();
  try {
    const configs = await prisma.publicDashboardWidget.findMany({
      select: { key: true, configJson: true },
    });
    for (const row of configs) {
      configByKey.set(row.key, (row.configJson as WidgetConfig) ?? {});
    }
  } catch {
    for (const w of DEFAULT_PUBLIC_DASHBOARD_WIDGETS) {
      if ("configJson" in w && w.configJson) {
        configByKey.set(w.key, w.configJson as WidgetConfig);
      }
    }
  }

  const items: TickerItem[] = [];
  for (const widget of widgets) {
    const item = resolvePlatformTickerItem(
      widget.key,
      widget.label,
      widget.widgetType,
      metrics,
      platformSnapshot,
      configByKey.get(widget.key),
    );
    if (item) items.push(item);
  }

  return items;
}

/** Signed-in member pulse summary for the account ticker strip. */
export async function loadPersonalTickerItems(userId: string): Promise<TickerItem[]> {
  const pulse = await loadMemberPulseScore(userId);

  const weeklySub =
    pulse.pulseThisWeek == null
      ? undefined
      : pulse.pulseThisWeek === 0
        ? "No Pulse this week"
        : `+${pulse.pulseThisWeek} this week`;

  return [
    {
      key: "member_pulse",
      label: "Your Pulse",
      value: pulse.totalScore.toLocaleString(),
      sub: pulse.statusLabel,
      detail: "Your cumulative Pulse — every meaningful action strengthens you and the ecosystem.",
      href: "/account",
      highlight: true,
      scope: "personal",
    },
    {
      key: "pulse_weekly",
      label: "This Week",
      value: pulse.pulseThisWeek == null ? "—" : `+${pulse.pulseThisWeek}`,
      sub: weeklySub,
      detail: "Pulse earned in the last 7 days.",
      href: "/account/pulses",
      scope: "personal",
    },
    {
      key: "activity_trend",
      label: "Activity",
      value: pulse.activityTrendLabel ?? "Quiet",
      sub: pulse.activityTrend ? "trend" : undefined,
      detail: "How your recent activity compares to the prior week.",
      href: "/account/activity",
      scope: "personal",
    },
  ];
}

/** All widget rows for admin CMS (enabled + disabled). */
export async function loadAllDashboardWidgets(): Promise<DashboardWidgetRow[]> {
  await ensurePulseConfig();
  try {
    const rows = await prisma.publicDashboardWidget.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        key: true,
        label: true,
        widgetType: true,
        enabled: true,
        sortOrder: true,
      },
    });
    if (rows.length > 0) return rows;
  } catch {
    // fall through
  }

  return DEFAULT_PUBLIC_DASHBOARD_WIDGETS.map((w, i) => ({
    id: w.key,
    key: w.key,
    label: w.label,
    widgetType: w.widgetType,
    enabled: true,
    sortOrder: i,
  }));
}

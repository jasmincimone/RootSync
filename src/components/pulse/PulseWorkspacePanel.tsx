import Link from "next/link";

import { GrowthSparkline } from "@/components/growth/GrowthSparkline";
import { PulseIcon } from "@/components/pulse/PulseIcon";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatPulseRelativeTime } from "@/lib/pulse/eventLabels";
import type { MemberPulseSummary } from "@/lib/pulse/memberScore";
import type { PulseWorkspaceData } from "@/lib/pulse/workspace";
import { cn } from "@/lib/cn";

type Props = {
  data: PulseWorkspaceData;
  /** Compact score row for surfaces without PulseMeter above (e.g. Growth). */
  summary?: MemberPulseSummary | null;
  className?: string;
};

export function PulseWorkspacePanel({ data, summary, className }: Props) {
  const { recentEvents, categoryBreakdown, weeklyHistory } = data;
  const hasActivity = recentEvents.length > 0 || categoryBreakdown.length > 0;
  const weeklyValues = weeklyHistory.map((w) => w.pulseValue);
  const weeklyTotal = weeklyValues.reduce((sum, v) => sum + v, 0);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fix-heading">Your contribution</h3>
        <Link
          href="/pulse"
          className="text-xs font-medium text-fix-link hover:text-fix-link-hover"
        >
          Open Pulse feed →
        </Link>
      </div>

      {summary ? (
        <Card className="flex flex-wrap items-center gap-4 border-forest/20 bg-fix-bg-muted/20 p-4 shadow-soft">
          <PulseIcon size={28} alt="" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
              Your Pulse
            </p>
            <p className="text-lg font-semibold text-fix-heading">
              {summary.totalScore}{" "}
              <span className="text-sm font-medium text-fix-text-muted">
                · {summary.statusLabel}
              </span>
            </p>
          </div>
          {summary.pulseThisWeek != null ? (
            <span className="rounded-full bg-amber/15 px-2.5 py-1 text-xs font-medium text-espresso">
              +{summary.pulseThisWeek} this week
            </span>
          ) : null}
          {summary.activityTrendLabel ? (
            <span className="rounded-full bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest">
              {summary.activityTrendLabel}
            </span>
          ) : null}
        </Card>
      ) : null}

      {!hasActivity ? (
        <EmptyState
          bordered
          title="No Pulse events yet"
          description="Publish a Pulse, connect with vendors, or complete a booking — meaningful actions appear here."
          action={{ href: "/pulse", label: "Share a Pulse", variant: "cta" }}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5 shadow-soft">
            <h4 className="text-sm font-semibold text-fix-heading">Recent Pulse events</h4>
            <p className="mt-1 text-xs text-fix-text-muted">Your latest contributions to RootSync.</p>
            <ul className="mt-4 space-y-2">
              {recentEvents.map((event) => (
                <li
                  key={event.id}
                  className="flex items-start gap-3 rounded-xl border border-fix-border/10 bg-fix-bg-muted/25 px-3 py-2.5"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber/15">
                    <PulseIcon size={14} alt="" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fix-heading">{event.label}</p>
                    <p className="mt-0.5 text-xs text-fix-text-muted">
                      {event.categoryLabel} · +{event.pulseValue} Pulse
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-fix-text-muted">
                    {formatPulseRelativeTime(new Date(event.createdAt))}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5 shadow-soft">
            <h4 className="text-sm font-semibold text-fix-heading">Contribution breakdown</h4>
            <p className="mt-1 text-xs text-fix-text-muted">Where your Pulse comes from.</p>
            {categoryBreakdown.length === 0 ? (
              <p className="mt-6 text-sm text-fix-text-muted">Categories appear as you contribute.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {categoryBreakdown.map((row) => (
                  <li key={row.key}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-fix-heading">{row.label}</span>
                      <span className="text-fix-text-muted">
                        {row.totalPulse} · {row.percent}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fix-bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber to-forest transition-all"
                        style={{ width: `${Math.max(row.percent, 4)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      )}

      {weeklyTotal > 0 ? (
        <Card className="p-5 shadow-soft">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-fix-heading">Pulse history</h4>
              <p className="mt-1 text-xs text-fix-text-muted">Last {weeklyHistory.length} weeks</p>
            </div>
            <p className="text-sm font-medium text-fix-heading">+{weeklyTotal} total</p>
          </div>
          <div className="mt-4">
            <GrowthSparkline values={weeklyValues} strokeClassName="stroke-terracotta" />
          </div>
          <div className="mt-2 flex justify-between text-[10px] text-fix-text-muted">
            <span>{weeklyHistory[0]?.weekLabel}</span>
            <span>{weeklyHistory[weeklyHistory.length - 1]?.weekLabel}</span>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

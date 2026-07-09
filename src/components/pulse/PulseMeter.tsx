"use client";

import { PulseIcon } from "@/components/pulse/PulseIcon";
import { PulseStatusLink } from "@/components/pulse/PulseStatusGuide";
import { Card } from "@/components/ui/Card";
import type { ActivityTrend, PulseStatus } from "@/lib/pulse/eventTypes";
import { cn } from "@/lib/cn";

type Props = {
  totalScore: number;
  status: PulseStatus;
  statusLabel: string;
  activityTrend?: ActivityTrend | null;
  activityTrendLabel?: string | null;
  pulseThisWeek?: number | null;
  tierProgress?: number;
  className?: string;
};

export function PulseMeter({
  totalScore,
  status,
  statusLabel,
  activityTrend,
  activityTrendLabel,
  pulseThisWeek,
  tierProgress = 0,
  className,
}: Props) {
  const weeklyLabel =
    pulseThisWeek == null
      ? null
      : pulseThisWeek === 0
        ? "No Pulse this week"
        : `+${pulseThisWeek} this week`;

  return (
    <Card className={cn("p-5 shadow-soft", className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <PulseIcon size={36} alt="Pulse" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
              Your Pulse
            </p>
            <p className="text-2xl font-semibold text-fix-heading">{totalScore}</p>
            <PulseStatusLink scope="member" currentStatus={status} className="text-sm text-fix-text-muted">
              {statusLabel}
            </PulseStatusLink>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {weeklyLabel ? (
            <span className="rounded-full bg-amber/15 px-2.5 py-1 text-xs font-medium text-espresso">
              {weeklyLabel}
            </span>
          ) : null}
          {activityTrend && activityTrendLabel ? (
            <span className="rounded-full bg-forest/10 px-2.5 py-1 text-xs font-medium text-forest">
              {activityTrendLabel}
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-fix-bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber via-terracotta to-forest transition-all"
          style={{ width: `${Math.max(8, tierProgress)}%` }}
          role="progressbar"
          aria-valuenow={totalScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${statusLabel} — ${tierProgress}% toward next tier`}
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-fix-text-muted">
        Every meaningful action strengthens your Pulse and the ecosystem — create Pulses, connect with
        vendors, and contribute to your community.
      </p>
    </Card>
  );
}

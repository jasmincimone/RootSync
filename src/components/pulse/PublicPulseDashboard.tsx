import { PulseIcon } from "@/components/pulse/PulseIcon";
import { Card } from "@/components/ui/Card";
import type { PlatformPulseSnapshot } from "@/lib/pulse/platformPulse";
import type { PlatformDashboardMetrics } from "@/lib/pulse/platformMetrics";
import { cn } from "@/lib/cn";

type Props = {
  metrics: PlatformDashboardMetrics;
  platformSnapshot: PlatformPulseSnapshot;
  className?: string;
};

function MetricCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <Card
      className={cn(
        "p-5 shadow-soft",
        highlight && "border-amber/30 bg-gradient-to-br from-fix-surface to-amber/5",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-fix-heading sm:text-3xl">{value}</p>
      {sub ? <p className="mt-1 text-xs text-fix-text-muted">{sub}</p> : null}
    </Card>
  );
}

export function PublicPulseDashboard({ metrics, platformSnapshot, className }: Props) {
  const memberProgress = Math.min(
    100,
    Math.round((metrics.membersSynced / metrics.membersMilestone) * 100),
  );

  return (
    <div className={cn("space-y-8", className)}>
      <div className="flex items-center gap-3">
        <PulseIcon size={44} alt="Platform Pulse" />
        <div>
          <h2 className="text-2xl font-semibold text-fix-heading sm:text-3xl">Platform Pulse</h2>
          <p className="text-sm text-fix-text-muted">{platformSnapshot.label}</p>
        </div>
      </div>

      <Card className="border-amber/30 bg-gradient-to-br from-fix-surface to-amber/5 p-6 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
          Platform Pulse
        </p>
        <p className="mt-2 text-4xl font-semibold tracking-tight text-fix-heading sm:text-5xl">
          {platformSnapshot.pulseValue.toLocaleString()}
        </p>
        <p className="mt-1 text-sm text-fix-text-muted">{platformSnapshot.label}</p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Members Synced"
          value={metrics.membersSynced.toLocaleString()}
          sub={`Goal: ${metrics.membersMilestone.toLocaleString()} Members Synced`}
          highlight
        />
        <MetricCard
          label="Pulses Today"
          value={metrics.pulsesToday.toLocaleString()}
          sub={`${metrics.platformPulseToday.toLocaleString()} Pulse value`}
        />
        <MetricCard label="Active today" value={metrics.activeMembersToday.toLocaleString()} />
        <MetricCard label="Vendors connected" value={metrics.vendorsConnected.toLocaleString()} />
        <MetricCard label="Products listed" value={metrics.productsListed.toLocaleString()} />
        <MetricCard label="Stay Synced messages" value={metrics.messagesSent.toLocaleString()} />
        <MetricCard label="RootSense AI conversations" value={metrics.aiConversations.toLocaleString()} />
      </div>

      <Card className="p-5">
        <p className="text-sm font-semibold text-fix-heading">Journey to 1,000,000 Members Synced</p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-fix-bg-muted">
          <div
            className="h-full rounded-full bg-gradient-to-r from-forest to-amber transition-all"
            style={{ width: `${memberProgress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-fix-text-muted">
          {metrics.membersSynced.toLocaleString()} of {metrics.membersMilestone.toLocaleString()}{" "}
          members — every connection strengthens the ecosystem.
        </p>
      </Card>
    </div>
  );
}

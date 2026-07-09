import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  value: string;
  subtext?: string;
  trend?: string;
  trendPositive?: boolean;
  icon?: LucideIcon;
  badge?: { label: string; tone?: "success" | "warning" | "neutral" };
  footer?: ReactNode;
  className?: string;
};

export function GrowthKpiCard({
  label,
  value,
  subtext,
  trend,
  trendPositive,
  icon: Icon,
  badge,
  footer,
  className,
}: Props) {
  return (
    <Card
      className={cn(
        "flex flex-col p-5 shadow-soft transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">{label}</p>
        {Icon ? (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-fix-bg-muted/80 text-fix-text-muted">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <p className="text-2xl font-semibold tracking-tight text-fix-heading">{value}</p>
        {badge ? <StatusBadge label={badge.label} tone={badge.tone ?? "success"} /> : null}
      </div>

      {subtext ? <p className="mt-1 text-sm text-fix-text-muted">{subtext}</p> : null}
      {trend ? (
        <p
          className={cn(
            "mt-2 text-xs font-medium",
            trendPositive ? "text-forest" : "text-fix-text-muted",
          )}
        >
          {trend}
        </p>
      ) : null}

      {footer ? <div className="mt-auto pt-4">{footer}</div> : null}
    </Card>
  );
}

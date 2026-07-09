"use client";

import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import type { GrowthPerformanceMonth } from "@/lib/growth/overviewDashboard";

type MetricKey = "views" | "orders" | "revenueCents";

const METRIC_OPTIONS: Array<{ key: MetricKey; label: string }> = [
  { key: "views", label: "Views" },
  { key: "orders", label: "Orders" },
  { key: "revenueCents", label: "Revenue" },
];

type Props = {
  months: GrowthPerformanceMonth[];
};

export function GrowthPerformanceChart({ months }: Props) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("revenueCents");

  const values = months.map((m) => m[activeMetric]);
  const max = Math.max(...values, 1);

  const formatValue = (value: number) => {
    if (activeMetric === "revenueCents") return formatPrice(value);
    return String(value);
  };

  const total = values.reduce((sum, v) => sum + v, 0);

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-fix-heading">Performance overview</h3>
          <p className="mt-1 text-sm text-fix-text-muted">
            {METRIC_OPTIONS.find((o) => o.key === activeMetric)?.label} over the last 6 months
          </p>
        </div>
        <label className="flex items-center gap-2 text-xs text-fix-text-muted">
          <span className="sr-only">Timeframe</span>
          <select
            className="rounded-full border border-fix-border/20 bg-fix-surface px-3 py-1.5 text-xs font-medium text-fix-heading"
            defaultValue="6m"
            aria-label="Chart timeframe"
          >
            <option value="6m">Last 6 months</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {METRIC_OPTIONS.map((option) => {
          const active = activeMetric === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setActiveMetric(option.key)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-forest text-fix-primary-foreground"
                  : "bg-fix-bg-muted text-fix-text-muted hover:text-fix-heading",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-2xl font-semibold tracking-tight text-fix-heading">
        {formatValue(total)}
        <span className="ml-2 text-sm font-normal text-fix-text-muted">total</span>
      </p>

      <div className="mt-6 flex h-40 items-end gap-2 sm:gap-3">
        {months.map((month, index) => {
          const value = month[activeMetric];
          const heightPct = Math.max(8, Math.round((value / max) * 100));
          return (
            <div key={month.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="flex h-32 w-full items-end justify-center">
                <div
                  className={cn(
                    "w-full max-w-[2.5rem] rounded-t-lg transition-all",
                    activeMetric === "revenueCents" ? "bg-forest" : "bg-gold/55",
                  )}
                  style={{ height: `${heightPct}%` }}
                  title={`${month.label}: ${formatValue(value)}`}
                />
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wide text-fix-text-muted">
                {month.label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

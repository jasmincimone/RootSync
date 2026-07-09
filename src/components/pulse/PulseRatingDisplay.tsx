"use client";

import { PulseIcon } from "@/components/pulse/PulseIcon";
import { cn } from "@/lib/cn";

type Props = {
  rating: number;
  max?: number;
  size?: number;
  className?: string;
  /** Show partial fill for decimal averages (e.g. 4.3). */
  fractional?: boolean;
};

export function PulseRatingDisplay({
  rating,
  max = 5,
  size = 18,
  className,
  fractional = false,
}: Props) {
  const safeMax = Math.max(1, max);
  const clamped = Math.min(safeMax, Math.max(0, rating));

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role="img"
      aria-label={`${fractional ? clamped.toFixed(1) : Math.round(clamped)} out of ${safeMax} Pulses`}
    >
      {Array.from({ length: safeMax }, (_, i) => {
        const index = i + 1;
        let opacity = 0.22;
        if (fractional) {
          if (clamped >= index) opacity = 1;
          else if (clamped > i) opacity = 0.45 + (clamped - i) * 0.55;
        } else if (Math.round(clamped) >= index) {
          opacity = 1;
        }

        return (
          <span key={i} className="inline-flex shrink-0" style={{ opacity }}>
            <PulseIcon size={size} alt="" />
          </span>
        );
      })}
    </div>
  );
}

type BadgeProps = {
  averageRating: number | null;
  reviewCount: number;
  size?: number;
  className?: string;
};

/** Compact rating for cards and headers. */
export function PulseRatingBadge({
  averageRating,
  reviewCount,
  size = 16,
  className,
}: BadgeProps) {
  if (reviewCount === 0 || averageRating == null) {
    return (
      <span className={cn("text-xs text-fix-text-muted", className)}>No Pulses yet</span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm text-fix-heading", className)}>
      <PulseRatingDisplay rating={averageRating} size={size} fractional />
      <span className="font-medium">{averageRating.toFixed(1)}</span>
      <span className="text-fix-text-muted">({reviewCount})</span>
    </span>
  );
}

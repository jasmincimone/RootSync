import { cn } from "@/lib/cn";

type Props = {
  values: number[];
  className?: string;
  strokeClassName?: string;
};

/** Minimal sparkline for KPI cards — normalized to fit the viewBox. */
export function GrowthSparkline({
  values,
  className,
  strokeClassName = "stroke-forest",
}: Props) {
  const width = 120;
  const height = 36;
  const padding = 2;

  if (values.length === 0) {
    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className={cn("h-9 w-full", className)}
        aria-hidden
      >
        <line
          x1={padding}
          y1={height / 2}
          x2={width - padding}
          y2={height / 2}
          className="stroke-fix-border/40"
          strokeWidth="1.5"
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const step = values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;

  const points = values.map((value, index) => {
    const x = padding + index * step;
    const normalized = (value - min) / range;
    const y = height - padding - normalized * (height - padding * 2);
    return `${x},${y}`;
  });

  const areaPoints = [
    `${padding},${height - padding}`,
    ...points,
    `${padding + (values.length - 1) * step},${height - padding}`,
  ].join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-9 w-full", className)}
      aria-hidden
    >
      <polygon points={areaPoints} className="fill-forest/10" />
      <polyline
        points={points.join(" ")}
        fill="none"
        className={cn(strokeClassName, "fill-none")}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

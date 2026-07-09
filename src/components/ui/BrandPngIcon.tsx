import { cn } from "@/lib/cn";

type Props = {
  src: string;
  alt?: string;
  /** Diameter of the circle when `withBrandPlate`, or icon size otherwise */
  size?: number;
  className?: string;
  /** Warm brown plate behind transparent brand PNGs */
  withBrandPlate?: boolean;
};

/**
 * Renders transparent brand PNG icons with a native img tag (preserves alpha).
 * Run `node scripts/process-brand-icons.mjs` after replacing icon PNGs.
 */
export function BrandPngIcon({
  src,
  alt = "",
  size = 24,
  className,
  withBrandPlate = false,
}: Props) {
  if (!withBrandPlate) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={cn("object-contain", className)}
        style={{ width: size, height: size }}
        decoding="async"
      />
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-bark shadow-soft ring-1 ring-espresso/25"
      style={{ width: size, height: size }}
      aria-hidden={!alt}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "h-full w-full object-contain",
          /* Artwork has generous transparent margins — scale up to fill the plate */
          "scale-[1.25]",
          className,
        )}
        decoding="async"
      />
    </span>
  );
}

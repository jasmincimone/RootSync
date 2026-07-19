import { cn } from "@/lib/cn";

export type PlatformIllustrationBannerProps = {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  /** Photo banners use cover; flat illustrations keep contain (default). */
  fit?: "contain" | "cover";
};

/** Shared frame for platform hero imagery — same max width and chrome everywhere. */
export function PlatformIllustrationBanner({
  src,
  alt,
  width = 1024,
  height = 511,
  className,
  fit = "contain",
}: PlatformIllustrationBannerProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="overflow-hidden rounded-2xl bg-fix-surface ring-1 ring-fix-border/15 shadow-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={cn(
            "block w-full object-center",
            fit === "cover"
              ? "aspect-[16/9] h-auto max-h-72 object-cover sm:max-h-96"
              : "h-auto object-contain",
          )}
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  );
}

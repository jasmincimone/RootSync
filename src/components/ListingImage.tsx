import { cn } from "@/lib/cn";

type Props = {
  src: string;
  alt?: string;
  className?: string;
  /** Classes for the sharp foreground image (defaults to full-box contain). */
  imgClassName?: string;
};

/**
 * Listing cover/thumb: full image fits inside the box (`object-contain`).
 * Letterbox/pillarbox space is filled with a blurred, translucent copy of the same image.
 */
export function ListingImage({ src, alt = "", className, imgClassName }: Props) {
  return (
    <div className={cn("relative h-full w-full overflow-hidden bg-fix-bg-muted", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- vendor uploads or external URLs */}
      <img
        src={src}
        alt=""
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-45 blur-2xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- vendor uploads or external URLs */}
      <img
        src={src}
        alt={alt}
        className={cn("relative z-10 h-full w-full object-contain", imgClassName)}
      />
    </div>
  );
}

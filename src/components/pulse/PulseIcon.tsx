import { BrandPngIcon } from "@/components/ui/BrandPngIcon";
import { cn } from "@/lib/cn";

/** Default PNG path — swap to SVG by changing variant or replacing this constant. */
export const PULSE_ICON_SRC = "/images/pulse/pulse-icon.png";

type Props = {
  size?: number;
  className?: string;
  /** `png` uses the brand asset; `svg` uses inline vector (future-ready). */
  variant?: "png" | "svg";
  alt?: string;
};

/**
 * RootSync Pulse brand icon.
 * Consumers should use this component — never hard-code image paths — so PNG→SVG swap is one change.
 */
export function PulseIcon({ size = 24, className, variant = "png", alt = "Pulse" }: Props) {
  if (variant === "svg") {
    return <PulseIconSvg size={size} className={className} aria-hidden={!alt} />;
  }

  return <BrandPngIcon src={PULSE_ICON_SRC} alt={alt} size={size} className={className} />;
}

/** Inline SVG placeholder — replace with final vector asset when available. */
function PulseIconSvg({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      aria-hidden
      fill="none"
    >
      <path
        d="M24 42C24 42 6 28 6 17C6 11 10 6 16 6C19.5 6 22.5 8 24 11C25.5 8 28.5 6 32 6C38 6 42 11 42 17C42 28 24 42 24 42Z"
        stroke="url(#pulseGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 24H16L19 16L22 32L25 20L28 24H34"
        stroke="url(#pulseGrad)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M22 6C22 4 23 2 24 2C25 2 26 4 26 6" stroke="#7A8B63" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 6C26 4 27 2 28 2" stroke="#7A8B63" strokeWidth="2" strokeLinecap="round" />
      <defs>
        <linearGradient id="pulseGrad" x1="6" y1="6" x2="42" y2="42">
          <stop stopColor="#E87A2E" />
          <stop offset="1" stopColor="#B55A30" />
        </linearGradient>
      </defs>
    </svg>
  );
}

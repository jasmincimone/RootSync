import { BadgeCheck } from "lucide-react";

import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  /** sm: inline under name; default: standard */
  size?: "sm" | "md";
  /** Show the trust meaning next to the badge on detail surfaces. */
  explain?: boolean;
};

const VERIFICATION_EXPLANATION =
  "RootSync reviewed and approved this vendor before publishing their profile.";

export function VerifiedVendorBadge({ className, size = "md", explain = false }: Props) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const textClass = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      title={VERIFICATION_EXPLANATION}
      aria-label={`Verified vendor. ${VERIFICATION_EXPLANATION}`}
      className={cn(
        "inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 font-medium text-forest",
        textClass,
        className,
      )}
    >
      <BadgeCheck className={iconClass} aria-hidden />
      Verified vendor
      {explain ? (
        <span className="font-normal text-fix-text-muted">— reviewed and approved by RootSync</span>
      ) : null}
    </span>
  );
}

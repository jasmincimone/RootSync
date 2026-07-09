import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

import { PulseIcon } from "@/components/pulse/PulseIcon";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  usePulseIcon?: boolean;
  selected?: boolean;
  onClick: () => void;
};

/** Large account hub card — top-level Vitals, Member Hub, Vendor Hub, GrowSpace. */
export function AccountHubCard({
  title,
  description,
  icon: Icon,
  usePulseIcon,
  selected,
  onClick,
}: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "group flex h-full min-h-[9.5rem] flex-col items-start gap-3 rounded-2xl border border-fix-border/12 bg-fix-surface p-5 text-left shadow-soft transition-all sm:min-h-[10.5rem] sm:p-6",
        "hover:border-fix-border/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
        selected && "border-forest/25 bg-fix-bg-muted/30 ring-1 ring-forest/15",
      )}
    >
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fix-bg-muted/80 text-fix-text-muted transition-colors",
          "group-hover:bg-fix-bg-muted group-hover:text-forest",
          selected && "bg-forest/10 text-forest",
        )}
      >
        {usePulseIcon ? (
          <PulseIcon size={28} alt="" />
        ) : (
          <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-fix-heading sm:text-lg">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-fix-text-muted sm:text-sm">{description}</p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-fix-text-muted/70 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}

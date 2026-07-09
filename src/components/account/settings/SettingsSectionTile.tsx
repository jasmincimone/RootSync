import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/cn";

type Props = {
  label: string;
  description: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
};

/** Menu-style settings category card — opens a settings section on click. */
export function SettingsSectionTile({ label, description, icon: Icon, active, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group flex w-full items-center gap-3 rounded-2xl border border-fix-border/12 bg-fix-surface p-4 text-left shadow-soft transition-all",
        "hover:border-fix-border/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
        active && "border-forest/25 bg-fix-bg-muted/30 ring-1 ring-forest/15",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fix-bg-muted/80 text-fix-text-muted transition-colors",
          "group-hover:bg-fix-bg-muted group-hover:text-forest",
          active && "bg-forest/10 text-forest",
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-fix-heading">{label}</p>
        <p className="mt-0.5 text-xs text-fix-text-muted">{description}</p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-fix-text-muted/70 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </button>
  );
}

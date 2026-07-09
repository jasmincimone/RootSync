import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ChevronRight } from "lucide-react";

import { BrandPngIcon } from "@/components/ui/BrandPngIcon";
import { PulseIcon } from "@/components/pulse/PulseIcon";
import { cn } from "@/lib/cn";

export type NavTileItem = {
  href: string;
  label: string;
  description: string;
  icon?: LucideIcon;
  /** Brand PNG icon (explore menu assets) */
  iconImageSrc?: string;
  /** Warm plate behind transparent brand PNGs (Home logo, RootSync symbol) */
  iconWithBrandPlate?: boolean;
  usePulseIcon?: boolean;
  fullWidth?: boolean;
  badge?: string;
};

type Props = {
  item: NavTileItem;
  active?: boolean;
  onNavigate?: () => void;
};

export function NavTile({ item, active, onNavigate }: Props) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-2xl border border-fix-border/12 bg-fix-surface p-4 shadow-soft transition-all",
        "hover:border-fix-border/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
        active && "border-forest/25 bg-fix-bg-muted/30 ring-1 ring-forest/15",
        item.fullWidth && "sm:col-span-2",
      )}
    >
      <span
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fix-bg-muted/80 text-fix-text-muted transition-colors",
          "group-hover:bg-fix-bg-muted group-hover:text-forest",
          active && "bg-forest/10 text-forest",
        )}
      >
        {item.usePulseIcon ? (
          <PulseIcon size={36} alt="" />
        ) : item.iconImageSrc ? (
          <BrandPngIcon
            src={item.iconImageSrc}
            size={36}
            withBrandPlate={item.iconWithBrandPlate}
            alt=""
          />
        ) : Icon ? (
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        ) : null}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-fix-heading">{item.label}</p>
          {item.badge ? (
            <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-espresso">
              {item.badge}
            </span>
          ) : null}
        </div>
        <p className="mt-0.5 text-xs text-fix-text-muted">{item.description}</p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-fix-text-muted/70 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

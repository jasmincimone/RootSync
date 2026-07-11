"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { cn } from "@/lib/cn";

type StickySubpageBarProps = {
  title: string | null;
  backLabel: string;
  /** Link back — use with `backHref`. Prefer over `onBack` for real routes. */
  backHref?: string;
  /** Button back — for in-page layers (hubs, settings sections). */
  onBack?: () => void;
  /**
   * Extra offset below the site header/ticker.
   * Use when stacking under AccountSubpageChrome (≈3.5rem).
   */
  stackOffset?: string;
  className?: string;
};

/**
 * Frozen sub-header: back control + title stay visible while scrolling nested account flows.
 */
export function StickySubpageBar({
  title,
  backLabel,
  backHref,
  onBack,
  stackOffset = "0px",
  className,
}: StickySubpageBarProps) {
  const backClassName =
    "inline-flex items-center gap-1.5 rounded-full border border-fix-border/15 bg-fix-surface px-3 py-1.5 text-sm font-medium text-fix-text-muted shadow-soft transition-colors hover:bg-fix-bg-muted hover:text-fix-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta";

  return (
    <div
      className={cn(
        "sticky z-40 -mx-4 border-b border-fix-border/15 bg-fix-bg/95 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-fix-bg/85 sm:-mx-6 sm:px-6",
        className,
      )}
      style={{ top: `calc(var(--site-chrome-offset) + ${stackOffset})` }}
    >
      <div className="flex flex-wrap items-center gap-3">
        {backHref ? (
          <Link href={backHref} className={backClassName}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </Link>
        ) : (
          <button type="button" onClick={onBack} className={backClassName}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {backLabel}
          </button>
        )}
        {title ? (
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold text-fix-heading">{title}</h2>
        ) : null}
      </div>
    </div>
  );
}

/** Approximate height of StickySubpageBar — use when nesting a second sticky layer. */
export const STICKY_SUBPAGE_BAR_STACK = "3.5rem";

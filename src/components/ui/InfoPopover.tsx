"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

/** Clickable term chip that opens a short explanation. Reused from the Role CTA info pattern. */
export function InfoPopover({
  label,
  title,
  children,
  className,
}: {
  label: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        className={cn(
          "inline-flex min-h-11 w-full items-center gap-2 rounded-2xl border border-fix-border/20 bg-fix-surface px-3 py-2.5 text-left text-sm font-medium text-fix-heading shadow-soft transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
          open && "bg-fix-bg-muted ring-2 ring-fix-cta/30",
        )}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <Info className="h-4 w-4 shrink-0 text-forest" aria-hidden />
        <span>{label}</span>
      </button>
      {open ? (
        <Card
          id={panelId}
          role="dialog"
          aria-labelledby={`${panelId}-title`}
          className="absolute left-0 right-0 top-full z-50 mt-2 w-full p-4 text-left shadow-soft sm:w-80"
        >
          <h3 id={`${panelId}-title`} className="text-sm font-semibold text-fix-heading">
            {title}
          </h3>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-fix-text-muted">{children}</div>
          <button
            type="button"
            className="mt-3 text-xs font-medium text-fix-link hover:text-fix-link-hover"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </Card>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description?: ReactNode;
  /** Optional count shown beside the title */
  count?: number | null;
  defaultOpen?: boolean;
  children: ReactNode;
  /** Right-side header actions (e.g. Manage favorites) */
  headerExtra?: ReactNode;
  className?: string;
  id?: string;
};

export function DiscoverCollapsibleSection({
  title,
  description,
  count,
  defaultOpen = true,
  children,
  headerExtra,
  className,
  id,
}: Props) {
  const reactId = useId();
  const panelId = id ? `${id}-panel` : `${reactId}-panel`;
  const headingId = id ? `${id}-heading` : `${reactId}-heading`;
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <section className={cn("mt-10", className)} id={id} aria-labelledby={headingId}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button
          type="button"
          className="group flex min-w-0 flex-1 items-start gap-2 rounded-lg text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <ChevronDown
            className={cn(
              "mt-1 h-5 w-5 shrink-0 text-fix-text-muted transition-transform duration-200",
              open ? "rotate-0" : "-rotate-90",
            )}
            aria-hidden
          />
          <span className="min-w-0">
            <span
              id={headingId}
              className="block text-lg font-semibold text-fix-heading group-hover:text-fix-link"
            >
              {title}
              {count != null ? (
                <span className="ml-2 text-sm font-medium text-fix-text-muted">({count})</span>
              ) : null}
            </span>
            {description ? (
              <span className="mt-1 block text-sm text-fix-text-muted">{description}</span>
            ) : null}
          </span>
        </button>
        {headerExtra ? <div className="shrink-0 pt-0.5">{headerExtra}</div> : null}
      </div>
      {open ? (
        <div id={panelId} className="mt-6">
          {children}
        </div>
      ) : null}
    </section>
  );
}

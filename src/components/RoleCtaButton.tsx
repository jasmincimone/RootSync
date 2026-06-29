"use client";

import { Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ROLE_DESCRIPTIONS, type PlatformRole } from "@/config/roleDescriptions";
import { cn } from "@/lib/cn";

type Props = {
  role: PlatformRole;
  href: string;
  label: string;
  icon?: React.ReactNode;
  variant?: "cta" | "secondary";
  className?: string;
};

export function RoleCtaButton({
  role,
  href,
  label,
  icon,
  variant = "cta",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const desc = ROLE_DESCRIPTIONS[role];

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
    <div ref={rootRef} className={cn("relative flex items-stretch gap-2", className)}>
      <ButtonLink
        href={href}
        variant={variant}
        size="lg"
        className="min-w-0 flex-1 uppercase tracking-wide"
      >
        {icon}
        {label}
      </ButtonLink>
      <button
        type="button"
        className={cn(
          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-fix-border/25 bg-fix-surface text-fix-heading shadow-soft transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
          open && "bg-fix-bg-muted ring-2 ring-fix-cta/30",
        )}
        aria-label={`Learn about ${desc.title}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <Info className="h-5 w-5" aria-hidden />
      </button>

      {open ? (
        <Card
          id={panelId}
          role="dialog"
          aria-labelledby={`${panelId}-title`}
          className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] p-4 text-left shadow-soft sm:w-80"
        >
          <h3 id={`${panelId}-title`} className="text-sm font-semibold text-fix-heading">
            {desc.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-fix-text-muted">{desc.intro}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
            What you can do
          </p>
          <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-fix-text-muted">
            {desc.privileges.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {desc.footnote ? (
            <p className="mt-3 border-t border-fix-border/15 pt-3 text-xs leading-relaxed text-fix-text-muted">
              {desc.footnote}
            </p>
          ) : null}
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

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
  suffix?: React.ReactNode;
  /** Stack label and suffix on two lines — helps long vendor CTAs fit. */
  contentLayout?: "inline" | "stacked";
  /** Vertically center the info button when the CTA is taller than the default height. */
  centerInfoButton?: boolean;
  /** Optional notice shown at the top of the info popover (e.g. home-page promotions). */
  infoNotice?: string;
  variant?: "cta" | "secondary";
  className?: string;
  buttonClassName?: string;
};

export function RoleCtaButton({
  role,
  href,
  label,
  icon,
  suffix,
  contentLayout = "inline",
  centerInfoButton = false,
  infoNotice,
  variant = "cta",
  className,
  buttonClassName,
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
    <div ref={rootRef} className={cn("relative flex w-full min-w-0 gap-2", centerInfoButton ? "items-center" : "items-stretch", className)}>
      <ButtonLink
        href={href}
        variant={variant}
        size="lg"
        className={cn(
          "min-w-0 flex-1 uppercase tracking-wide",
          contentLayout === "stacked" && "h-auto min-h-11 whitespace-normal py-2.5",
          buttonClassName,
        )}
      >
        {contentLayout === "stacked" ? (
          <span className="flex flex-col items-center gap-0.5">
            <span className="inline-flex items-center justify-center gap-2">
              {icon}
              <span>{label}</span>
            </span>
            {suffix ? <span className="normal-case">{suffix}</span> : null}
          </span>
        ) : (
          <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5">
            {icon}
            <span>{label}</span>
            {suffix ? <span className="normal-case">{suffix}</span> : null}
          </span>
        )}
      </ButtonLink>
      <button
        type="button"
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border border-fix-border/25 bg-fix-surface text-fix-heading shadow-soft transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
          centerInfoButton ? "h-11 w-11 self-center" : "h-11 w-11",
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
          className="absolute left-0 right-0 top-full z-50 mt-2 w-full max-w-[min(100%,22rem)] p-4 text-left shadow-soft sm:left-auto sm:right-0 sm:w-80"
        >
          {infoNotice ? (
            <p className="mb-3 rounded-lg border border-forest/20 bg-forest/5 px-3 py-2.5 text-xs leading-relaxed text-fix-text-muted">
              {infoNotice}
            </p>
          ) : null}
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

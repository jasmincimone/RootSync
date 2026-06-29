"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/cn";

type FormSectionProps = {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

export function FormSection({
  title,
  description,
  defaultOpen = true,
  children,
  className,
}: FormSectionProps) {
  const panelId = useId();

  return (
    <details
      open={defaultOpen}
      className={cn(
        "group rounded-xl border border-fix-border/15 bg-fix-surface/50 open:shadow-soft",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-xl px-4 py-3 marker:content-none focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-fix-heading">{title}</div>
          {description ? (
            <p className="mt-0.5 text-xs text-fix-text-muted">{description}</p>
          ) : null}
        </div>
        <ChevronDown
          className="mt-0.5 h-5 w-5 shrink-0 text-fix-text-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden
        />
      </summary>
      <div id={panelId} className="space-y-4 border-t border-fix-border/15 px-4 py-4">
        {children}
      </div>
    </details>
  );
}

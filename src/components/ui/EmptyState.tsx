import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";

import { ButtonLink } from "./Button";
import { Card } from "./Card";

type Action = {
  href: string;
  label: string;
  variant?: "primary" | "cta" | "secondary" | "ghost";
};

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: Action;
  secondaryAction?: Action;
  /** When false, renders without Card wrapper (for inline use). */
  bordered?: boolean;
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon: Icon,
  action,
  secondaryAction,
  bordered = true,
  className,
}: EmptyStateProps) {
  const content = (
    <div className={cn("text-center", bordered ? "p-8 sm:p-10" : "py-6", className)}>
      {Icon ? (
        <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-fix-bg-muted text-fix-text-muted ring-1 ring-inset ring-fix-border/15">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      ) : null}
      <h3 className="text-base font-semibold text-fix-heading">{title}</h3>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fix-text-muted">
          {description}
        </p>
      ) : null}
      {action || secondaryAction ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action ? (
            <ButtonLink href={action.href} variant={action.variant ?? "cta"} size="sm">
              {action.label}
            </ButtonLink>
          ) : null}
          {secondaryAction ? (
            <ButtonLink
              href={secondaryAction.href}
              variant={secondaryAction.variant ?? "secondary"}
              size="sm"
            >
              {secondaryAction.label}
            </ButtonLink>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  if (!bordered) return content;
  return <Card className="overflow-hidden">{content}</Card>;
}

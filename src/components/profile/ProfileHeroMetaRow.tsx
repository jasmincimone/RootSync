import { Fragment, type ReactNode } from "react";

import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
};

/** Inline hero metadata — e.g. verified badge | pulse rating. */
export function ProfileHeroMetaRow({ children, className }: Props) {
  const items = Array.isArray(children) ? children : [children];
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  return (
    <div
      className={cn(
        "mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start",
        className,
      )}
    >
      {visible.map((item, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <span className="text-sm text-fix-text-muted/40" aria-hidden>
              |
            </span>
          ) : null}
          {item}
        </Fragment>
      ))}
    </div>
  );
}

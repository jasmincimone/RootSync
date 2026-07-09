import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  description?: ReactNode;
  className?: string;
  /** Wider layout for dashboards and tables */
  wide?: boolean;
};

/** Consistent page body width and intro copy — used across account and platform hubs. */
export function PageBody({ children, description, className, wide }: Props) {
  return (
    <div
      className={cn(
        "mx-auto space-y-6",
        wide ? "max-w-4xl" : "max-w-2xl",
        className,
      )}
    >
      {description ? <p className="text-sm text-fix-text-muted">{description}</p> : null}
      {children}
    </div>
  );
}

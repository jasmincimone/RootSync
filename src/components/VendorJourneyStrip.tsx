import Link from "next/link";

import { cn } from "@/lib/cn";

export type VendorJourneyStep = {
  id: string;
  label: string;
  href: string;
  done: boolean;
  current: boolean;
};

type Props = {
  steps: VendorJourneyStep[];
};

/** Linear vendor path (S5): Apply → Verified → List → Get paid → GrowSpace. */
export function VendorJourneyStrip({ steps }: Props) {
  if (steps.length === 0) return null;

  return (
    <section
      className="rounded-2xl border border-fix-border/15 bg-fix-surface p-4 sm:p-5"
      aria-labelledby="vendor-journey-heading"
    >
      <h2 id="vendor-journey-heading" className="text-sm font-semibold text-fix-heading">
        Your vendor path
      </h2>
      <p className="mt-1 text-sm text-fix-text-muted">
        Apply → Verified → List → Get paid → GrowSpace
      </p>
      <ol className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1">
        {steps.map((step, index) => (
          <li key={step.id} className="flex min-w-0 items-center gap-1 sm:gap-2">
            {index > 0 ? (
              <span className="hidden text-fix-text-muted sm:inline" aria-hidden>
                →
              </span>
            ) : null}
            <Link
              href={step.href}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
                step.done && "bg-forest/15 text-forest",
                step.current && !step.done && "bg-fix-cta/25 text-fix-heading ring-1 ring-fix-cta/40",
                !step.done && !step.current && "bg-fix-bg-muted text-fix-text-muted hover:bg-fix-bg-muted/80",
              )}
              aria-current={step.current ? "step" : undefined}
            >
              {step.done ? "✓ " : null}
              {step.label}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

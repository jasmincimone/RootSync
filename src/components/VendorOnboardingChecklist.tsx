import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

type Props = {
  hasProfile: boolean;
  hasStripe: boolean;
  hasListing: boolean;
  hasAvailability: boolean;
};

type Step = {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
};

export function VendorOnboardingChecklist({
  hasProfile,
  hasStripe,
  hasListing,
  hasAvailability,
}: Props) {
  const steps: Step[] = [
    {
      id: "profile",
      label: "Complete vendor profile",
      description: "Add your bio, location, and profile photo.",
      href: "/account/vendor/profile",
      done: hasProfile,
    },
    {
      id: "stripe",
      label: "Connect Stripe payments",
      description: "Accept checkout and bookings on Discover.",
      href: "/account/vendor/payments",
      done: hasStripe,
    },
    {
      id: "listing",
      label: "Publish your first listing",
      description: "Add a product, service, resource, or event.",
      href: "/account/vendor/listings/new",
      done: hasListing,
    },
    {
      id: "availability",
      label: "Set service availability",
      description: "Configure booking hours for service listings.",
      href: "/account/vendor/listings",
      done: hasAvailability,
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed === steps.length) return null;

  return (
    <Card className="border-forest/20 bg-forest/5 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-fix-heading">Getting started</h3>
        <span className="text-xs font-medium text-fix-text-muted">
          {completed} of {steps.length} complete
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fix-bg-muted">
        <div
          className="h-full rounded-full bg-forest transition-all"
          style={{ width: `${(completed / steps.length) * 100}%` }}
        />
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              href={step.href}
              className={cn(
                "flex items-start gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-fix-surface/80",
                step.done && "opacity-70",
              )}
            >
              {step.done ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-forest" aria-hidden />
              ) : (
                <Circle className="mt-0.5 h-5 w-5 shrink-0 text-fix-text-muted" aria-hidden />
              )}
              <span>
                <span className="block text-sm font-medium text-fix-heading">{step.label}</span>
                <span className="mt-0.5 block text-xs text-fix-text-muted">{step.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}

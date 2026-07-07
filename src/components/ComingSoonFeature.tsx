import type { LucideIcon } from "lucide-react";

import { Container } from "@/components/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

type ComingSoonFeatureProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  highlights?: string[];
};

export function ComingSoonFeature({
  title,
  description,
  icon,
  highlights = [],
}: ComingSoonFeatureProps) {
  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-2xl">
        <StatusBadge label="Coming soon" tone="warning" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-fix-text-muted">{description}</p>
      </div>

      {highlights.length > 0 ? (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {highlights.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-fix-border/15 bg-fix-surface px-4 py-3 text-sm text-fix-text-muted"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-10 max-w-lg">
        <EmptyState
          bordered={false}
          icon={icon}
          title="We're building this next"
          description="Browse Discover and book services. Resources and events live alongside products in one marketplace."
          action={{ href: "/discover", label: "Explore marketplace", variant: "cta" }}
          secondaryAction={{ href: "/rootsync", label: "RootSync platform", variant: "secondary" }}
        />
      </div>
    </Container>
  );
}

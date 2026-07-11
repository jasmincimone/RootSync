import type { LucideIcon } from "lucide-react";

import { ROOTSENSE_AI_HREF } from "@/config/rootsensePaths";
import { Card } from "@/components/ui/Card";
import { PageBody } from "@/components/ui/PageBody";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

type Props = {
  title: string;
  description: string;
  icon: LucideIcon;
  highlights: string[];
  primaryAction?: { href: string; label: string };
};

export function GrowthModuleShell({
  description,
  icon: Icon,
  highlights,
  primaryAction,
}: Props) {
  return (
    <PageBody description={description}>
      <StatusBadge label="Phase 2" tone="warning" />
      {primaryAction ? (
        <div>
          <ButtonLink href={primaryAction.href} variant="cta" size="sm">
            {primaryAction.label}
          </ButtonLink>
        </div>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {highlights.map((item) => (
          <li key={item}>
            <Card className="p-4 text-sm text-fix-text-muted shadow-soft">{item}</Card>
          </li>
        ))}
      </ul>

      <EmptyState
        bordered
        icon={Icon}
        title="Coming soon"
        description="This GrowSpace module is foundation-only for launch. Overview metrics are live; CRM, funnels, and campaigns ship in Phase 2."
        action={{ href: "/account/growth", label: "Back to Growth overview", variant: "secondary" }}
        secondaryAction={{ href: ROOTSENSE_AI_HREF, label: "Ask RootSense AI", variant: "secondary" }}
      />
    </PageBody>
  );
}

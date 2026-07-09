import { Filter } from "lucide-react";

import { GrowthModuleShell } from "@/components/growth/GrowthModuleShell";

export default function GrowthFunnelsPage() {
  return (
    <GrowthModuleShell
      title="Funnels"
      description="Build multi-step journeys from podcast listeners to returning customers — with metrics at every stage."
      icon={Filter}
      highlights={[
        "Podcast → Landing → Lead magnet → Newsletter → Consultation",
        "Visual funnel analytics (coming soon)",
        "Entry sources, CTAs, and active status",
        "Connect landing pages and email sequences",
      ]}
    />
  );
}

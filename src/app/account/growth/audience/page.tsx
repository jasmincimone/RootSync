import { UsersRound } from "lucide-react";

import { GrowthModuleShell } from "@/components/growth/GrowthModuleShell";

export default function GrowthAudiencePage() {
  return (
    <GrowthModuleShell
      title="Audience"
      description="Dynamic segments based on interests, growing zone, purchases, community activity, and newsletter engagement."
      icon={UsersRound}
      highlights={[
        "Auto-segment by products purchased and vendor type",
        "Geographic region and USDA growing zone",
        "Event attendance and consultation status",
        "Podcast listeners and marketplace activity",
      ]}
    />
  );
}

import { Sparkles } from "lucide-react";

import { GrowthModuleShell } from "@/components/growth/GrowthModuleShell";
import { ROOTSENSE_AI_HREF } from "@/config/rootsensePaths";

export default function GrowthAiMarketingPage() {
  return (
    <GrowthModuleShell
      title="AI Marketing"
      description="RootSense AI integrated into your workspace — generate campaigns, funnels, and your next best marketing action."
      icon={Sparkles}
      highlights={[
        "Generate landing pages and welcome series",
        "Build consultation and webinar funnels",
        "Analyze audience interests and funnel performance",
        "Event marketing plans and referral campaigns",
        "Recommend next best action on login",
      ]}
      primaryAction={{ href: ROOTSENSE_AI_HREF, label: "Open RootSense AI" }}
    />
  );
}

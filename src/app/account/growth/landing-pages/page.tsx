import { LayoutTemplate } from "lucide-react";

import { GrowthModuleShell } from "@/components/growth/GrowthModuleShell";

export default function GrowthLandingPagesPage() {
  return (
    <GrowthModuleShell
      title="Landing Pages"
      description="Create warm, purposeful pages that convert visitors into community members and customers."
      icon={LayoutTemplate}
      highlights={[
        "Views, conversions, and conversion rate",
        "Traffic source and campaign attribution",
        "QR and funnel associations",
        "Block-based content editor (ShopPage pattern)",
      ]}
    />
  );
}

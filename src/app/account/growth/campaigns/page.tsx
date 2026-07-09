import { Megaphone } from "lucide-react";

import { GrowthModuleShell } from "@/components/growth/GrowthModuleShell";

export default function GrowthCampaignsPage() {
  return (
    <GrowthModuleShell
      title="Campaigns"
      description="Plan, schedule, and measure email and outreach campaigns — synced from PostgreSQL to your email provider."
      icon={Megaphone}
      highlights={[
        "Draft, scheduled, and sent campaigns",
        "Open rate, click rate, and unsubscribes",
        "Audience segment targeting",
        "Resend sync (Phase 4)",
      ]}
    />
  );
}

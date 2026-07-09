import { CalendarDays } from "lucide-react";

import { GrowthModuleShell } from "@/components/growth/GrowthModuleShell";

export default function GrowthEventsPage() {
  return (
    <GrowthModuleShell
      title="Events"
      description="Per-event dashboards — track InvestFest, farmers markets, workshops, and community gatherings in one place."
      icon={CalendarDays}
      highlights={[
        "QR scans and new account signups per event",
        "Newsletter signups and community joins",
        "Marketplace sales and consultation requests",
        "Vendor connections and follow-up tasks",
      ]}
    />
  );
}

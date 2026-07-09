import { BarChart3 } from "lucide-react";

import { GrowthModuleShell } from "@/components/growth/GrowthModuleShell";

export default function GrowthAnalyticsPage() {
  return (
    <GrowthModuleShell
      title="Analytics"
      description="Visitors, QR scans, landing page views, conversion rates, revenue, and returning customers — with trend charts."
      icon={BarChart3}
      highlights={[
        "Marketing dashboard KPI cards",
        "Funnel and campaign performance trends",
        "Community signups and consultation requests",
        "Event-sourced attribution from growth_marketing_events",
      ]}
    />
  );
}

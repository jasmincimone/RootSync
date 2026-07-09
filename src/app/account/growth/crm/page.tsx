import { Users } from "lucide-react";

import { GrowthModuleShell } from "@/components/growth/GrowthModuleShell";

export default function GrowthCrmPage() {
  return (
    <GrowthModuleShell
      title="CRM"
      description="A lightweight relationship manager — not a corporate CRM. Track contacts, tags, interests, purchase history, and follow-up tasks."
      icon={Users}
      highlights={[
        "Search, filter, sort, and tag contacts",
        "Link RootSync members automatically",
        "Notes, tasks, and activity timeline",
        "Statuses from New Lead through VIP and Partner",
        "Import signals from orders, bookings, and community",
      ]}
      primaryAction={{ href: "/account/growth", label: "View growth overview" }}
    />
  );
}

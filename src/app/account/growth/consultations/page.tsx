import { MessageSquare } from "lucide-react";

import { GrowthModuleShell } from "@/components/growth/GrowthModuleShell";

export default function GrowthConsultationsPage() {
  return (
    <GrowthModuleShell
      title="Consultations"
      description="Track the full consultation pipeline — from lead through proposal, project completion, and review."
      icon={MessageSquare}
      highlights={[
        "Lead → Requested → Scheduled → Completed",
        "Proposal sent, accepted, or declined",
        "Links to Booking records when scheduled",
        "Stage conversion percentages",
      ]}
    />
  );
}

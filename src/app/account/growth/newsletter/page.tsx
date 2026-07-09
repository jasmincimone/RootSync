import { Mail } from "lucide-react";

import { GrowthModuleShell } from "@/components/growth/GrowthModuleShell";

export default function GrowthNewsletterPage() {
  return (
    <GrowthModuleShell
      title="Newsletter"
      description="Grow your list with welcome series, seasonal growing tips, product launches, and community updates."
      icon={Mail}
      highlights={[
        "Subscriber count and engagement metrics",
        "Welcome, educational, and seasonal sequences",
        "Draft and scheduled campaigns",
        "Unsubscribe tracking from PostgreSQL",
      ]}
    />
  );
}

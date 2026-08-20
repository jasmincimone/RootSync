import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GrowthCampaignObjectiveClient } from "@/components/growth/GrowthCampaignObjectiveClient";
import { PageBody } from "@/components/ui/PageBody";
import { authOptions } from "@/lib/authOptions";
import { requireGrowthWorkspace } from "@/lib/growthAccess";

export const dynamic = "force-dynamic";

export default async function NewGrowthCampaignPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/growth/campaigns/new");

  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) redirect("/account/vendor/apply");

  return (
    <PageBody wide>
      <GrowthCampaignObjectiveClient />
    </PageBody>
  );
}

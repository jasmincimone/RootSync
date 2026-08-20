import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GrowthCampaignsClient } from "@/components/growth/GrowthCampaignsClient";
import { PageBody } from "@/components/ui/PageBody";
import { authOptions } from "@/lib/authOptions";
import { requireGrowthWorkspace } from "@/lib/growthAccess";
import { listGrowthCampaigns } from "@/lib/growth/campaigns";

export const dynamic = "force-dynamic";

export default async function GrowthCampaignsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/growth/campaigns");

  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) redirect("/account/vendor/apply");

  const campaigns = await listGrowthCampaigns(ctx.vendorProfileId, ctx.isPlatformScope);

  return (
    <PageBody wide description="Create targeted campaigns, send people into RootSync funnels, and see what converts.">
      <GrowthCampaignsClient
        initialCampaigns={campaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          objective: campaign.objective,
          status: campaign.status,
          channel: campaign.channel,
          destinationType: campaign.destinationType,
          destinationUrl: campaign.destinationUrl,
          scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
          sentAt: campaign.sentAt?.toISOString() ?? null,
          recipientCount: campaign.recipientCount,
          openCount: campaign.openCount,
          clickCount: campaign.clickCount,
          destinationVisitCount: campaign.destinationVisitCount,
          conversionCount: campaign.conversionCount,
          revenueCents: campaign.revenueCents,
        }))}
      />
    </PageBody>
  );
}

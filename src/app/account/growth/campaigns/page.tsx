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
    <PageBody
      wide
      description="Draft email campaigns and send them to your CRM contacts via Resend."
    >
      <GrowthCampaignsClient
        initialCampaigns={campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          subject: c.subject,
          bodyHtml: c.bodyHtml,
          status: c.status,
          sentAt: c.sentAt?.toISOString() ?? null,
          updatedAt: c.updatedAt.toISOString(),
        }))}
      />
    </PageBody>
  );
}

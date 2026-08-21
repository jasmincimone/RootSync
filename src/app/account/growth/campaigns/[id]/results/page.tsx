import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GrowthCampaignResults } from "@/components/growth/GrowthCampaignResults";
import { PageBody } from "@/components/ui/PageBody";
import { authOptions } from "@/lib/authOptions";
import { requireGrowthWorkspace } from "@/lib/growthAccess";
import {
  getCampaignAnalytics,
  getCampaignTimeSeries,
  listCampaignActivity,
  listCampaignRecipients,
} from "@/lib/growth/campaignAnalytics";
import { getGrowthCampaignForWorkspace } from "@/lib/growth/campaigns";
import { resolveCampaignDestinationUrl } from "@/lib/growth/campaignDestinations";
import { GROWTH_CAMPAIGN_AUDIENCE } from "@/lib/growth/roles";

export const dynamic = "force-dynamic";

export default async function GrowthCampaignResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/growth/campaigns");

  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) redirect("/account/vendor/apply");

  const { id } = await params;
  const campaign = await getGrowthCampaignForWorkspace(id, ctx.vendorProfileId, ctx.isPlatformScope);
  if (!campaign) notFound();

  const [analytics, activity, series, recipients, destination] = await Promise.all([
    getCampaignAnalytics(id),
    listCampaignActivity(id),
    getCampaignTimeSeries(id),
    listCampaignRecipients(id),
    resolveCampaignDestinationUrl({
      vendorProfileId: campaign.vendorProfileId,
      destinationType: campaign.destinationType,
      destinationId: campaign.destinationId,
      destinationUrl: campaign.destinationUrl,
    }),
  ]);

  const audienceSummary =
    campaign.audienceType === GROWTH_CAMPAIGN_AUDIENCE.ALL
      ? `Marketing opted-in contacts · ${analytics.recipients} recipients`
      : campaign.audienceType === GROWTH_CAMPAIGN_AUDIENCE.STATUS
        ? `Customer type (opted-in only) · ${analytics.recipients} recipients`
        : `Manual selection (opted-in only) · ${analytics.recipients} recipients`;

  return (
    <PageBody wide>
      <GrowthCampaignResults
        campaign={{
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          objective: campaign.objective,
          sentAt: campaign.sentAt?.toISOString() ?? null,
          destinationUrl: campaign.destinationUrl,
        }}
        analytics={analytics}
        activity={activity.map((row) => ({
          id: row.id,
          eventType: row.eventType,
          occurredAt: row.occurredAt.toISOString(),
          contact: row.contact,
        }))}
        series={series}
        recipients={recipients.map((row) => ({
          id: row.id,
          email: row.email,
          name: row.name,
          status: row.status,
          sentAt: row.sentAt?.toISOString() ?? null,
          openedAt: row.openedAt?.toISOString() ?? null,
          clickedAt: row.clickedAt?.toISOString() ?? null,
          convertedAt: row.convertedAt?.toISOString() ?? null,
          attributedRevenueCents: row.attributedRevenueCents,
          contactId: row.contactId,
          marketingOptIn: row.contact?.marketingOptIn ?? null,
        }))}
        destinationLabel={destination.ok ? destination.label : campaign.destinationUrl || "Destination unavailable"}
        audienceSummary={audienceSummary}
      />
    </PageBody>
  );
}

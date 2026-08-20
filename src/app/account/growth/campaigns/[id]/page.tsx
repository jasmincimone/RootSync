import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GrowthCampaignBuilder } from "@/components/growth/GrowthCampaignBuilder";
import { PageBody } from "@/components/ui/PageBody";
import { authOptions } from "@/lib/authOptions";
import { requireGrowthWorkspace } from "@/lib/growthAccess";
import { getGrowthCampaignForWorkspace } from "@/lib/growth/campaigns";
import { listCampaignDestinations } from "@/lib/growth/campaignDestinations";
import { listGrowthContacts } from "@/lib/growth/contacts";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GrowthCampaignBuilderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/growth/campaigns");

  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) redirect("/account/vendor/apply");

  const { id } = await params;
  const [campaign, destinations, contacts, vendor] = await Promise.all([
    getGrowthCampaignForWorkspace(id, ctx.vendorProfileId, ctx.isPlatformScope),
    listCampaignDestinations({
      vendorProfileId: ctx.vendorProfileId,
      isPlatformScope: ctx.isPlatformScope,
    }),
    listGrowthContacts(ctx.vendorProfileId, ctx.isPlatformScope),
    ctx.vendorProfileId
      ? prisma.vendorProfile.findUnique({
          where: { id: ctx.vendorProfileId },
          select: { displayName: true, contactEmail: true },
        })
      : Promise.resolve(null),
  ]);
  if (!campaign) notFound();

  return (
    <PageBody wide>
      <GrowthCampaignBuilder
        campaign={{
          id: campaign.id,
          name: campaign.name,
          description: campaign.description,
          objective: campaign.objective,
          subject: campaign.subject,
          previewText: campaign.previewText,
          headline: campaign.headline,
          bodyHtml: campaign.bodyHtml,
          heroImageUrl: campaign.heroImageUrl,
          ctaLabel: campaign.ctaLabel,
          ctaUrl: campaign.ctaUrl,
          senderName: campaign.senderName,
          replyTo: campaign.replyTo,
          destinationType: campaign.destinationType,
          destinationId: campaign.destinationId,
          destinationUrl: campaign.destinationUrl,
          audienceType: campaign.audienceType,
          audienceJson: campaign.audienceJson,
          status: campaign.status,
          scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
          timezone: campaign.timezone,
          steps: campaign.steps.map((step) => ({
            id: step.id,
            triggerType: step.triggerType,
            delayHours: step.delayHours,
            subject: step.subject,
            previewText: step.previewText,
            bodyHtml: step.bodyHtml,
            ctaLabel: step.ctaLabel,
            isEnabled: step.isEnabled,
          })),
        }}
        destinations={{
          funnels: destinations.funnels,
          listings: destinations.listings,
          bookings: destinations.bookings,
          events: destinations.events,
        }}
        contacts={contacts.map((contact) => ({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          status: contact.status,
        }))}
        vendor={{
          displayName: vendor?.displayName ?? "RootSync",
          contactEmail: vendor?.contactEmail ?? session.user.email ?? null,
        }}
      />
    </PageBody>
  );
}

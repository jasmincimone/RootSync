import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GrowthContactDetailClient } from "@/components/growth/GrowthContactDetailClient";
import { PageBody } from "@/components/ui/PageBody";
import { authOptions } from "@/lib/authOptions";
import { requireGrowthWorkspace } from "@/lib/growthAccess";
import { getGrowthContactForWorkspace } from "@/lib/growth/contacts";
import { listContactCampaignHistory } from "@/lib/growth/campaignAnalytics";

export const dynamic = "force-dynamic";

export default async function GrowthContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/growth/crm");

  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) redirect("/account/vendor/apply");

  const { id } = await params;
  const contact = await getGrowthContactForWorkspace(
    id,
    ctx.vendorProfileId,
    ctx.isPlatformScope,
  );
  if (!contact) notFound();
  const history = await listContactCampaignHistory(id);

  return (
    <PageBody
      description={
        <>
          <Link href="/account/growth/crm" className="text-fix-link hover:text-fix-link-hover">
            ← All contacts
          </Link>
        </>
      }
    >
      <GrowthContactDetailClient
        contact={{
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          status: contact.status,
          leadSource: contact.leadSource,
          notes: contact.notes.map((n) => ({
            id: n.id,
            body: n.body,
            createdAt: n.createdAt.toISOString(),
            author: n.author,
          })),
          campaigns: history.recipients.map((row) => ({
            id: row.campaign.id,
            name: row.campaign.name,
            sentAt: row.sentAt?.toISOString() ?? null,
            openedAt: row.openedAt?.toISOString() ?? null,
            clickedAt: row.clickedAt?.toISOString() ?? null,
            convertedAt: row.convertedAt?.toISOString() ?? null,
            revenueCents: row.attributedRevenueCents,
          })),
          campaignEvents: history.events.map((event) => ({
            id: event.id,
            eventType: event.eventType,
            occurredAt: event.occurredAt.toISOString(),
            campaignName: event.campaign?.name ?? "Campaign",
          })),
        }}
      />
    </PageBody>
  );
}

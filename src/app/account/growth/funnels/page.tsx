import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GrowthFunnelsClient } from "@/components/growth/GrowthFunnelsClient";
import { PageBody } from "@/components/ui/PageBody";
import { authOptions } from "@/lib/authOptions";
import { requireGrowthWorkspace } from "@/lib/growthAccess";
import { countGrowthContacts, listGrowthContacts } from "@/lib/growth/contacts";
import { listGrowthFunnels } from "@/lib/growth/funnels";
import { parseFunnelPageContent } from "@/lib/growth/funnelPage";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GrowthFunnelsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/growth/funnels");

  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) redirect("/account/vendor/apply");

  const [funnels, contacts, contactTotal, vendor] = await Promise.all([
    listGrowthFunnels(ctx.vendorProfileId, ctx.isPlatformScope),
    listGrowthContacts(ctx.vendorProfileId, ctx.isPlatformScope),
    countGrowthContacts(ctx.vendorProfileId, ctx.isPlatformScope),
    ctx.vendorProfileId
      ? prisma.vendorProfile.findUnique({
          where: { id: ctx.vendorProfileId },
          select: { publicSlug: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <PageBody
      wide
      description="Workspace name and objective stay in Growth. Hero and sections are the public page. Tap a term card for how each control works."
    >
      <GrowthFunnelsClient
        initialFunnels={funnels.map((funnel) => ({
          id: funnel.id,
          name: funnel.name,
          description: funnel.description,
          objective: funnel.objective,
          ctaLabel: funnel.ctaLabel,
          publicSlug: funnel.landingPage?.slug ?? "",
          isActive: funnel.isActive,
          assignDiscoverCheckout: funnel.entrySource === "discover_checkout",
          contactCount: funnel._count.contacts,
          page: parseFunnelPageContent(funnel.landingPage?.contentJson, {
            name: funnel.name,
            objective: funnel.objective,
            description: funnel.description,
          }),
          steps: funnel.steps.map((step) => ({
            id: step.id,
            label: step.label,
            stepType: step.stepType,
            sortOrder: step.sortOrder,
          })),
        }))}
        initialContacts={contacts.map((contact) => ({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          funnelId: contact.funnel?.id ?? null,
        }))}
        contactTotal={contactTotal}
        vendorPublicSlug={vendor?.publicSlug ?? null}
      />
    </PageBody>
  );
}

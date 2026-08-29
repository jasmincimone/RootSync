import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import {
  FunnelDesignStudio,
  funnelDraftFromRecord,
} from "@/components/growth/FunnelDesignStudio";
import { PageBody } from "@/components/ui/PageBody";
import { authOptions } from "@/lib/authOptions";
import { requireGrowthWorkspace } from "@/lib/growthAccess";
import { getGrowthFunnelForWorkspace } from "@/lib/growth/funnels";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function GrowthFunnelStudioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/growth/funnels");

  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) redirect("/account/vendor/apply");

  const { id } = await params;
  const [funnel, vendor] = await Promise.all([
    getGrowthFunnelForWorkspace(id, ctx.vendorProfileId, ctx.isPlatformScope),
    ctx.vendorProfileId
      ? prisma.vendorProfile.findUnique({
          where: { id: ctx.vendorProfileId },
          select: { publicSlug: true },
        })
      : Promise.resolve(null),
  ]);
  if (!funnel) notFound();

  return (
    <PageBody wide>
      <FunnelDesignStudio
        draft={funnelDraftFromRecord(funnel)}
        vendorPublicSlug={vendor?.publicSlug ?? null}
      />
    </PageBody>
  );
}

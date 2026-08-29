import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { FunnelDesignStudio } from "@/components/growth/FunnelDesignStudio";
import { emptyFunnelDraft } from "@/components/growth/GrowthFunnelMaker";
import { PageBody } from "@/components/ui/PageBody";
import { authOptions } from "@/lib/authOptions";
import { requireGrowthWorkspace } from "@/lib/growthAccess";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewGrowthFunnelStudioPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/growth/funnels/new/studio");

  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) redirect("/account/vendor/apply");

  const vendor = ctx.vendorProfileId
    ? await prisma.vendorProfile.findUnique({
        where: { id: ctx.vendorProfileId },
        select: { publicSlug: true },
      })
    : null;

  return (
    <PageBody wide>
      <FunnelDesignStudio
        draft={emptyFunnelDraft()}
        vendorPublicSlug={vendor?.publicSlug ?? null}
      />
    </PageBody>
  );
}

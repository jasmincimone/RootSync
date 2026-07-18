import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GrowthFunnelsClient } from "@/components/growth/GrowthFunnelsClient";
import { PageBody } from "@/components/ui/PageBody";
import { authOptions } from "@/lib/authOptions";
import { requireGrowthWorkspace } from "@/lib/growthAccess";
import { listGrowthFunnels } from "@/lib/growth/funnels";

export const dynamic = "force-dynamic";

export default async function GrowthFunnelsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/growth/funnels");

  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) redirect("/account/vendor/apply");

  const funnels = await listGrowthFunnels(ctx.vendorProfileId, ctx.isPlatformScope);

  return (
    <PageBody
      wide
      description="Map the path from first touch to conversion. Default steps: landing → nurture → CTA."
    >
      <GrowthFunnelsClient
        initialFunnels={funnels.map((f) => ({
          id: f.id,
          name: f.name,
          description: f.description,
          objective: f.objective,
          isActive: f.isActive,
          contactCount: f._count.contacts,
          steps: f.steps.map((s) => ({
            id: s.id,
            label: s.label,
            stepType: s.stepType,
            sortOrder: s.sortOrder,
          })),
        }))}
      />
    </PageBody>
  );
}

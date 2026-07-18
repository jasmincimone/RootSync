import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GrowthCrmClient } from "@/components/growth/GrowthCrmClient";
import { PageBody } from "@/components/ui/PageBody";
import { authOptions } from "@/lib/authOptions";
import { requireGrowthWorkspace } from "@/lib/growthAccess";
import { listGrowthContacts } from "@/lib/growth/contacts";

export const dynamic = "force-dynamic";

export default async function GrowthCrmPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/growth/crm");

  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) redirect("/account/vendor/apply");

  const contacts = await listGrowthContacts(ctx.vendorProfileId, ctx.isPlatformScope);

  return (
    <PageBody
      wide
      description="Lightweight relationship manager — contacts, status, and notes. Not a corporate CRM."
    >
      <GrowthCrmClient
        initialContacts={contacts.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone,
          status: c.status,
          leadSource: c.leadSource,
          funnel: c.funnel,
          noteCount: c._count.notes,
          updatedAt: c.updatedAt.toISOString(),
        }))}
      />
    </PageBody>
  );
}

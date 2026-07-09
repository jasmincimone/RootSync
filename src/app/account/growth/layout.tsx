import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GrowthSubNav } from "@/components/growth/GrowthSubNav";
import { PageBody } from "@/components/ui/PageBody";
import { ButtonLink } from "@/components/ui/Button";
import { authOptions } from "@/lib/authOptions";
import { canAccessGrowthWorkspace, requireGrowthWorkspace } from "@/lib/growthAccess";

export default async function GrowthLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/growth");
  }

  const role = session.user.role ?? "CUSTOMER";
  const vendorStatus = session.user.vendorStatus;

  if (!canAccessGrowthWorkspace(role, vendorStatus ?? undefined)) {
    return (
      <PageBody description="GrowSpace helps approved vendors build relationships, run campaigns, and grow their mission. Apply to become a vendor to unlock CRM, funnels, newsletters, and more.">
        <ButtonLink href="/account/vendor/apply" variant="cta" size="sm">
          Become a vendor
        </ButtonLink>
      </PageBody>
    );
  }

  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) {
    redirect("/account/vendor/apply");
  }

  return (
    <div className="space-y-5">
      <GrowthSubNav />
      {children}
    </div>
  );
}

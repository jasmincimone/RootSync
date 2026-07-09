import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { AdminPulseManager } from "@/components/pulse/AdminPulseManager";
import { authOptions } from "@/lib/authOptions";
import { isAdmin } from "@/lib/permissions";
import { loadAdminPulseConfig } from "@/lib/pulse/adminConfig";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pulse manager",
  description: "Configure Pulse weights, tiers, and ecosystem presentation.",
};

export default async function AdminPulsePage() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    redirect("/account");
  }

  const config = await loadAdminPulseConfig();

  return (
    <AccountSubpageBody description="Configure Pulse weights, status tiers, categories, and dashboard announcements. Statistics remain live — you tune how Pulse is calculated and presented.">
      <AdminPulseManager initial={config} />
    </AccountSubpageBody>
  );
}

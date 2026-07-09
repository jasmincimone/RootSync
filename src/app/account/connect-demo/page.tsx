import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { ConnectDemoDashboard } from "@/components/ConnectDemoDashboard";

export const metadata = {
  title: "Connect Demo",
};

export default async function ConnectDemoPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/connect-demo");

  return (
    <AccountSubpageBody
      wide
      description="Sample onboarding, product management, storefront, direct charges, and subscription flows."
    >
      <ConnectDemoDashboard />
    </AccountSubpageBody>
  );
}

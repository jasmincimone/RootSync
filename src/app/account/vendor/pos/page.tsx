import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { VendorPosClient } from "@/components/VendorPosClient";
import { VendorPosOnboarding } from "@/components/VendorPosOnboarding";
import { PageLoading } from "@/components/PageLoading";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

export const metadata = {
  title: "In-person POS",
};

export default async function VendorPosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/vendor/pos");
  }

  const profile = await prisma.vendorProfile.findUnique({
    where: { userId: session.user.id },
    select: { status: true },
  });

  if (!profile) {
    redirect("/account/vendor/apply");
  }

  if (session.user.role !== ROLES.VENDOR || profile.status !== VENDOR_STATUS.APPROVED) {
    redirect("/account/vendor");
  }

  return (
    <AccountSubpageBody description="Take counter or card-reader payments that pay out to your connected Stripe account.">
      <div className="mx-auto max-w-lg space-y-6">
        <Suspense fallback={<PageLoading contained label="Loading POS setup" />}>
          <VendorPosOnboarding />
        </Suspense>
        <Suspense fallback={<PageLoading contained label="Loading POS" />}>
          <VendorPosClient />
        </Suspense>
      </div>
    </AccountSubpageBody>
  );
}

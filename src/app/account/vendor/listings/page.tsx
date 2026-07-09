import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { VendorListingsClient } from "@/components/VendorListingsClient";
import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { ButtonLink } from "@/components/ui/Button";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

export default async function VendorListingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/vendor/listings");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { vendorProfile: true },
  });
  if (
    !user?.vendorProfile ||
    user.role !== ROLES.VENDOR ||
    user.vendorProfile.status !== VENDOR_STATUS.APPROVED
  ) {
    redirect("/account/vendor");
  }

  return (
    <AccountSubpageBody description="Manage offerings and their public listings.">
      <div className="flex justify-end">
        <ButtonLink href="/account/vendor/listings/new" variant="cta" size="sm">
          New offering
        </ButtonLink>
      </div>
      <VendorListingsClient hideHeader />
    </AccountSubpageBody>
  );
}

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { VendorStripeConnectSetup } from "@/components/VendorStripeConnectSetup";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

export const metadata = {
  title: "Vendor payments",
};

export default async function VendorPaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/vendor/payments");
  }

  const profile = await prisma.vendorProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    redirect("/account/vendor/apply");
  }

  if (
    session.user.role !== ROLES.VENDOR ||
    profile.status !== VENDOR_STATUS.APPROVED
  ) {
    redirect("/account/vendor");
  }

  return (
    <AccountSubpageBody description="Connect Stripe to accept Discover checkout and service bookings, or use payment links per listing.">
      <VendorStripeConnectSetup showDevControls={process.env.NODE_ENV === "development"} />
    </AccountSubpageBody>
  );
}

import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fix-heading">Payment setup</h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Connect Stripe to accept Discover checkout and service bookings, or use payment links
          per listing.
        </p>
      </div>
      <VendorStripeConnectSetup showDevControls={process.env.NODE_ENV === "development"} />
    </div>
  );
}

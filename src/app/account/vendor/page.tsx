import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";
import { canManageVendorListings } from "@/lib/vendorListingAccess";

export default async function VendorDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/vendor");
  }

  const profile = await prisma.vendorProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile) {
    return (
      <div className="max-w-xl space-y-4">
        <h2 className="text-lg font-semibold text-fix-heading">Vendor</h2>
        <p className="text-sm text-fix-text-muted">You don&apos;t have a vendor profile yet.</p>
        <ButtonLink href="/account/vendor/apply" variant="cta" size="sm">
          Apply to become a vendor
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fix-heading">Vendor dashboard</h2>
        <p className="mt-1 text-sm text-fix-text-muted">{profile.displayName}</p>
      </div>

      <Card className="p-5">
        <div className="text-sm font-semibold text-fix-heading">Status</div>
        <p className="mt-2 text-sm text-fix-text-muted">
          <span className="font-medium text-fix-heading">{profile.status}</span>
          {profile.status === VENDOR_STATUS.PENDING &&
            " — your application is waiting for admin review."}
          {profile.status === VENDOR_STATUS.APPROVED &&
            " — you can manage listings, your shop landing page, and view orders."}
          {profile.status === VENDOR_STATUS.REJECTED && " — contact support if you have questions."}
        </p>
        {session.user.role === ROLES.CUSTOMER && profile.status === VENDOR_STATUS.PENDING && (
          <p className="mt-2 text-xs text-fix-text-muted">
            After approval, sign out and sign back in to refresh your account access.
          </p>
        )}
      </Card>

      {canManageVendorListings(session.user.role ?? "CUSTOMER", profile.status) && (
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/account/vendor/listings" variant="secondary" size="sm">
            My listings
          </ButtonLink>
          <ButtonLink href="/account/vendor/orders" variant="secondary" size="sm">
            Vendor orders
          </ButtonLink>
          <ButtonLink href="/account/vendor/profile" variant="secondary" size="sm">
            Edit profile &amp; shop page
          </ButtonLink>
          <ButtonLink href={`/marketplace/vendors/${profile.id}`} variant="secondary" size="sm">
            View my vendor page
          </ButtonLink>
          <Link href="/marketplace" className="text-sm font-medium text-fix-link hover:text-fix-link-hover">
            Marketplace (public)
          </Link>
        </div>
      )}
    </div>
  );
}

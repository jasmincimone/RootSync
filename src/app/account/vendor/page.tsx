import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { VendorHubNav } from "@/components/account/VendorHubNav";
import { Card } from "@/components/ui/Card";
import { PageBody } from "@/components/ui/PageBody";
import { ButtonLink } from "@/components/ui/Button";
import { VendorOnboardingChecklist } from "@/components/VendorOnboardingChecklist";
import { discoverVendorPath } from "@/config/discoverPaths";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { LISTING_TYPE, ROLES, VENDOR_STATUS } from "@/lib/roles";
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
      <PageBody description="You don't have a vendor profile yet.">
        <ButtonLink href="/account/vendor/apply" variant="cta" size="sm">
          Apply to become a vendor
        </ButtonLink>
      </PageBody>
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeConnectAccountId: true },
  });
  const hasStripe = Boolean(user?.stripeConnectAccountId);

  const [listingCount, serviceWithAvailability] = await Promise.all([
    prisma.listing.count({ where: { vendorProfileId: profile.id } }),
    prisma.serviceAvailabilityRule.findFirst({
      where: { offering: { vendorProfileId: profile.id } },
      select: { id: true },
    }),
  ]);

  const hasProfile = Boolean(profile.bio?.trim() && profile.pickupLocation?.trim());
  const hasListing = listingCount > 0;
  const hasAvailability = Boolean(serviceWithAvailability);

  return (
    <AccountSubpageBody description={profile.displayName}>
      {profile.status === VENDOR_STATUS.APPROVED ? (
        <VendorOnboardingChecklist
          hasProfile={hasProfile}
          hasStripe={hasStripe}
          hasListing={hasListing}
          hasAvailability={hasAvailability}
        />
      ) : null}

      <Card className="p-5">
        <div className="text-sm font-semibold text-fix-heading">Status</div>
        <p className="mt-2 text-sm text-fix-text-muted">
          <span className="font-medium text-fix-heading">{profile.status}</span>
          {profile.status === VENDOR_STATUS.PENDING &&
            " — your application is waiting for admin review."}
          {profile.status === VENDOR_STATUS.APPROVED &&
            " — manage listings, payments, and incoming appointments."}
          {profile.status === VENDOR_STATUS.REJECTED && " — contact support if you have questions."}
        </p>
        {session.user.role === ROLES.CUSTOMER && profile.status === VENDOR_STATUS.PENDING && (
          <p className="mt-2 text-xs text-fix-text-muted">
            After approval, sign out and sign back in to refresh your account access.
          </p>
        )}
      </Card>

      {profile.status === VENDOR_STATUS.APPROVED && !hasStripe ? (
        <Card className="border-amber/35 bg-fix-bg-muted/50 p-5">
          <div className="text-sm font-semibold text-fix-heading">Set up payments</div>
          <p className="mt-2 text-sm text-fix-text-muted">
            Connect Stripe so members can check out on Discover and book your services. You
            can also add payment links on individual listings.
          </p>
          <div className="mt-4">
            <ButtonLink href="/account/vendor/payments" variant="cta" size="sm">
              Connect Stripe
            </ButtonLink>
          </div>
        </Card>
      ) : null}

      {canManageVendorListings(session.user.role ?? "CUSTOMER", profile.status) && (
        <VendorHubNav publicPageHref={discoverVendorPath(profile)} />
      )}
    </AccountSubpageBody>
  );
}

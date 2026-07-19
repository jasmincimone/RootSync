import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { VendorHubNav } from "@/components/account/VendorHubNav";
import { Card } from "@/components/ui/Card";
import { PageBody } from "@/components/ui/PageBody";
import { ButtonLink } from "@/components/ui/Button";
import { VendorJourneyStrip, type VendorJourneyStep } from "@/components/VendorJourneyStrip";
import { VendorOnboardingChecklist } from "@/components/VendorOnboardingChecklist";
import { discoverVendorPath } from "@/config/discoverPaths";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { LISTING_TYPE, DIRECTORY_CLAIM_STATUS, ROLES, VENDOR_STATUS } from "@/lib/roles";
import { canManageVendorListings } from "@/lib/vendorListingAccess";
import { canAccessGrowthWorkspace } from "@/lib/growthAccess";

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

  const [listingCount, serviceWithAvailability, serviceNeedingAvailability, anyServiceListing, directoryClaims] =
    await Promise.all([
      prisma.listing.count({ where: { vendorProfileId: profile.id } }),
      prisma.serviceAvailabilityRule.findFirst({
        where: { offering: { vendorProfileId: profile.id } },
        select: { id: true },
      }),
      prisma.listing.findFirst({
        where: {
          vendorProfileId: profile.id,
          listingType: LISTING_TYPE.SERVICE,
          offering: { availabilityRules: { none: {} } },
        },
        select: { id: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.listing.findFirst({
        where: {
          vendorProfileId: profile.id,
          listingType: LISTING_TYPE.SERVICE,
        },
        select: { id: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.directoryListing.findMany({
        where: {
          OR: [
            { claimRequestedByUserId: session.user.id },
            { claimedVendorProfileId: profile.id },
          ],
        },
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          claimStatus: true,
          claimRequestedAt: true,
          claimedVendorProfileId: true,
        },
        orderBy: [{ claimRequestedAt: "desc" }, { updatedAt: "desc" }],
        take: 10,
      }),
    ]);

  const hasProfile = Boolean(profile.bio?.trim() && profile.pickupLocation?.trim());
  const hasListing = listingCount > 0;
  const hasAvailability = Boolean(serviceWithAvailability);
  const isApproved = profile.status === VENDOR_STATUS.APPROVED;
  const canGrow = canAccessGrowthWorkspace(session.user.role, profile.status);

  const journeySteps: VendorJourneyStep[] = (() => {
    const applied = true;
    const verified = isApproved;
    const listed = hasListing;
    const paid = hasStripe;
    const growing = canGrow;

    const currentId = !verified
      ? profile.status === VENDOR_STATUS.PENDING
        ? "verified"
        : "apply"
      : !listed
        ? "list"
        : !paid
          ? "paid"
          : "grow";

    return [
      {
        id: "apply",
        label: "Apply",
        href: "/account/vendor/apply",
        done: applied,
        current: currentId === "apply",
      },
      {
        id: "verified",
        label: "Verified",
        href: "/account/vendor",
        done: verified,
        current: currentId === "verified",
      },
      {
        id: "list",
        label: "List",
        href: "/account/vendor/listings/new",
        done: listed,
        current: currentId === "list",
      },
      {
        id: "paid",
        label: "Get paid",
        href: "/account/vendor/payments",
        done: paid,
        current: currentId === "paid",
      },
      {
        id: "grow",
        label: "GrowSpace",
        href: "/account/growth",
        done: growing && listed && paid,
        current: currentId === "grow",
      },
    ];
  })();

  // Prefer a service listing that still needs hours; else any service; else create a service.
  const availabilityTargetId = serviceNeedingAvailability?.id ?? anyServiceListing?.id;
  const availabilityHref = availabilityTargetId
    ? `/account/vendor/listings/${availabilityTargetId}/edit?step=details`
    : "/account/vendor/listings/new?type=SERVICE&step=details";

  return (
    <AccountSubpageBody description={profile.displayName}>
      <VendorJourneyStrip steps={journeySteps} />

      {profile.status === VENDOR_STATUS.APPROVED ? (
        <VendorOnboardingChecklist
          hasProfile={hasProfile}
          hasStripe={hasStripe}
          hasListing={hasListing}
          hasAvailability={hasAvailability}
          availabilityHref={availabilityHref}
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

        {directoryClaims.length > 0 ? (
          <div className="mt-4 border-t border-fix-border/15 pt-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
              Directory claims
            </div>
            <ul className="mt-3 space-y-3">
              {directoryClaims.map((claim) => {
                const location = [claim.city, claim.state].filter(Boolean).join(", ");
                const label =
                  claim.claimStatus === DIRECTORY_CLAIM_STATUS.CLAIMED ||
                  claim.claimedVendorProfileId === profile.id
                    ? "Approved"
                    : claim.claimStatus === DIRECTORY_CLAIM_STATUS.PENDING
                      ? "Pending"
                      : claim.claimStatus === DIRECTORY_CLAIM_STATUS.REJECTED
                        ? "Denied"
                        : claim.claimStatus;
                const tone =
                  label === "Approved"
                    ? "text-forest"
                    : label === "Pending"
                      ? "text-amber-800"
                      : label === "Denied"
                        ? "text-red-700"
                        : "text-fix-text-muted";
                return (
                  <li key={claim.id} className="text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <Link
                        href={`/discover/directory/${claim.id}`}
                        className="font-medium text-fix-link hover:text-fix-link-hover"
                      >
                        {claim.name}
                      </Link>
                      <span className={`text-xs font-semibold uppercase tracking-wide ${tone}`}>
                        {label}
                      </span>
                    </div>
                    {location ? (
                      <p className="mt-0.5 text-xs text-fix-text-muted">{location}</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </Card>

      {profile.status === VENDOR_STATUS.APPROVED && !hasStripe ? (
        <Card className="border-amber/35 bg-fix-bg-muted/50 p-5">
          <div className="text-sm font-semibold text-fix-heading">Open Payment Hub</div>
          <p className="mt-2 text-sm text-fix-text-muted">
            Connect Stripe so members can check out on Discover and book your services. You
            can also add payment links, products, and a storefront from Payment Hub.
          </p>
          <div className="mt-4">
            <ButtonLink href="/account/vendor/payments" variant="cta" size="sm">
              Go to Payment Hub
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

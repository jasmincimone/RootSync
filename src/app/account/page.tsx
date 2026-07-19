import { getServerSession } from "next-auth";

import { AccountFtueChecklist } from "@/components/AccountFtueChecklist";
import { AccountHubExplorer } from "@/components/account/AccountHubExplorer";
import { AccountNextActions } from "@/components/account/AccountNextActions";
import { AccountProfileCard } from "@/components/account/AccountProfileCard";
import { PageBody } from "@/components/ui/PageBody";
import { authOptions } from "@/lib/authOptions";
import { canAccessGrowthWorkspace } from "@/lib/growthAccess";
import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      imageUrl: true,
      role: true,
      vendorProfile: {
        select: {
          id: true,
          publicSlug: true,
          displayName: true,
          profileImageUrl: true,
          status: true,
        },
      },
    },
  });

  const displayName =
    user?.vendorProfile?.displayName ?? user?.name?.trim() ?? session.user.email ?? "Your account";
  const imageUrl = user?.vendorProfile?.profileImageUrl ?? user?.imageUrl;
  const profileHref = "/profile";

  const role = user?.role ?? ROLES.CUSTOMER;
  const vendorStatus = user?.vendorProfile?.status;
  const isAdmin = role === ROLES.ADMIN;
  const isApprovedVendor =
    role === ROLES.VENDOR && vendorStatus === VENDOR_STATUS.APPROVED;

  const showAdminHub = isAdmin;
  const showVendorHub = isAdmin || isApprovedVendor;
  const showGrowspace = isAdmin || canAccessGrowthWorkspace(role, vendorStatus);

  const nextActions = (() => {
    if (isApprovedVendor || isAdmin) {
      return [
        {
          href: "/account/vendor/listings",
          label: "Manage listings",
          hint: "Publish products, services, events, and resources",
        },
        {
          href: "/account/vendor/payments",
          label: "Payment Hub",
          hint: "Keep Stripe Connect ready so you get paid",
        },
        showGrowspace
          ? {
              href: "/account/growth",
              label: "Open GrowSpace",
              hint: "CRM, funnels, and campaigns",
            }
          : {
              href: "/discover",
              label: "Browse Discover",
              hint: "See how your listings appear to Members",
            },
      ];
    }
    if (vendorStatus === VENDOR_STATUS.PENDING) {
      return [
        {
          href: "/account/vendor",
          label: "Vendor application",
          hint: "Check status while RootSync reviews your apply",
        },
        {
          href: "/discover",
          label: "Browse Discover",
          hint: "Explore Verified Vendors while you wait",
        },
        {
          href: "/pulse",
          label: "Share a Pulse",
          hint: "Stay visible in the community feed",
        },
      ];
    }
    return [
      {
        href: "/discover",
        label: "Browse Discover",
        hint: "Find local vendors, listings, and places",
      },
      {
        href: "/messages/inbox",
        label: "Stay Synced",
        hint: "Message vendors and Members",
      },
      {
        href: "/account/vitals",
        label: "Your Pulse",
        hint: "See your score and contribution history",
      },
    ];
  })();

  return (
    <PageBody>
      <AccountProfileCard
        displayName={displayName}
        imageUrl={imageUrl}
        profileHref={profileHref}
      />

      <AccountFtueChecklist />

      <AccountNextActions actions={nextActions} />

      <AccountHubExplorer
        showVendorHub={showVendorHub}
        showGrowspace={showGrowspace}
        showAdminHub={showAdminHub}
      />
    </PageBody>
  );
}

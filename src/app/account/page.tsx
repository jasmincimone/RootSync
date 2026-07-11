import { getServerSession } from "next-auth";

import { AccountFtueChecklist } from "@/components/AccountFtueChecklist";
import { AccountHubExplorer } from "@/components/account/AccountHubExplorer";
import { AccountProfileCard } from "@/components/account/AccountProfileCard";
import { PageBody } from "@/components/ui/PageBody";
import { discoverVendorPath } from "@/config/discoverPaths";
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
  const profileHref = user?.vendorProfile?.id
    ? discoverVendorPath({
        id: user.vendorProfile.id,
        publicSlug: user.vendorProfile.publicSlug,
      })
    : `/members/${user?.id ?? session.user.id}`;

  const role = user?.role ?? ROLES.CUSTOMER;
  const vendorStatus = user?.vendorProfile?.status;
  const isAdmin = role === ROLES.ADMIN;
  const isApprovedVendor =
    role === ROLES.VENDOR && vendorStatus === VENDOR_STATUS.APPROVED;

  // Hub visibility (server-gated from DB role / vendor status):
  // Members → Vitals + Member Hub
  // Approved vendors → + Vendor Hub + GrowSpace
  // Admins → all five hubs
  const showAdminHub = isAdmin;
  const showVendorHub = isAdmin || isApprovedVendor;
  const showGrowspace = isAdmin || canAccessGrowthWorkspace(role, vendorStatus);

  return (
    <PageBody>
      <AccountProfileCard
        displayName={displayName}
        imageUrl={imageUrl}
        profileHref={profileHref}
      />

      <AccountFtueChecklist />

      <AccountHubExplorer
        showVendorHub={showVendorHub}
        showGrowspace={showGrowspace}
        showAdminHub={showAdminHub}
      />
    </PageBody>
  );
}

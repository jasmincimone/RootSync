import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { canManageVendorListings } from "@/lib/vendorListingAccess";

export type GrowthWorkspaceContext = {
  userId: string;
  vendorProfileId: string | null;
  isPlatformScope: boolean;
  displayName: string;
};

/** Approved vendors and admins can access the Growth workspace. */
export function canAccessGrowthWorkspace(role: string, vendorStatus: string | undefined): boolean {
  if (role === ROLES.ADMIN) return true;
  return canManageVendorListings(role, vendorStatus);
}

export async function requireGrowthWorkspace(userId: string): Promise<
  | { error: string }
  | GrowthWorkspaceContext
> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { vendorProfile: true },
  });
  if (!user) return { error: "Not signed in" };

  if (user.role === ROLES.ADMIN) {
    return {
      userId: user.id,
      vendorProfileId: user.vendorProfile?.id ?? null,
      isPlatformScope: !user.vendorProfile,
      displayName: user.vendorProfile?.displayName ?? user.name ?? "RootSync Admin",
    };
  }

  if (!user.vendorProfile) {
    return { error: "No vendor profile" };
  }
  if (!canManageVendorListings(user.role, user.vendorProfile.status)) {
    return { error: "Growth workspace requires an approved vendor account" };
  }

  return {
    userId: user.id,
    vendorProfileId: user.vendorProfile.id,
    isPlatformScope: false,
    displayName: user.vendorProfile.displayName,
  };
}

/** Vendor-scoped where clause — null vendorProfileId for platform admin scope. */
export function growthVendorWhere(vendorProfileId: string | null, isPlatformScope: boolean) {
  if (isPlatformScope && vendorProfileId == null) {
    return { vendorProfileId: null as string | null };
  }
  if (!vendorProfileId) {
    throw new Error("vendorProfileId required for vendor-scoped growth data");
  }
  return { vendorProfileId };
}

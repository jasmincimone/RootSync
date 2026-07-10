import { discoverVendorPath } from "@/config/discoverPaths";
import { memberProfilePath } from "@/config/memberPaths";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

export type UserProfilePeer = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  imageUrl?: string | null;
  vendorProfile?: {
    id: string;
    displayName: string;
    profileImageUrl?: string | null;
    publicSlug?: string | null;
    status: string;
  } | null;
};

export function resolveUserAvatarUrl(user: UserProfilePeer): string | null {
  const fromUser = user.imageUrl?.trim();
  if (fromUser) return fromUser;
  const fromVendor = user.vendorProfile?.profileImageUrl?.trim();
  if (fromVendor) return fromVendor;
  return null;
}

export function resolveUserDisplayName(user: UserProfilePeer): string {
  return (
    user.vendorProfile?.displayName ??
    user.name?.trim() ??
    user.email?.split("@")[0] ??
    "Member"
  );
}

export function isApprovedVendor(user: UserProfilePeer): boolean {
  return user.vendorProfile?.status === VENDOR_STATUS.APPROVED;
}

/** Public profile URL — approved vendors use Discover vendor page; everyone else uses member profile. */
export function publicProfileHref(user: UserProfilePeer): string {
  if (isApprovedVendor(user) && user.vendorProfile) {
    return discoverVendorPath({
      id: user.vendorProfile.id,
      publicSlug: user.vendorProfile.publicSlug,
    });
  }
  return memberProfilePath(user.id);
}

export function peerSubtitle(user: UserProfilePeer): string {
  if (user.role === ROLES.ADMIN) return "Admin";
  if (isApprovedVendor(user)) return "Verified vendor";
  if (user.vendorProfile) return "Vendor";
  return "Member";
}

export const communityAuthorSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  imageUrl: true,
      vendorProfile: {
        select: {
          id: true,
          publicSlug: true,
          displayName: true,
          profileImageUrl: true,
          status: true,
        },
      },
} as const;

export const messengerPeerSelect = communityAuthorSelect;

import type { Session } from "next-auth";

import { getShop, type ShopSlug } from "@/config/shops";
import { parseShopSlugParam } from "@/lib/adminShop";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/permissions";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";
import { canManageVendorListings } from "@/lib/vendorListingAccess";

export async function getVendorProfileForUser(userId: string) {
  return prisma.vendorProfile.findUnique({ where: { userId } });
}

export async function getAssignedShopSlugForUser(userId: string): Promise<ShopSlug | null> {
  const profile = await getVendorProfileForUser(userId);
  if (!profile?.shopSlug) return null;
  return parseShopSlugParam(profile.shopSlug);
}

export function canEditShopLandingAsVendor(session: Session | null, vendorStatus: string): boolean {
  if (!session?.user?.id) return false;
  return canManageVendorListings(session.user.role ?? ROLES.CUSTOMER, vendorStatus);
}

export async function canManageShopCarousel(
  session: Session | null,
  shopSlug: string,
): Promise<boolean> {
  if (!session?.user?.id) return false;
  const slug = parseShopSlugParam(shopSlug);
  if (!slug) return false;

  const profile = await getVendorProfileForUser(session.user.id);
  if (!profile) return false;

  if (!canEditShopLandingAsVendor(session, profile.status)) return false;

  if (isAdmin(session)) {
    return !profile.shopSlug || profile.shopSlug === slug;
  }

  return profile.status === VENDOR_STATUS.APPROVED && profile.shopSlug === slug;
}

export async function assertCanManageShopCarousel(session: Session | null, shopSlug: string) {
  const allowed = await canManageShopCarousel(session, shopSlug);
  if (!allowed) {
    throw new Error("Forbidden");
  }
}

export function shopDisplayName(slug: ShopSlug): string {
  return getShop(slug)?.name ?? slug;
}

export async function assignPlatformShopToVendor(
  userId: string,
  shopSlugRaw: string,
): Promise<{ ok: true; shopSlug: ShopSlug } | { error: string; status: number }> {
  const slug = parseShopSlugParam(shopSlugRaw);
  if (!slug) {
    return { error: "Invalid platform shop", status: 400 };
  }

  const profile = await getVendorProfileForUser(userId);
  if (!profile) {
    return { error: "No vendor profile", status: 404 };
  }

  if (profile.shopSlug && profile.shopSlug !== slug) {
    return {
      error: "This vendor is already assigned to a different platform shop.",
      status: 409,
    };
  }

  if (profile.shopSlug === slug) {
    return { ok: true, shopSlug: slug };
  }

  const taken = await prisma.vendorProfile.findFirst({
    where: { shopSlug: slug, NOT: { userId } },
  });
  if (taken) {
    return { error: "That platform shop is already linked to another vendor.", status: 409 };
  }

  await prisma.vendorProfile.update({
    where: { userId },
    data: { shopSlug: slug },
  });

  return { ok: true, shopSlug: slug };
}

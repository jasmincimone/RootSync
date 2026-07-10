import { discoverVendorPath } from "@/config/discoverPaths";
import { prisma } from "@/lib/prisma";
import { parseShopSlugParam } from "@/lib/adminShop";
import { VENDOR_STATUS } from "@/lib/roles";

/** Legacy /shops/[slug] URLs → canonical Discover vendor profile path. */
export async function resolveVendorDiscoverPathForShopSlug(slug: string): Promise<string | null> {
  const parsed = parseShopSlugParam(slug);
  if (!parsed) return null;

  const vendor = await prisma.vendorProfile.findFirst({
    where: { shopSlug: parsed, status: VENDOR_STATUS.APPROVED },
    select: { id: true, publicSlug: true },
  });
  return vendor ? discoverVendorPath(vendor) : null;
}

/** @deprecated Use resolveVendorDiscoverPathForShopSlug */
export async function resolveVendorIdForShopSlug(slug: string): Promise<string | null> {
  const path = await resolveVendorDiscoverPathForShopSlug(slug);
  return path ? path.replace(/^\/discover\/vendors\//, "") : null;
}

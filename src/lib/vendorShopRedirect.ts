import { prisma } from "@/lib/prisma";
import { parseShopSlugParam } from "@/lib/adminShop";
import { VENDOR_STATUS } from "@/lib/roles";

/** Legacy /shops/[slug] URLs → approved vendor profile id. */
export async function resolveVendorIdForShopSlug(slug: string): Promise<string | null> {
  const parsed = parseShopSlugParam(slug);
  if (!parsed) return null;

  const vendor = await prisma.vendorProfile.findFirst({
    where: { shopSlug: parsed, status: VENDOR_STATUS.APPROVED },
    select: { id: true },
  });
  return vendor?.id ?? null;
}

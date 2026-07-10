import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isVendorCuidRef, normalizeVendorPublicSlug } from "@/lib/vendorPublicSlug";

export function vendorPublicRefWhere(ref: string): Prisma.VendorProfileWhereInput {
  const trimmed = ref.trim();
  if (isVendorCuidRef(trimmed)) {
    return { id: trimmed };
  }
  return { publicSlug: normalizeVendorPublicSlug(trimmed) };
}

export async function findVendorProfileByPublicRef<T extends Prisma.VendorProfileInclude>(
  ref: string,
  include: T,
) {
  return prisma.vendorProfile.findFirst({
    where: vendorPublicRefWhere(ref),
    include,
  });
}

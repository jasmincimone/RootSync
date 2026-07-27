import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { isListingCuidRef, normalizeListingPublicSlug } from "@/lib/listingPublicSlug";

export function listingPublicRefWhere(ref: string): Prisma.ListingWhereInput {
  const trimmed = ref.trim();
  if (isListingCuidRef(trimmed)) {
    return { id: trimmed };
  }
  return { publicSlug: normalizeListingPublicSlug(trimmed) };
}

export async function findListingByPublicRef<T extends Prisma.ListingInclude>(
  ref: string,
  include: T,
) {
  return prisma.listing.findFirst({
    where: listingPublicRefWhere(ref),
    include,
  });
}

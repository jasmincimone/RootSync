import type { Metadata } from "next";

import { SeedPackGrowGuideClient } from "@/components/SeedPackGrowGuideClient";
import { discoverListingPath } from "@/config/discoverPaths";
import {
  SEED_PACK_GROW_GUIDES,
  SEED_PACK_LISTING_PUBLIC_SLUG,
  matchSeedGuideImage,
} from "@/config/seedPackGrowGuides";
import { publicListingWhere } from "@/lib/offeringListing";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Seed pack grow guides | The Fix Urban Roots",
  description:
    "Growing instructions for Mix & Match Seed Packs — beans, basil, arugula, lettuce, onions, and bee feed flowers.",
};

export const dynamic = "force-dynamic";

export default async function SeedPackGrowGuidesPage() {
  const listing = await prisma.listing.findFirst({
    where: { publicSlug: SEED_PACK_LISTING_PUBLIC_SLUG },
    select: {
      id: true,
      publicSlug: true,
      visibility: true,
      offering: {
        select: {
          status: true,
          optionGroups: {
            select: {
              values: {
                select: { label: true, imageUrl: true },
                orderBy: { sortOrder: "asc" },
              },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  const optionImages =
    listing?.offering.optionGroups.flatMap((group) => group.values) ?? [];

  const seeds = SEED_PACK_GROW_GUIDES.map((guide) => ({
    ...guide,
    resolvedImageUrl: matchSeedGuideImage(guide, optionImages),
  }));

  const publicListing = listing
    ? await prisma.listing.findFirst({
        where: { id: listing.id, ...publicListingWhere },
        select: { id: true, publicSlug: true },
      })
    : null;

  return (
    <SeedPackGrowGuideClient
      seeds={seeds}
      listingHref={publicListing ? discoverListingPath(publicListing) : null}
    />
  );
}

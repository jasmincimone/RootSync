import { Store } from "lucide-react";

import { Container } from "@/components/Container";
import { DiscoverBrowse } from "@/components/DiscoverBrowse";
import { RoleCtaButton } from "@/components/RoleCtaButton";
import { MarketplaceMapDynamic } from "@/components/MarketplaceMapDynamic";
import { publishDueScheduledOfferings } from "@/lib/publishScheduledOfferings";
import { publicListingRelationWhere, publicListingWhere } from "@/lib/offeringListing";
import { prisma } from "@/lib/prisma";
import { VENDOR_STATUS } from "@/lib/roles";

import type { MarketplaceMapVendor } from "@/components/MarketplaceMap";

export const metadata = {
  title: "Discover Marketplace",
};

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  await publishDueScheduledOfferings(prisma);

  const vendorsRaw = await prisma.vendorProfile.findMany({
    where: { status: VENDOR_STATUS.APPROVED },
    include: {
      listings: {
        where: publicListingRelationWhere,
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const featuredVendors = [...vendorsRaw].sort((a, b) => b.listings.length - a.listings.length);

  const mapVendors: MarketplaceMapVendor[] = featuredVendors
    .filter(
      (v) =>
        v.latitude != null &&
        v.longitude != null &&
        Number.isFinite(v.latitude) &&
        Number.isFinite(v.longitude),
    )
    .map((v) => ({
      id: v.id,
      displayName: v.displayName,
      latitude: v.latitude as number,
      longitude: v.longitude as number,
    }));

  const listings = await prisma.listing.findMany({
    where: publicListingWhere,
    include: {
      vendorProfile: { select: { id: true, displayName: true, profileImageUrl: true } },
      offering: { select: { paymentUrl: true, productUrl: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <Container className="px-4 py-10 sm:px-6 sm:py-16">
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold tracking-tight text-fix-heading sm:text-3xl md:text-4xl">
          Discover Marketplace
        </h1>
        <div className="mt-4 max-w-sm">
          <RoleCtaButton
            role="vendor"
            href="/account/vendor/apply"
            label="Become a Vendor"
            icon={<Store className="h-5 w-5" aria-hidden />}
          />
        </div>
        <p className="mt-3 text-sm leading-relaxed text-fix-text-muted sm:text-base">
          Discover approved local vendors, see who is growing near you, and browse what they have
          available right now.
        </p>
      </div>

      <div className="mt-8">
        <h2 className="sr-only">Vendor map</h2>
        <MarketplaceMapDynamic vendors={mapVendors} />
        {mapVendors.length === 0 ? (
          <p className="mt-3 text-sm text-fix-text-muted">
            Map pins appear when vendors add latitude and longitude to their vendor profile.
          </p>
        ) : null}
      </div>

      <DiscoverBrowse
        vendors={featuredVendors.map((v) => ({
          id: v.id,
          displayName: v.displayName,
          bio: v.bio,
          pickupLocation: v.pickupLocation,
          website: v.website,
          profileImageUrl: v.profileImageUrl,
          listingsCount: v.listings.length,
        }))}
        listings={listings.map((l) => ({
          id: l.id,
          title: l.title,
          description: l.description,
          priceCents: l.priceCents,
          listingType: l.listingType,
          category: l.category,
          imageUrl: l.imageUrl,
          vendorProfile: l.vendorProfile,
          offering: l.offering,
        }))}
      />
    </Container>
  );
}

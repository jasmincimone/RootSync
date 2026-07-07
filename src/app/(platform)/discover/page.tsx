import { Suspense } from "react";
import { Store } from "lucide-react";

import { Container } from "@/components/Container";
import { DiscoverBrowse } from "@/components/DiscoverBrowse";
import { RoleCtaButton } from "@/components/RoleCtaButton";
import { MarketplaceMapDynamic } from "@/components/MarketplaceMapDynamic";
import { publicDirectoryWhere } from "@/lib/directory/syncUsdaDirectory";
import { directoryToMapPins, vendorsToMapPins } from "@/lib/discoverMap";
import { publishDueScheduledOfferings } from "@/lib/publishScheduledOfferings";
import { publicListingRelationWhere, publicListingWhere } from "@/lib/offeringListing";
import { prisma } from "@/lib/prisma";
import { VENDOR_STATUS } from "@/lib/roles";

import type { DiscoverMapPin } from "@/lib/discoverMap";

export const metadata = {
  title: "Discover Marketplace",
};

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  await publishDueScheduledOfferings(prisma);

  const [vendorsRaw, listings, directoryRows] = await Promise.all([
    prisma.vendorProfile.findMany({
      where: { status: VENDOR_STATUS.APPROVED },
      include: {
        listings: {
          where: publicListingRelationWhere,
          select: { id: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.listing.findMany({
      where: publicListingWhere,
      include: {
        vendorProfile: { select: { id: true, displayName: true, profileImageUrl: true } },
        offering: {
          select: {
            paymentUrl: true,
            productUrl: true,
            resourceDetails: { select: { resourceSubtype: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.directoryListing.findMany({
      where: publicDirectoryWhere,
      orderBy: { name: "asc" },
    }),
  ]);

  const featuredVendors = [...vendorsRaw].sort((a, b) => b.listings.length - a.listings.length);

  const mapPins: DiscoverMapPin[] = [
    ...vendorsToMapPins(
      featuredVendors
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
        })),
    ),
    ...directoryToMapPins(
      directoryRows
        .filter(
          (d) =>
            d.latitude != null &&
            d.longitude != null &&
            Number.isFinite(d.latitude) &&
            Number.isFinite(d.longitude),
        )
        .map((d) => ({
          id: d.id,
          name: d.name,
          latitude: d.latitude as number,
          longitude: d.longitude as number,
        })),
    ),
  ];

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
          Discover verified local vendors, browse directory listings from the USDA local food
          network, and see what is available near you.
        </p>
      </div>

      <div className="mt-8">
        <h2 className="sr-only">Discover map</h2>
        <MarketplaceMapDynamic pins={mapPins} />
        {mapPins.length === 0 ? (
          <p className="mt-3 text-sm text-fix-text-muted">
            Map pins appear for vendors with coordinates and imported directory listings.
          </p>
        ) : (
          <p className="mt-3 text-xs text-fix-text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-forest align-middle" /> Vendor
            <span className="ml-4 inline-block h-2.5 w-2.5 rounded-full border-2 border-amber bg-fix-surface align-middle" />{" "}
            Directory
          </p>
        )}
      </div>

      <Suspense fallback={<p className="mt-8 text-sm text-fix-text-muted">Loading browse…</p>}>
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
            offering: {
              paymentUrl: l.offering.paymentUrl,
              productUrl: l.offering.productUrl,
              resourceSubtype: l.offering.resourceDetails?.resourceSubtype ?? null,
            },
          }))}
          directory={directoryRows.map((d) => ({
            id: d.id,
            name: d.name,
            description: d.description,
            directoryType: d.directoryType,
            city: d.city,
            state: d.state,
            zip: d.zip,
            website: d.website,
            addressLine1: d.addressLine1,
          }))}
        />
      </Suspense>
    </Container>
  );
}

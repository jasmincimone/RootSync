import { Suspense } from "react";
import { Store } from "lucide-react";

import { Container } from "@/components/Container";
import { DiscoverMarketplace } from "@/components/DiscoverMarketplace";
import { PageLoading } from "@/components/PageLoading";
import { RoleCtaButton } from "@/components/RoleCtaButton";
import { publishDueScheduledOfferingsBestEffort } from "@/lib/publishScheduledOfferings";
import { publicListingRelationWhere, publicListingWhere } from "@/lib/offeringListing";
import { prisma } from "@/lib/prisma";
import { VENDOR_STATUS } from "@/lib/roles";

export const metadata = {
  title: "Discover Marketplace",
};

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  await publishDueScheduledOfferingsBestEffort(prisma);

  const [vendorsRaw, listings] = await Promise.all([
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
  ]);

  const featuredVendors = [...vendorsRaw].sort((a, b) => b.listings.length - a.listings.length);

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

      <Suspense fallback={<PageLoading contained={false} label="Loading browse" />}>
        <DiscoverMarketplace
          vendors={featuredVendors.map((v) => ({
            id: v.id,
            displayName: v.displayName,
            bio: v.bio,
            pickupLocation: v.pickupLocation,
            website: v.website,
            profileImageUrl: v.profileImageUrl,
            listingsCount: v.listings.length,
            latitude: v.latitude,
            longitude: v.longitude,
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
        />
      </Suspense>
    </Container>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { getServerSession } from "next-auth";

import { Container } from "@/components/Container";
import { DiscoverMarketplace } from "@/components/DiscoverMarketplace";
import { PageLoading } from "@/components/PageLoading";
import { PlatformIllustrationBanner } from "@/components/PlatformIllustrationBanner";
import { authOptions } from "@/lib/authOptions";
import { listSavedFavorites } from "@/lib/favorites";
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

  const session = await getServerSession(authOptions);

  const [vendorsRaw, listings, favorites] = await Promise.all([
    prisma.vendorProfile.findMany({
      where: { status: VENDOR_STATUS.APPROVED },
      include: {
        listings: {
          where: publicListingRelationWhere,
          select: { id: true },
        },
        user: {
          select: {
            pulseScore: { select: { totalScore: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.listing.findMany({
      where: publicListingWhere,
      include: {
        vendorProfile: { select: { id: true, publicSlug: true, displayName: true, profileImageUrl: true } },
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
    session?.user?.id ? listSavedFavorites(session.user.id) : Promise.resolve(null),
  ]);

  const featuredVendors = [...vendorsRaw].sort((a, b) => {
    const scoreDiff = (b.user.pulseScore?.totalScore ?? 0) - (a.user.pulseScore?.totalScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return b.listings.length - a.listings.length;
  });

  return (
    <Container className="px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <PlatformIllustrationBanner
          src="/images/discover/hero-community.png"
          alt="Neighbors at a sunny farmers market and community garden — shopping local and growing together."
          width={1376}
          height={768}
          fit="cover"
          className="discover-hero-rise"
        />
        <div className="mt-8 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-fix-heading sm:text-3xl md:text-4xl">
            Discover Marketplace
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-fix-text-muted sm:text-base">
            Find what&apos;s local — Verified Vendors, marketplace listings, and directory places near
            you.
          </p>
          <p className="mt-2 text-sm text-fix-text-muted">
            <span className="font-medium text-fix-heading">Verified Vendors</span> are reviewed by
            RootSync.{" "}
            <span className="font-medium text-fix-heading">Directory</span> listings come from the
            public local food network until claimed.
          </p>
          <p className="mt-4 text-sm text-fix-text-muted">
            Sell locally?{" "}
            <Link
              href="/account/vendor/apply"
              className="font-medium text-fix-link hover:text-fix-link-hover hover:underline"
            >
              Become a Vendor
            </Link>
          </p>
        </div>
      </div>

      <Suspense fallback={<PageLoading contained={false} label="Loading browse" />}>
        <DiscoverMarketplace
          vendors={featuredVendors.map((v) => ({
            id: v.id,
            publicSlug: v.publicSlug,
            displayName: v.displayName,
            bio: v.bio,
            pickupLocation: v.pickupLocation,
            website: v.website,
            profileImageUrl: v.profileImageUrl,
            listingsCount: v.listings.length,
            latitude: v.latitude,
            longitude: v.longitude,
            pulseScore: v.user.pulseScore?.totalScore ?? 0,
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
          favorites={
            favorites
              ? favorites.map((f) => ({
                  id: f.id,
                  targetType: f.targetType,
                  targetId: f.targetId,
                  title: f.title,
                  subtitle: f.subtitle,
                  href: f.href,
                  imageUrl: f.imageUrl,
                }))
              : null
          }
        />
      </Suspense>
    </Container>
  );
}

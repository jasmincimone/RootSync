import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { Container } from "@/components/Container";
import { FavoriteButton } from "@/components/FavoriteButton";
import { DiscoverDetailBackLink } from "@/components/DiscoverDetailBackLink";
import { DiscoverDetailTopBack } from "@/components/DiscoverDetailTopBack";
import { MarketplaceMapDynamic } from "@/components/MarketplaceMapDynamic";
import { MessageVendorLink } from "@/components/MessageVendorLink";
import { MarketplaceListingCheckoutActions } from "@/components/MarketplaceListingCheckoutActions";
import { ListingImage } from "@/components/ListingImage";
import { ProfileHeroMetaRow } from "@/components/profile/ProfileHeroMetaRow";
import { ProfilePulseFeedSection } from "@/components/profile/ProfilePulseFeedSection";
import { ProfileSectionNav, type ProfileSectionLink } from "@/components/profile/ProfileSectionNav";
import { PulseRatingBadge } from "@/components/pulse/PulseRatingDisplay";
import { VendorPulseReviewsSection } from "@/components/pulse/VendorPulseReviewsSection";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { ShopMediaCarousel } from "@/components/ShopMediaCarousel";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedVendorBadge } from "@/components/VerifiedVendorBadge";
import { discoverListingPath, discoverVendorPath } from "@/config/discoverPaths";
import { authOptions } from "@/lib/authOptions";
import { isFavorited } from "@/lib/favorites";
import { resolveDiscoverBackLink, withDiscoverReturnTo } from "@/lib/discoverReturn";
import { communityAuthorSelect } from "@/lib/userProfileDisplay";
import { formatPrice } from "@/lib/format";
import { publicListingRelationWhere } from "@/lib/offeringListing";
import { prisma } from "@/lib/prisma";
import { parsePulsePostMediaJson } from "@/lib/pulsePostMedia";
import { loadVendorPulseReviews, loadVendorPulseSummary } from "@/lib/pulse/vendorReviews";
import { FAVORITE_TARGET_TYPE, VENDOR_STATUS, PULSE_POST_STATUS } from "@/lib/roles";
import { loadVendorCarousel } from "@/lib/vendorCarousel";
import { findVendorProfileByPublicRef, vendorPublicRefWhere } from "@/lib/vendorPublicResolve";
import { isVendorCuidRef } from "@/lib/vendorPublicSlug";

import type { Prisma } from "@prisma/client";
import { vendorsToMapPins } from "@/lib/discoverMap";

const publicVendorInclude = {
  listings: {
    where: publicListingRelationWhere,
    include: {
      offering: { select: { paymentUrl: true, productUrl: true } },
    },
    orderBy: { updatedAt: "desc" as const },
  },
} satisfies Prisma.VendorProfileInclude;

async function loadVendorForPage(publicRef: string, viewerUserId: string | undefined) {
  const vendor = await findVendorProfileByPublicRef(publicRef, publicVendorInclude);
  if (!vendor) {
    return null;
  }
  if (vendor.status === VENDOR_STATUS.APPROVED) {
    return { vendor, isOwnerPreview: false as const };
  }
  if (viewerUserId && vendor.userId === viewerUserId) {
    return { vendor, isOwnerPreview: true as const };
  }
  return null;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendor = await prisma.vendorProfile.findFirst({
    where: { ...vendorPublicRefWhere(id), status: VENDOR_STATUS.APPROVED },
    select: { displayName: true, bio: true },
  });
  if (!vendor) return { title: "Vendor" };

  const description =
    vendor.bio && vendor.bio.length > 160
      ? `${vendor.bio.slice(0, 157)}…`
      : vendor.bio ?? `Shop with ${vendor.displayName} on Discover Marketplace.`;

  return {
    title: `${vendor.displayName} · Discover`,
    description,
  };
}

export default async function PublicVendorProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const discoverBack = resolveDiscoverBackLink(returnTo);
  const session = await getServerSession(authOptions);
  const loaded = await loadVendorForPage(id, session?.user?.id);
  if (!loaded) notFound();
  const { vendor, isOwnerPreview } = loaded;

  if (vendor.publicSlug && isVendorCuidRef(id)) {
    const canonical = discoverVendorPath(vendor);
    permanentRedirect(
      returnTo ? `${canonical}?returnTo=${encodeURIComponent(returnTo)}` : canonical,
    );
  }

  const favoriteSaved = await isFavorited(
    session?.user?.id,
    FAVORITE_TARGET_TYPE.VENDOR,
    vendor.id,
  );

  const mediaCarousel = await loadVendorCarousel(vendor.id);

  const hasCoords =
    vendor.latitude != null &&
    vendor.longitude != null &&
    Number.isFinite(vendor.latitude) &&
    Number.isFinite(vendor.longitude);

  const mapPins = hasCoords
    ? vendorsToMapPins([
        {
          id: vendor.id,
          displayName: vendor.displayName,
          latitude: vendor.latitude as number,
          longitude: vendor.longitude as number,
        },
      ])
    : [];

  const communityPosts = await prisma.communityPost.findMany({
    where: { authorId: vendor.userId, status: PULSE_POST_STATUS.PUBLISHED },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      author: { select: communityAuthorSelect },
    },
  });

  const [pulseSummary, pulseReviews] = await Promise.all([
    loadVendorPulseSummary(vendor.id),
    loadVendorPulseReviews(vendor.id, 10),
  ]);

  const profileSections: ProfileSectionLink[] = [
    ...(vendor.bio ? [{ id: "vendor-about", label: "About" }] : []),
    ...(hasCoords ? [{ id: "vendor-location-heading", label: "Location" }] : []),
    { id: "vendor-listings-heading", label: "Listings" },
    ...(!isOwnerPreview ? [{ id: "vendor-pulse-reviews-heading", label: "Pulse reviews" }] : []),
    { id: "vendor-pulse-heading", label: "Check The Pulse" },
  ];

  return (
    <div>
      <section className="border-b border-fix-border/15 bg-gradient-to-b from-fix-bg-muted/60 via-fix-bg-muted/30 to-fix-surface">
        <Container className="px-4 py-6 sm:px-6 sm:py-10">
          <DiscoverDetailTopBack returnTo={returnTo} title={vendor.displayName} />
          <nav className="text-xs text-fix-text-muted sm:text-sm">
            <Link href={discoverBack.href} className="text-fix-link hover:text-fix-link-hover">
              {discoverBack.backLabel}
            </Link>
            <span className="mx-1.5 sm:mx-2">/</span>
            <span className="text-fix-heading">{vendor.displayName}</span>
          </nav>

          {isOwnerPreview ? (
            <Card className="mt-4 border-amber/35 bg-fix-bg-muted/60 p-3 sm:mt-5 sm:p-4">
              <p className="text-sm leading-relaxed text-fix-heading">
                <span className="font-semibold">Preview only.</span> Your vendor status is{" "}
                <span className="font-medium">{vendor.status}</span>. The public Discover feed only lists approved
                vendors—this page is visible to you while signed in so you can check how your profile will look.
              </p>
            </Card>
          ) : null}

          <div className="mt-5 flex flex-col gap-5 sm:mt-6 sm:flex-row sm:items-start sm:gap-6">
            <UserAvatar
              src={vendor.profileImageUrl}
              name={vendor.displayName}
              size="xl"
              className="mx-auto sm:mx-0"
            />
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <div className="flex items-start justify-center gap-3 sm:justify-start">
                <h1 className="text-2xl font-bold tracking-tight text-fix-heading sm:text-3xl md:text-4xl">
                  {vendor.displayName}
                </h1>
                {!isOwnerPreview ? (
                  <FavoriteButton
                    targetType={FAVORITE_TARGET_TYPE.VENDOR}
                    targetId={vendor.id}
                    initialSaved={favoriteSaved}
                    signedIn={Boolean(session?.user?.id)}
                    size="sm"
                  />
                ) : null}
              </div>
              {!isOwnerPreview ? (
                <ProfileHeroMetaRow>
                  <VerifiedVendorBadge explain />
                  <PulseRatingBadge
                    averageRating={pulseSummary.averageRating}
                    reviewCount={pulseSummary.reviewCount}
                  />
                </ProfileHeroMetaRow>
              ) : null}
              {vendor.pickupLocation ? (
                <p className="mt-2 text-sm text-fix-text-muted sm:text-base">{vendor.pickupLocation}</p>
              ) : null}
              {vendor.contactEmail ? (
                <p className="mt-2 text-sm text-fix-text-muted">
                  <span className="sm:hidden">Contact: </span>
                  <a
                    href={`mailto:${vendor.contactEmail}`}
                    className="font-medium text-fix-link hover:text-fix-link-hover sm:inline"
                  >
                    {vendor.contactEmail}
                  </a>
                </p>
              ) : null}
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
                {isOwnerPreview ? (
                  <ButtonLink
                    href="/account/vendor/profile"
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto"
                  >
                    Edit profile
                  </ButtonLink>
                ) : (
                  <MessageVendorLink
                    vendorProfileId={vendor.id}
                    variant="primary"
                    size="md"
                    className="w-full sm:w-auto"
                  />
                )}
                {vendor.website ? (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 w-full items-center justify-center rounded-full bg-fix-surface px-5 text-sm font-medium text-fix-heading ring-1 ring-inset ring-fix-border/20 transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-amber focus:outline-none focus-visible:ring-offset-2 focus-visible:ring-offset-clay sm:w-auto"
                  >
                    Visit website
                  </a>
                ) : null}
                <DiscoverDetailBackLink
                  returnTo={returnTo}
                  variant="button"
                  className="w-full sm:w-auto"
                />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {mediaCarousel.length > 0 ? (
        <section className="border-b border-fix-border/15 bg-fix-bg-muted/25">
          <Container className="px-4 py-6 sm:px-6 sm:py-10">
            <ShopMediaCarousel items={mediaCarousel} />
          </Container>
        </section>
      ) : null}

      <Container className="px-4 py-8 sm:px-6 sm:py-12">
        <ProfileSectionNav sections={profileSections} className="mb-8 sm:mb-10" />

        {vendor.bio ? (
          <section aria-labelledby="vendor-about">
            <h2
              id="vendor-about"
              className="text-base font-semibold tracking-tight text-fix-heading sm:text-lg"
            >
              About
            </h2>
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-fix-text-muted sm:text-base sm:leading-7">
              {vendor.bio}
            </p>
          </section>
        ) : null}

        {hasCoords ? (
          <section
            className={vendor.bio ? "mt-10 sm:mt-12" : ""}
            aria-labelledby="vendor-location-heading"
          >
            <h2
              id="vendor-location-heading"
              className="text-base font-semibold tracking-tight text-fix-heading sm:text-lg"
            >
              Location
            </h2>
            <p className="mt-1 text-sm text-fix-text-muted">
              Pin shows where this vendor is based (from their profile).
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl ring-1 ring-fix-border/15">
              <MarketplaceMapDynamic pins={mapPins} compact />
            </div>
          </section>
        ) : null}

        <section
          className={vendor.bio || hasCoords ? "mt-10 sm:mt-12" : ""}
          aria-labelledby="vendor-listings-heading"
        >
          <h2
            id="vendor-listings-heading"
            className="text-base font-semibold tracking-tight text-fix-heading sm:text-lg"
          >
            Listings
          </h2>
          <p className="mt-1 text-sm text-fix-text-muted">
            Published listings from this vendor.
          </p>
          {vendor.listings.length === 0 ? (
            <EmptyState
              bordered={false}
              title="No published listings yet"
              description="This vendor hasn't published any offerings on Discover."
            />
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {vendor.listings.map((listing) => {
                const listingHref = withDiscoverReturnTo(
                  discoverListingPath(listing.id),
                  discoverVendorPath(vendor),
                );
                return (
                <li key={listing.id}>
                  <Card className="flex h-full gap-4 overflow-hidden p-4">
                    <Link
                      href={listingHref}
                      className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-fix-border/15 bg-fix-bg-muted outline-none ring-fix-cta transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
                      aria-label={`View ${listing.title}`}
                    >
                      {listing.imageUrl ? (
                        <ListingImage src={listing.imageUrl} alt="" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] text-fix-text-muted">
                          View
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={listingHref}
                        className="font-medium text-fix-heading hover:text-fix-link hover:underline"
                      >
                        {listing.title}
                      </Link>
                      <div className="mt-1 text-sm font-medium text-fix-text">
                        {formatPrice(listing.priceCents)}
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm text-fix-text-muted">
                        {listing.description}
                      </p>
                      <div className="mt-3">
                        <MarketplaceListingCheckoutActions
                          listingId={listing.id}
                          listingType={listing.listingType}
                          returnTo={discoverVendorPath(vendor)}
                          compact
                        />
                      </div>
                    </div>
                  </Card>
                </li>
                );
              })}
            </ul>
          )}
        </section>

        {!isOwnerPreview ? (
          <section className="mt-10 sm:mt-12">
            <VendorPulseReviewsSection summary={pulseSummary} reviews={pulseReviews} />
          </section>
        ) : null}

        <ProfilePulseFeedSection
          headingId="vendor-pulse-heading"
          displayName={vendor.displayName}
          posts={communityPosts.map((p) => ({
            ...p,
            media: parsePulsePostMediaJson(p.mediaJson),
          }))}
          messageUserId={vendor.userId}
          className="mt-10 sm:mt-12"
        />
      </Container>
    </div>
  );
}

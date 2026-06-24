import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { CommunityPostRoleBadge } from "@/components/CommunityPostRoleBadge";
import { Container } from "@/components/Container";
import { MarketplaceMapDynamic } from "@/components/MarketplaceMapDynamic";
import { MessageUserLink } from "@/components/MessageUserLink";
import { MessageVendorLink } from "@/components/MessageVendorLink";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { ShopMediaCarousel } from "@/components/ShopMediaCarousel";
import { authOptions } from "@/lib/authOptions";
import { formatCommunityDate, formatCommunityDateTime } from "@/lib/formatCommunityDate";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, VENDOR_STATUS } from "@/lib/roles";
import { loadVendorCarousel } from "@/lib/vendorCarousel";

import type { Prisma } from "@prisma/client";
import type { MarketplaceMapVendor } from "@/components/MarketplaceMap";

const publicVendorInclude = {
  listings: {
    where: { status: LISTING_STATUS.PUBLISHED },
    orderBy: { updatedAt: "desc" as const },
  },
} satisfies Prisma.VendorProfileInclude;

async function loadVendorForPage(profileId: string, viewerUserId: string | undefined) {
  const approved = await prisma.vendorProfile.findFirst({
    where: { id: profileId, status: VENDOR_STATUS.APPROVED },
    include: publicVendorInclude,
  });
  if (approved) {
    return { vendor: approved, isOwnerPreview: false as const };
  }
  if (!viewerUserId) {
    return null;
  }
  const own = await prisma.vendorProfile.findFirst({
    where: { id: profileId, userId: viewerUserId },
    include: publicVendorInclude,
  });
  if (!own) {
    return null;
  }
  return { vendor: own, isOwnerPreview: true as const };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vendor = await prisma.vendorProfile.findFirst({
    where: { id, status: VENDOR_STATUS.APPROVED },
    select: { displayName: true, bio: true },
  });
  if (!vendor) return { title: "Vendor" };

  const description =
    vendor.bio && vendor.bio.length > 160
      ? `${vendor.bio.slice(0, 157)}…`
      : vendor.bio ?? `Shop with ${vendor.displayName} on The Fix Collective marketplace.`;

  return {
    title: `${vendor.displayName} · Marketplace`,
    description,
  };
}

export default async function PublicVendorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const loaded = await loadVendorForPage(id, session?.user?.id);
  if (!loaded) notFound();
  const { vendor, isOwnerPreview } = loaded;

  const mediaCarousel = await loadVendorCarousel(vendor.id);

  const hasCoords =
    vendor.latitude != null &&
    vendor.longitude != null &&
    Number.isFinite(vendor.latitude) &&
    Number.isFinite(vendor.longitude);

  const mapVendors: MarketplaceMapVendor[] = hasCoords
    ? [
        {
          id: vendor.id,
          displayName: vendor.displayName,
          latitude: vendor.latitude as number,
          longitude: vendor.longitude as number,
        },
      ]
    : [];

  const communityPosts = await prisma.communityPost.findMany({
    where: { authorId: vendor.userId },
    orderBy: { updatedAt: "desc" },
    take: 30,
    include: {
      author: { select: { id: true, role: true } },
    },
  });

  return (
    <div>
      <section className="border-b border-fix-border/15">
        <Container className="py-8 sm:py-10">
          <nav className="text-sm text-fix-text-muted">
            <Link href="/marketplace" className="text-fix-link hover:text-fix-link-hover">
              Marketplace
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fix-heading">{vendor.displayName}</span>
          </nav>

          {isOwnerPreview ? (
            <Card className="mt-5 border-amber/35 bg-fix-bg-muted/60 p-4">
              <p className="text-sm text-fix-heading">
                <span className="font-semibold">Preview only.</span> Your vendor status is{" "}
                <span className="font-medium">{vendor.status}</span>. The public marketplace only lists approved
                vendors—this page is visible to you while signed in so you can check how your profile will look.
              </p>
            </Card>
          ) : null}

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
                {vendor.displayName}
              </h1>
              {vendor.pickupLocation ? (
                <p className="mt-2 text-base text-fix-text-muted">{vendor.pickupLocation}</p>
              ) : null}
              {vendor.contactEmail ? (
                <p className="mt-2 text-sm text-fix-text-muted">
                  Contact:{" "}
                  <a
                    href={`mailto:${vendor.contactEmail}`}
                    className="font-medium text-fix-link hover:text-fix-link-hover"
                  >
                    {vendor.contactEmail}
                  </a>
                </p>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {isOwnerPreview ? (
                  <ButtonLink href="/account/vendor/profile" variant="primary" size="md">
                    Edit profile
                  </ButtonLink>
                ) : (
                  <MessageVendorLink vendorProfileId={vendor.id} variant="primary" size="md" />
                )}
                {vendor.website ? (
                  <a
                    href={vendor.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-fix-surface px-5 text-sm font-medium text-fix-heading ring-1 ring-inset ring-fix-border/20 transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-clay"
                  >
                    Visit website
                  </a>
                ) : null}
                <ButtonLink href="/marketplace" variant="ghost" size="md">
                  ← All vendors
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {mediaCarousel.length > 0 ? (
        <section className="border-b border-fix-border/15 bg-fix-bg-muted/30">
          <Container className="py-8 sm:py-10">
            <ShopMediaCarousel items={mediaCarousel} />
          </Container>
        </section>
      ) : null}

      <Container className="py-10 sm:py-12">
        {vendor.bio ? (
          <section aria-labelledby="vendor-about">
            <h2 id="vendor-about" className="text-lg font-semibold text-fix-heading">
              About
            </h2>
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-base leading-relaxed text-fix-text-muted">
              {vendor.bio}
            </p>
          </section>
        ) : null}

        {hasCoords ? (
          <section
            className={vendor.bio ? "mt-12" : ""}
            aria-labelledby="vendor-location-heading"
          >
            <h2 id="vendor-location-heading" className="text-lg font-semibold text-fix-heading">
              Location
            </h2>
            <p className="mt-1 text-sm text-fix-text-muted">
              Pin shows where this vendor is based (from their profile).
            </p>
            <div className="mt-4">
              <MarketplaceMapDynamic vendors={mapVendors} compact />
            </div>
          </section>
        ) : null}

        <section
          className={vendor.bio || hasCoords ? "mt-12" : ""}
          aria-labelledby="vendor-listings-heading"
        >
          <h2 id="vendor-listings-heading" className="text-lg font-semibold text-fix-heading">
            Listings
          </h2>
          <p className="mt-1 text-sm text-fix-text-muted">
            Published products from this vendor.
          </p>
          {vendor.listings.length === 0 ? (
            <Card className="mt-6 p-6">
              <p className="text-sm text-fix-text-muted">No published listings yet.</p>
            </Card>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {vendor.listings.map((listing) => (
                <li key={listing.id}>
                  <Card className="flex h-full gap-4 overflow-hidden p-4">
                    <Link
                      href={`/marketplace/listings/${listing.id}`}
                      className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-fix-border/15 bg-fix-bg-muted outline-none ring-fix-cta transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
                      aria-label={`View ${listing.title}`}
                    >
                      {listing.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- public uploads or external URLs
                        <img
                          src={listing.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-[10px] text-fix-text-muted">
                          View
                        </span>
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/marketplace/listings/${listing.id}`}
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
                      <div className="mt-3 flex flex-wrap gap-2">
                        {listing.paymentUrl ? (
                          <a
                            href={listing.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-fit rounded-full bg-fix-cta px-4 py-2 text-sm font-medium text-fix-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 focus-visible:ring-offset-clay"
                          >
                            Pay / checkout
                          </a>
                        ) : null}
                        {listing.productUrl ? (
                          <a
                            href={listing.productUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={
                              listing.paymentUrl
                                ? "inline-flex w-fit items-center rounded-full border border-fix-border/25 bg-fix-surface px-4 py-2 text-sm font-medium text-fix-link ring-1 ring-inset ring-fix-border/15 hover:bg-fix-bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2"
                                : "inline-flex w-fit rounded-full bg-fix-cta px-4 py-2 text-sm font-medium text-fix-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 focus-visible:ring-offset-clay"
                            }
                          >
                            {listing.paymentUrl ? "Product page" : "View product"}
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12" aria-labelledby="vendor-community-heading">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="vendor-community-heading" className="text-lg font-semibold text-fix-heading">
                Community posts
              </h2>
              <p className="mt-1 text-sm text-fix-text-muted">
                Public updates from {vendor.displayName} on the{" "}
                <Link href="/community" className="font-medium text-fix-link hover:text-fix-link-hover">
                  community feed
                </Link>
                .
              </p>
            </div>
            <MessageUserLink targetUserId={vendor.userId} className="shrink-0" />
          </div>
          {communityPosts.length === 0 ? (
            <Card className="mt-6 p-6">
              <p className="text-sm text-fix-text-muted">No community posts yet.</p>
            </Card>
          ) : (
            <ul className="mt-6 space-y-4">
              {communityPosts.map((p) => (
                <li key={p.id}>
                  <Card className="p-5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fix-text-muted">
                      <CommunityPostRoleBadge
                        roleAtPost={p.roleAtPost}
                        showVendorBadge={p.showVendorBadge}
                        authorRole={p.author.role}
                      />
                      <span>{formatCommunityDate(p.createdAt.toISOString())}</span>
                      {p.editedAt ? (
                        <>
                          <span>·</span>
                          <span>Edited {formatCommunityDateTime(p.editedAt.toISOString())}</span>
                        </>
                      ) : null}
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fix-text">
                      {p.content}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </div>
  );
}

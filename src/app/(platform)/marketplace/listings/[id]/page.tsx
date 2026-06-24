import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { Container } from "@/components/Container";
import { MessageVendorLink } from "@/components/MessageVendorLink";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { authOptions } from "@/lib/authOptions";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, VENDOR_STATUS } from "@/lib/roles";

export const dynamic = "force-dynamic";

async function loadListingForPage(listingId: string, viewerUserId: string | undefined) {
  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: {
      vendorProfile: {
        select: {
          id: true,
          userId: true,
          displayName: true,
          status: true,
          pickupLocation: true,
          website: true,
        },
      },
    },
  });
  if (!listing) return null;

  const published = listing.status === LISTING_STATUS.PUBLISHED;
  const vendorOk = listing.vendorProfile.status === VENDOR_STATUS.APPROVED;
  const isOwner = !!viewerUserId && listing.vendorProfile.userId === viewerUserId;

  if (published && vendorOk) {
    return { listing, isOwnerPreview: false as const };
  }
  if (isOwner) {
    return { listing, isOwnerPreview: true as const };
  }
  return null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const loaded = await loadListingForPage(id, session?.user?.id);
  if (!loaded) return { title: "Listing" };

  const { listing } = loaded;
  const desc =
    listing.description.length > 160
      ? `${listing.description.slice(0, 157).trim()}…`
      : listing.description;

  return {
    title: `${listing.title} · Marketplace`,
    description: desc,
  };
}

export default async function MarketplaceListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const loaded = await loadListingForPage(id, session?.user?.id);
  if (!loaded) notFound();

  const { listing, isOwnerPreview } = loaded;
  const v = listing.vendorProfile;

  return (
    <div>
      <section className="border-b border-fix-border/15">
        <Container className="py-8 sm:py-12">
          <nav className="text-sm text-fix-text-muted">
            <Link href="/marketplace" className="text-fix-link hover:text-fix-link-hover">
              Marketplace
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/marketplace/vendors/${v.id}`}
              className="text-fix-link hover:text-fix-link-hover"
            >
              {v.displayName}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fix-heading">{listing.title}</span>
          </nav>

          {isOwnerPreview ? (
            <Card className="mt-5 border-amber/35 bg-fix-bg-muted/60 p-4">
              <p className="text-sm text-fix-heading">
                <span className="font-semibold">Preview only.</span>{" "}
                {listing.status !== LISTING_STATUS.PUBLISHED ? (
                  <>
                    This listing is <span className="font-medium">{listing.status}</span> and is not
                    shown on the public marketplace until it is published.
                  </>
                ) : v.status !== VENDOR_STATUS.APPROVED ? (
                  <>
                    Your vendor profile is <span className="font-medium">{v.status}</span>. The
                    public marketplace only surfaces listings from approved vendors.
                  </>
                ) : (
                  <>Signed-in preview of your listing.</>
                )}
              </p>
            </Card>
          ) : null}

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div className="overflow-hidden rounded-2xl border border-fix-border/15 bg-fix-bg-muted aspect-[4/3] lg:aspect-square">
              {listing.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- vendor uploads or external URLs
                <img
                  src={listing.imageUrl}
                  alt={listing.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-sm text-fix-text-muted">
                  No image
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                {listing.category?.trim() ? (
                  <span className="rounded-full bg-fix-border/20 px-2.5 py-1 text-xs font-medium text-fix-heading">
                    {listing.category.trim()}
                  </span>
                ) : null}
                <span className="rounded-full bg-fix-bg-muted px-2.5 py-1 text-xs text-fix-text-muted">
                  Marketplace listing
                </span>
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-fix-heading sm:text-3xl">
                {listing.title}
              </h1>
              <p className="mt-2 text-xl font-semibold text-fix-heading">
                {formatPrice(listing.priceCents)}
              </p>

              <section className="mt-6" aria-labelledby="listing-description">
                <h2 id="listing-description" className="sr-only">
                  Description
                </h2>
                <p className="whitespace-pre-wrap text-base leading-relaxed text-fix-text-muted">
                  {listing.description}
                </p>
              </section>

              <section className="mt-8 border-t border-fix-border/15 pt-6" aria-labelledby="listing-vendor">
                <h2 id="listing-vendor" className="text-sm font-semibold text-fix-heading">
                  Seller
                </h2>
                <p className="mt-2">
                  <Link
                    href={`/marketplace/vendors/${v.id}`}
                    className="font-medium text-fix-link hover:text-fix-link-hover"
                  >
                    {v.displayName}
                  </Link>
                </p>
                {v.pickupLocation ? (
                  <p className="mt-1 text-sm text-fix-text-muted">{v.pickupLocation}</p>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  {isOwnerPreview ? (
                    <ButtonLink href={`/account/vendor/listings/${listing.id}/edit`} variant="primary" size="md">
                      Edit listing
                    </ButtonLink>
                  ) : (
                    <MessageVendorLink vendorProfileId={v.id} variant="primary" size="md" />
                  )}
                  {v.website ? (
                    <a
                      href={v.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center justify-center rounded-full bg-fix-surface px-5 text-sm font-medium text-fix-heading ring-1 ring-inset ring-fix-border/20 transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 focus-visible:ring-offset-clay"
                    >
                      Seller website
                    </a>
                  ) : null}
                </div>
              </section>

              <div className="mt-8 flex flex-wrap gap-3">
                {listing.paymentUrl ? (
                  <a
                    href={listing.paymentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-full bg-fix-cta px-6 text-sm font-medium text-fix-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 focus-visible:ring-offset-clay"
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
                        ? "inline-flex h-11 items-center justify-center rounded-full border border-fix-border/25 bg-fix-surface px-6 text-sm font-medium text-fix-link ring-1 ring-inset ring-fix-border/15 hover:bg-fix-bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2"
                        : "inline-flex h-11 items-center justify-center rounded-full bg-fix-cta px-6 text-sm font-medium text-fix-cta-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 focus-visible:ring-offset-clay"
                    }
                  >
                    {listing.paymentUrl ? "External product page" : "View product (external)"}
                  </a>
                ) : null}
                <ButtonLink href="/marketplace" variant="secondary" size="md">
                  ← All listings
                </ButtonLink>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

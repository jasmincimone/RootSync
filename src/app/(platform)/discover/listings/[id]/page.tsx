import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { Container } from "@/components/Container";
import { MessageVendorLink } from "@/components/MessageVendorLink";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { MarketplaceListingPurchase } from "@/components/MarketplaceListingPurchase";
import { listingDisplayPrice, listingTypeLabel } from "@/lib/listingDisplay";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { LISTING_VISIBILITY, OFFERING_STATUS, VENDOR_STATUS } from "@/lib/roles";

export const dynamic = "force-dynamic";

async function loadListingForPage(listingId: string, viewerUserId: string | undefined) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      offering: {
        select: {
          status: true,
          paymentUrl: true,
          productUrl: true,
          variants: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              title: true,
              priceCents: true,
              durationMinutes: true,
              sku: true,
            },
          },
        },
      },
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

  const isPublic =
    listing.visibility === LISTING_VISIBILITY.PUBLIC &&
    listing.offering.status === OFFERING_STATUS.ACTIVE;
  const vendorOk = listing.vendorProfile.status === VENDOR_STATUS.APPROVED;
  const isOwner = !!viewerUserId && listing.vendorProfile.userId === viewerUserId;

  if (isPublic && vendorOk) {
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

function PurchasePanel({
  listing,
  offering,
  variants,
  isOwnerPreview,
  vendorId,
  className,
}: {
  listing: {
    id: string;
    title: string;
    listingType: string;
    priceCents: number;
    category: string | null;
  };
  offering: { paymentUrl: string | null; productUrl: string | null };
  variants: {
    id: string;
    title: string;
    priceCents: number;
    durationMinutes: number | null;
    sku: string | null;
  }[];
  isOwnerPreview: boolean;
  vendorId: string;
  className?: string;
}) {
  return (
    <Card className={className ?? "p-6"}>
      <div className="flex flex-wrap items-center gap-2">
        {listing.category?.trim() ? (
          <span className="rounded-full bg-fix-border/20 px-2.5 py-1 text-xs font-medium text-fix-heading">
            {listing.category.trim()}
          </span>
        ) : null}
        <span className="rounded-full bg-fix-bg-muted px-2.5 py-1 text-xs text-fix-text-muted">
          {listingTypeLabel(listing.listingType)}
        </span>
      </div>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-fix-heading sm:text-3xl">
        {listing.title}
      </h1>
      <p className="mt-2 text-xl font-semibold text-fix-heading">
        {listingDisplayPrice(listing.priceCents, variants.length)}
      </p>

      <div className="mt-6">
        {isOwnerPreview ? (
          <ButtonLink href={`/account/vendor/listings/${listing.id}/edit`} variant="cta" size="md" className="w-full justify-center">
            Edit listing
          </ButtonLink>
        ) : (
          <MarketplaceListingPurchase
            listingId={listing.id}
            listingType={listing.listingType}
            variants={variants}
            paymentUrl={offering.paymentUrl}
            productUrl={offering.productUrl}
          />
        )}
      </div>

      {!isOwnerPreview ? (
        <div className="mt-4">
          <MessageVendorLink vendorProfileId={vendorId} variant="secondary" size="sm" className="w-full justify-center" />
        </div>
      ) : null}

      <div className="mt-4 border-t border-fix-border/15 pt-4">
        <ButtonLink href="/discover" variant="ghost" size="sm" className="w-full justify-center">
          ← All listings
        </ButtonLink>
      </div>
    </Card>
  );
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
  const offering = listing.offering;
  const variants = offering.variants ?? [];

  return (
    <div>
      <section className="border-b border-fix-border/15">
        <Container className="py-8 sm:py-12">
          <nav className="text-sm text-fix-text-muted">
            <Link href="/discover" className="text-fix-link hover:text-fix-link-hover">
              Discover Marketplace
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/discover/vendors/${v.id}`}
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
                {listing.visibility !== LISTING_VISIBILITY.PUBLIC ||
                offering.status !== OFFERING_STATUS.ACTIVE ? (
                  <>
                    This offering is <span className="font-medium">{offering.status}</span> and is
                    not shown on Discover until it is active.
                  </>
                ) : v.status !== VENDOR_STATUS.APPROVED ? (
                  <>
                    Your vendor profile is <span className="font-medium">{v.status}</span>. The
                    public Discover feed only surfaces listings from approved vendors.
                  </>
                ) : (
                  <>Signed-in preview of your listing.</>
                )}
              </p>
            </Card>
          ) : null}

          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
            <div className="min-w-0 space-y-8">
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

              <div className="lg:hidden">
                <PurchasePanel
                  listing={listing}
                  offering={offering}
                  variants={variants}
                  isOwnerPreview={isOwnerPreview}
                  vendorId={v.id}
                />
              </div>

              <section aria-labelledby="listing-description">
                <h2 id="listing-description" className="text-sm font-semibold text-fix-heading">
                  About this offering
                </h2>
                <p className="mt-3 whitespace-pre-wrap text-base leading-relaxed text-fix-text-muted">
                  {listing.description}
                </p>
              </section>

              <section aria-labelledby="listing-vendor" className="border-t border-fix-border/15 pt-6">
                <h2 id="listing-vendor" className="text-sm font-semibold text-fix-heading">
                  Vendor
                </h2>
                <p className="mt-2">
                  <Link
                    href={`/discover/vendors/${v.id}`}
                    className="font-medium text-fix-link hover:text-fix-link-hover"
                  >
                    {v.displayName}
                  </Link>
                </p>
                {v.pickupLocation ? (
                  <p className="mt-1 text-sm text-fix-text-muted">{v.pickupLocation}</p>
                ) : null}
                {v.website ? (
                  <a
                    href={v.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-sm font-medium text-fix-link hover:text-fix-link-hover"
                  >
                    Vendor website →
                  </a>
                ) : null}
              </section>
            </div>

            <div className="hidden lg:block">
              <div className="sticky top-28">
                <PurchasePanel
                  listing={listing}
                  offering={offering}
                  variants={variants}
                  isOwnerPreview={isOwnerPreview}
                  vendorId={v.id}
                />
              </div>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}

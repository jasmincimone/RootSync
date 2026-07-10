import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { Container } from "@/components/Container";
import { DiscoverDetailBackLink } from "@/components/DiscoverDetailBackLink";
import { DiscoverDetailTopBack } from "@/components/DiscoverDetailTopBack";
import {
  ListingDetailHighlights,
  ListingTypeDetailCard,
  ListingVendorLocationHint,
} from "@/components/ListingTypeDetailPanels";
import { MessageVendorLink } from "@/components/MessageVendorLink";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { PulseRatingBadge } from "@/components/pulse/PulseRatingDisplay";
import { MarketplaceListingPurchase } from "@/components/MarketplaceListingPurchase";
import { discoverVendorPath } from "@/config/discoverPaths";
import { authOptions } from "@/lib/authOptions";
import { resolveDiscoverBackLink } from "@/lib/discoverReturn";
import { resolveListingCheckoutOptions } from "@/lib/listingCheckoutOptions";
import { prisma } from "@/lib/prisma";
import { loadVendorPulseSummary } from "@/lib/pulse/vendorReviews";
import { LISTING_VISIBILITY, OFFERING_STATUS, VENDOR_STATUS } from "@/lib/roles";

export const dynamic = "force-dynamic";

const offeringDetailSelect = {
  status: true,
  paymentUrl: true,
  productUrl: true,
  productDetails: { select: { requiresShipping: true, sku: true } },
  serviceDetails: {
    select: {
      serviceKind: true,
      durationMinutes: true,
      serviceRadius: true,
      fulfillmentMethod: true,
    },
  },
  resourceDetails: { select: { resourceSubtype: true, format: true } },
  eventDetails: {
    select: {
      startsAt: true,
      endsAt: true,
      location: true,
      venue: true,
      capacity: true,
    },
  },
  variants: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      id: true,
      title: true,
      priceCents: true,
      durationMinutes: true,
      sku: true,
    },
  },
};

async function loadListingForPage(listingId: string, viewerUserId: string | undefined) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: {
      offering: { select: offeringDetailSelect },
      vendorProfile: {
        select: {
          id: true,
          publicSlug: true,
          userId: true,
          displayName: true,
          status: true,
          pickupLocation: true,
          website: true,
          paymentLinkUrl: true,
          user: {
            select: { stripeConnectAccountId: true },
          },
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
    title: listing.title,
    description: desc,
  };
}

function PurchasePanel({
  listing,
  offering,
  variants,
  isOwnerPreview,
  vendorId,
  stripeCheckoutReady,
  paymentLinkUrl,
  detailProps,
  className,
  returnTo,
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
  stripeCheckoutReady: boolean;
  paymentLinkUrl: string | null;
  detailProps: Omit<Parameters<typeof ListingDetailHighlights>[0], "priceCents" | "variantCount">;
  className?: string;
  returnTo?: string | null;
}) {
  return (
    <Card className={className ?? "overflow-hidden border-fix-border/15 p-0 shadow-soft"}>
      <div className="border-b border-fix-border/15 p-6">
        {listing.category?.trim() ? (
          <p className="text-xs font-medium uppercase tracking-wide text-fix-text-muted">
            {listing.category.trim()}
          </p>
        ) : null}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-fix-heading sm:text-3xl">
          {listing.title}
        </h1>
        <div className="mt-4">
          <ListingDetailHighlights
            priceCents={listing.priceCents}
            variantCount={variants.length}
            {...detailProps}
          />
        </div>
      </div>

      <div className="p-6">
        {isOwnerPreview ? (
          <ButtonLink
            href={`/account/vendor/listings/${listing.id}/edit`}
            variant="cta"
            size="md"
            className="w-full justify-center"
          >
            Edit listing
          </ButtonLink>
        ) : (
          <MarketplaceListingPurchase
            listingId={listing.id}
            listingType={listing.listingType}
            variants={variants}
            paymentLinkUrl={paymentLinkUrl}
            productUrl={offering.productUrl}
            stripeCheckoutReady={stripeCheckoutReady}
          />
        )}

        {!isOwnerPreview ? (
          <div className="mt-4">
            <MessageVendorLink
              vendorProfileId={vendorId}
              variant="secondary"
              size="sm"
              className="w-full justify-center"
            />
          </div>
        ) : null}

        <div className="mt-4 border-t border-fix-border/15 pt-4">
          <DiscoverDetailBackLink
            returnTo={returnTo}
            variant="button"
            className="w-full justify-center"
          />
        </div>
      </div>
    </Card>
  );
}

export default async function DiscoverListingPage({
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
  const loaded = await loadListingForPage(id, session?.user?.id);
  if (!loaded) notFound();

  const { listing, isOwnerPreview } = loaded;
  const v = listing.vendorProfile;
  const offering = listing.offering;
  const variants = offering.variants ?? [];

  const detailProps = {
    listingType: listing.listingType,
    product: offering.productDetails,
    service: offering.serviceDetails,
    resource: offering.resourceDetails,
    event: offering.eventDetails,
  };

  const vendorPulse = !isOwnerPreview ? await loadVendorPulseSummary(v.id) : null;

  const checkoutOptions = await resolveListingCheckoutOptions({
    offeringPaymentUrl: offering.paymentUrl,
    vendorPaymentLinkUrl: v.paymentLinkUrl,
    stripeConnectAccountId: v.user.stripeConnectAccountId,
  });

  return (
    <div className="bg-fix-bg-muted/30">
      <section className="border-b border-fix-border/15 bg-fix-surface">
        <Container className="py-6 sm:py-8">
          <DiscoverDetailTopBack returnTo={returnTo} />
          <nav className="text-sm text-fix-text-muted">
            <Link href={discoverBack.href} className="text-fix-link hover:text-fix-link-hover">
              Discover
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={discoverVendorPath(v)}
              className="text-fix-link hover:text-fix-link-hover"
            >
              {v.displayName}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fix-heading">{listing.title}</span>
          </nav>
        </Container>
      </section>

      <Container className="py-8 sm:py-12">
        {isOwnerPreview ? (
          <Card className="mb-8 border-amber/35 bg-fix-bg-muted/60 p-4">
            <p className="text-sm text-fix-heading">
              <span className="font-semibold">Preview only.</span>{" "}
              {listing.visibility !== LISTING_VISIBILITY.PUBLIC ||
              offering.status !== OFFERING_STATUS.ACTIVE ? (
                <>
                  This offering is <span className="font-medium">{offering.status}</span> and is not
                  shown on Discover until it is active.
                </>
              ) : v.status !== VENDOR_STATUS.APPROVED ? (
                <>
                  Your vendor profile is <span className="font-medium">{v.status}</span>. The public
                  Discover feed only surfaces listings from approved vendors.
                </>
              ) : (
                <>Signed-in preview of your listing.</>
              )}
            </p>
          </Card>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start">
          <div className="min-w-0 space-y-8">
            <div className="overflow-hidden rounded-2xl border border-fix-border/15 bg-fix-surface shadow-soft">
              <div className="aspect-[16/10] bg-fix-bg-muted sm:aspect-[5/3]">
                {listing.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- vendor uploads or external URLs
                  <img
                    src={listing.imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-fix-text-muted">
                    <span className="text-4xl font-light text-fix-border">◇</span>
                    No cover image yet
                  </div>
                )}
              </div>
            </div>

            <div className="lg:hidden">
              <PurchasePanel
                listing={listing}
                offering={offering}
                variants={variants}
                isOwnerPreview={isOwnerPreview}
                vendorId={v.id}
                stripeCheckoutReady={checkoutOptions.stripeCheckoutReady}
                paymentLinkUrl={checkoutOptions.paymentLinkUrl}
                detailProps={detailProps}
                returnTo={returnTo}
              />
            </div>

            <ListingTypeDetailCard {...detailProps} />

            <section aria-labelledby="listing-description" className="rounded-2xl border border-fix-border/15 bg-fix-surface p-6 shadow-soft sm:p-8">
              <h2 id="listing-description" className="text-base font-semibold text-fix-heading">
                About this listing
              </h2>
              <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-fix-text">
                {listing.description}
              </p>
            </section>

            <section
              aria-labelledby="listing-vendor"
              className="rounded-2xl border border-fix-border/15 bg-fix-surface p-6 shadow-soft sm:p-8"
            >
              <h2 id="listing-vendor" className="text-base font-semibold text-fix-heading">
                Vendor
              </h2>
              <p className="mt-3">
                <Link
                  href={discoverVendorPath(v)}
                  className="text-lg font-medium text-fix-link hover:text-fix-link-hover"
                >
                  {v.displayName}
                </Link>
              </p>
              {vendorPulse ? (
                <PulseRatingBadge
                  averageRating={vendorPulse.averageRating}
                  reviewCount={vendorPulse.reviewCount}
                  className="mt-2"
                />
              ) : null}
              <ListingVendorLocationHint pickupLocation={v.pickupLocation} />
              {v.website ? (
                <a
                  href={v.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex text-sm font-medium text-fix-link hover:text-fix-link-hover"
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
                stripeCheckoutReady={checkoutOptions.stripeCheckoutReady}
                paymentLinkUrl={checkoutOptions.paymentLinkUrl}
                detailProps={detailProps}
                className="overflow-hidden border-fix-border/15 p-0 shadow-soft"
                returnTo={returnTo}
              />
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
}

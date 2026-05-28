import Link from "next/link";

import { Container } from "@/components/Container";
import { MarketplaceMapDynamic } from "@/components/MarketplaceMapDynamic";
import { MessageVendorLink } from "@/components/MessageVendorLink";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, VENDOR_STATUS } from "@/lib/roles";

import type { MarketplaceMapVendor } from "@/components/MarketplaceMap";

export const metadata = {
  title: "Marketplace",
};

/** Avoid static generation at build time (needs DB + env on Vercel). */
export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const vendorsRaw = await prisma.vendorProfile.findMany({
    where: { status: VENDOR_STATUS.APPROVED },
    include: {
      listings: {
        where: { status: LISTING_STATUS.PUBLISHED },
        select: { id: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const featuredVendors = [...vendorsRaw].sort(
    (a, b) => b.listings.length - a.listings.length
  );

  const mapVendors: MarketplaceMapVendor[] = featuredVendors
    .filter(
      (v) =>
        v.latitude != null &&
        v.longitude != null &&
        Number.isFinite(v.latitude) &&
        Number.isFinite(v.longitude)
    )
    .map((v) => ({
      id: v.id,
      displayName: v.displayName,
      latitude: v.latitude as number,
      longitude: v.longitude as number,
    }));

  const listings = await prisma.marketplaceListing.findMany({
    where: {
      status: LISTING_STATUS.PUBLISHED,
      vendorProfile: { status: VENDOR_STATUS.APPROVED },
    },
    include: {
      vendorProfile: { select: { id: true, displayName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <Container className="py-12 sm:py-16">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
          Farmer marketplace
        </h1>
        <p className="mt-3 text-base text-fix-text-muted">
          Discover approved local vendors, see who is growing near you, and browse what
          they have available right now.
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

      <section className="mt-12" aria-labelledby="featured-vendors-heading">
        <h2
          id="featured-vendors-heading"
          className="text-lg font-semibold text-fix-heading"
        >
          Featured vendors
        </h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Spotlight on growers and makers selling through the collective.
        </p>
        {featuredVendors.length === 0 ? (
          <Card className="mt-6 p-6">
            <p className="text-sm text-fix-text-muted">No featured vendors yet.</p>
          </Card>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featuredVendors.map((v) => (
              <li key={v.id}>
                <Card
                  id={`marketplace-vendor-${v.id}`}
                  className="h-full scroll-mt-24 p-5"
                >
                  <Link
                    href={`/marketplace/vendors/${v.id}`}
                    className="text-sm font-semibold text-fix-heading hover:text-fix-link hover:underline"
                  >
                    {v.displayName}
                  </Link>
                  {v.pickupLocation ? (
                    <p className="mt-1 text-xs text-fix-text-muted">{v.pickupLocation}</p>
                  ) : null}
                  {v.bio ? (
                    <p className="mt-3 line-clamp-3 text-sm text-fix-text-muted">
                      {v.bio}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-fix-text-muted">
                      {v.listings.length} published listing
                      {v.listings.length === 1 ? "" : "s"}
                    </p>
                  )}
                  {v.website ? (
                    <a
                      href={v.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex text-sm font-medium text-fix-link hover:text-fix-link-hover"
                    >
                      Visit website →
                    </a>
                  ) : null}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-12" aria-labelledby="vendor-listings-heading">
        <h2
          id="vendor-listings-heading"
          className="text-lg font-semibold text-fix-heading"
        >
          Vendor listings
        </h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Published products from marketplace vendors.
        </p>
        {listings.length === 0 ? (
          <Card className="mt-6 p-6">
            <p className="text-sm text-fix-text-muted">No published listings yet.</p>
          </Card>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {listings.map((listing) => (
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
                    <Link
                      href={`/marketplace/vendors/${listing.vendorProfile.id}`}
                      className="mt-0.5 inline-block text-xs font-medium text-fix-link hover:text-fix-link-hover"
                    >
                      {listing.vendorProfile.displayName}
                    </Link>
                    <div className="mt-1 text-sm font-medium text-fix-text">
                      {formatPrice(listing.priceCents)}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-fix-text-muted">
                      {listing.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <MessageVendorLink vendorProfileId={listing.vendorProfile.id} />
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
    </Container>
  );
}

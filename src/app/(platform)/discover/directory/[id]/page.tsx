import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/Container";
import { FavoriteButton } from "@/components/FavoriteButton";
import { DiscoverDetailBackLink } from "@/components/DiscoverDetailBackLink";
import { DiscoverDetailTopBack } from "@/components/DiscoverDetailTopBack";
import { DirectoryListingBadge } from "@/components/DirectoryListingBadge";
import { DirectoryClaimRequest } from "@/components/DirectoryClaimRequest";
import { MarketplaceMapDynamic } from "@/components/MarketplaceMapDynamic";
import { Card } from "@/components/ui/Card";
import { resolveDiscoverBackLink } from "@/lib/discoverReturn";
import { isFavorited } from "@/lib/favorites";
import { formatDirectoryAddress } from "@/lib/directory/usdaClient";
import { directoryTypeLabel } from "@/lib/directory/types";
import { directoryToMapPins } from "@/lib/discoverMap";
import { publicDirectoryWhere } from "@/lib/directory/syncUsdaDirectory";
import { prisma } from "@/lib/prisma";
import { DIRECTORY_CLAIM_STATUS, FAVORITE_TARGET_TYPE } from "@/lib/roles";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await prisma.directoryListing.findFirst({
    where: { id, ...publicDirectoryWhere },
    select: { name: true, description: true, city: true, state: true },
  });
  if (!row) return { title: "Directory listing" };

  const location = [row.city, row.state].filter(Boolean).join(", ");
  const desc =
    row.description && row.description.length > 160
      ? `${row.description.slice(0, 157).trim()}…`
      : row.description ?? `Local food directory listing${location ? ` in ${location}` : ""}.`;

  return {
    title: `${row.name} · Discover`,
    description: desc,
  };
}

export default async function DiscoverDirectoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const { returnTo } = await searchParams;
  const session = await getServerSession(authOptions);
  const discoverBack = resolveDiscoverBackLink(returnTo);
  const listing = await prisma.directoryListing.findFirst({
    where: { id, ...publicDirectoryWhere },
  });

  if (!listing) notFound();

  const favoriteSaved = await isFavorited(
    session?.user?.id,
    FAVORITE_TARGET_TYPE.DIRECTORY,
    listing.id,
  );

  const address = formatDirectoryAddress(listing);
  const hasCoords =
    listing.latitude != null &&
    listing.longitude != null &&
    Number.isFinite(listing.latitude) &&
    Number.isFinite(listing.longitude);

  const mapPins = hasCoords
    ? directoryToMapPins([
        {
          id: listing.id,
          name: listing.name,
          latitude: listing.latitude as number,
          longitude: listing.longitude as number,
        },
      ])
    : [];

  const showClaimRequest = listing.claimStatus !== DIRECTORY_CLAIM_STATUS.CLAIMED;

  return (
    <div className="bg-fix-bg-muted/30">
      <section className="border-b border-fix-border/15 bg-fix-surface">
        <Container className="py-6 sm:py-8">
          <DiscoverDetailTopBack returnTo={returnTo} title={listing.name} />
          <nav className="text-sm text-fix-text-muted">
            <Link href={discoverBack.href} className="text-fix-link hover:text-fix-link-hover">
              {discoverBack.backLabel}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fix-heading">Directory</span>
            <span className="mx-2">/</span>
            <span className="text-fix-heading">{listing.name}</span>
          </nav>
        </Container>
      </section>

      <Container className="py-8 sm:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] lg:items-start">
          <div className="min-w-0 space-y-8">
            <Card className="overflow-hidden border-fix-border/15 p-6 shadow-soft sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
                {directoryTypeLabel(listing.directoryType)}
              </p>
              <div className="mt-2 flex items-start justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-fix-heading sm:text-3xl">
                  {listing.name}
                </h1>
                <FavoriteButton
                  targetType={FAVORITE_TARGET_TYPE.DIRECTORY}
                  targetId={listing.id}
                  initialSaved={favoriteSaved}
                  signedIn={Boolean(session?.user?.id)}
                  size="sm"
                />
              </div>
              <DirectoryListingBadge className="mt-3" />
              <p className="mt-4 text-sm leading-relaxed text-fix-text-muted">
                This business is listed in the USDA Local Food Directory. It is not a RootSync
                vendor — you can view contact details here, but messaging and checkout are not
                available until the business joins or claims this listing.
              </p>
              {listing.description ? (
                <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-fix-text">
                  {listing.description}
                </p>
              ) : null}
            </Card>

            <Card className="border-fix-border/15 p-6 shadow-soft sm:p-8">
              <h2 className="text-base font-semibold text-fix-heading">Location & contact</h2>
              <dl className="mt-4 space-y-3 text-sm">
                {address ? (
                  <div>
                    <dt className="text-fix-text-muted">Address</dt>
                    <dd className="mt-0.5 font-medium text-fix-heading">{address}</dd>
                  </div>
                ) : null}
                {listing.phone ? (
                  <div>
                    <dt className="text-fix-text-muted">Phone</dt>
                    <dd className="mt-0.5">
                      <a href={`tel:${listing.phone}`} className="text-fix-link hover:text-fix-link-hover">
                        {listing.phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {listing.email ? (
                  <div>
                    <dt className="text-fix-text-muted">Email</dt>
                    <dd className="mt-0.5">
                      <a href={`mailto:${listing.email}`} className="text-fix-link hover:text-fix-link-hover">
                        {listing.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {listing.website ? (
                  <div>
                    <dt className="text-fix-text-muted">Website</dt>
                    <dd className="mt-0.5">
                      <a
                        href={listing.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fix-link hover:text-fix-link-hover"
                      >
                        {listing.website.replace(/^https?:\/\//i, "")}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {listing.externalUrl ? (
                  <div>
                    <dt className="text-fix-text-muted">USDA listing</dt>
                    <dd className="mt-0.5">
                      <a
                        href={listing.externalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fix-link hover:text-fix-link-hover"
                      >
                        View on USDA Local Food Portal →
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Card>

            {hasCoords ? (
              <section aria-labelledby="directory-map">
                <h2 id="directory-map" className="mb-3 text-base font-semibold text-fix-heading">
                  Map
                </h2>
                <MarketplaceMapDynamic pins={mapPins} compact />
              </section>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-24">
            <Card className="border-fix-border/15 p-6 shadow-soft">
              <h2 className="text-sm font-semibold text-fix-heading">On RootSync</h2>
              <p className="mt-2 text-sm text-fix-text-muted">
                Directory listings help you discover local food businesses. Verified vendors can
                sell, message, and book through RootSync.
              </p>
              {showClaimRequest ? (
                <DirectoryClaimRequest
                  directoryListingId={listing.id}
                  claimStatus={listing.claimStatus}
                  signedIn={Boolean(session?.user?.id)}
                />
              ) : null}
              <div className="mt-4 border-t border-fix-border/15 pt-4">
                <DiscoverDetailBackLink returnTo={returnTo} />
              </div>
            </Card>
          </aside>
        </div>
      </Container>
    </div>
  );
}

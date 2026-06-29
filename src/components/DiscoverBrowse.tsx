"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { MarketplaceListingCheckoutActions } from "@/components/MarketplaceListingCheckoutActions";
import { MessageVendorLink } from "@/components/MessageVendorLink";
import { UserAvatar } from "@/components/UserAvatar";
import { VerifiedVendorBadge } from "@/components/VerifiedVendorBadge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DISCOVER_CATEGORY_SUGGESTIONS, DISCOVER_TYPE_FILTERS } from "@/config/discoverFilters";
import { discoverListingPath, discoverVendorPath } from "@/config/discoverPaths";
import { formatPrice } from "@/lib/format";
import { listingTypeLabel } from "@/lib/listingDisplay";
import { LISTING_TYPE, type ListingType } from "@/lib/roles";
import { cn } from "@/lib/cn";

export type DiscoverListingRow = {
  id: string;
  title: string;
  description: string;
  priceCents: number;
  listingType: string;
  category: string | null;
  imageUrl: string | null;
  vendorProfile: {
    id: string;
    displayName: string;
    profileImageUrl: string | null;
  };
  offering: {
    paymentUrl: string | null;
    productUrl: string | null;
  };
};

export type DiscoverVendorRow = {
  id: string;
  displayName: string;
  bio: string | null;
  pickupLocation: string | null;
  website: string | null;
  profileImageUrl: string | null;
  listingsCount: number;
};

type Props = {
  vendors: DiscoverVendorRow[];
  listings: DiscoverListingRow[];
};

export function DiscoverBrowse({ vendors, listings }: Props) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"" | ListingType>("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const categories = useMemo(() => {
    const fromListings = listings
      .map((l) => l.category?.trim())
      .filter((c): c is string => Boolean(c));
    return [...new Set([...DISCOVER_CATEGORY_SUGGESTIONS, ...fromListings])].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [listings]);

  const q = query.trim().toLowerCase();

  const filteredVendors = useMemo(() => {
    if (!q) return vendors;
    return vendors.filter(
      (v) =>
        v.displayName.toLowerCase().includes(q) ||
        (v.bio?.toLowerCase().includes(q) ?? false) ||
        (v.pickupLocation?.toLowerCase().includes(q) ?? false),
    );
  }, [vendors, q]);

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      if (typeFilter && l.listingType !== typeFilter) return false;
      if (categoryFilter && (l.category?.trim() ?? "") !== categoryFilter) return false;
      if (!q) return true;
      const haystack = [
        l.title,
        l.description,
        l.category ?? "",
        l.vendorProfile.displayName,
        listingTypeLabel(l.listingType),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [listings, typeFilter, categoryFilter, q]);

  return (
    <>
      <section className="mt-8 rounded-2xl border border-fix-border/15 bg-fix-surface p-4 sm:p-5">
        <h2 className="sr-only">Search and filter</h2>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1">
            <label htmlFor="discover-search" className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
              Search Discover
            </label>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fix-text-muted" aria-hidden />
              <input
                id="discover-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search listings, vendors, categories…"
                className="w-full rounded-full border border-fix-border/20 bg-fix-bg-muted/40 py-2.5 pl-10 pr-4 text-sm text-fix-text focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta"
              />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div>
              <label htmlFor="discover-type" className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
                Type
              </label>
              <select
                id="discover-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as "" | ListingType)}
                className="mt-1 rounded-full border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
              >
                {DISCOVER_TYPE_FILTERS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="discover-category" className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
                Category
              </label>
              <select
                id="discover-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="mt-1 max-w-[14rem] rounded-full border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {DISCOVER_TYPE_FILTERS.filter((t) => t.value).map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTypeFilter(typeFilter === t.value ? "" : t.value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                typeFilter === t.value
                  ? "bg-forest text-fix-primary-foreground"
                  : "bg-fix-bg-muted text-fix-text-muted hover:bg-fix-bg-muted/80",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-12" aria-labelledby="featured-vendors-heading">
        <h2 id="featured-vendors-heading" className="text-lg font-semibold text-fix-heading">
          Featured vendors
        </h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Verified growers and makers on Discover.
        </p>
        {filteredVendors.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              bordered={false}
              title={q ? "No vendors match your search" : "No featured vendors yet"}
              description={
                q
                  ? "Try a different search or clear filters."
                  : "Approved vendors with published listings will appear here."
              }
              action={
                q
                  ? undefined
                  : { href: "/account/vendor/apply", label: "Become a vendor", variant: "secondary" }
              }
            />
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVendors.map((v) => (
              <li key={v.id}>
                <Card id={`discover-vendor-${v.id}`} className="h-full scroll-mt-24 p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <UserAvatar src={v.profileImageUrl} name={v.displayName} size="lg" className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={discoverVendorPath(v.id)}
                        className="text-sm font-semibold text-fix-heading hover:text-fix-link hover:underline"
                      >
                        {v.displayName}
                      </Link>
                      <VerifiedVendorBadge size="sm" className="mt-1" />
                      {v.pickupLocation ? (
                        <p className="mt-1 text-xs text-fix-text-muted">{v.pickupLocation}</p>
                      ) : null}
                    </div>
                  </div>
                  {v.bio ? (
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-fix-text-muted">{v.bio}</p>
                  ) : (
                    <p className="mt-3 text-sm text-fix-text-muted">
                      {v.listingsCount} published listing{v.listingsCount === 1 ? "" : "s"}
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

      <section className="mt-12" aria-labelledby="discover-listings-heading">
        <h2 id="discover-listings-heading" className="text-lg font-semibold text-fix-heading">
          Listings
        </h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          {filteredListings.length} listing{filteredListings.length === 1 ? "" : "s"}
          {typeFilter ? ` · ${listingTypeLabel(typeFilter)}` : ""}
          {categoryFilter ? ` · ${categoryFilter}` : ""}
        </p>
        {filteredListings.length === 0 ? (
          <div className="mt-6">
            <EmptyState
              bordered={false}
              title="No listings match"
              description="Try clearing search or filters, or check back as vendors publish new offerings."
            />
          </div>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {filteredListings.map((listing) => (
              <li key={listing.id}>
                <Card className="flex h-full gap-4 overflow-hidden p-4">
                  <Link
                    href={discoverListingPath(listing.id)}
                    className="relative block h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-fix-border/15 bg-fix-bg-muted outline-none ring-fix-cta transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2"
                    aria-label={`View ${listing.title}`}
                  >
                    {listing.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={listing.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[10px] text-fix-text-muted">
                        View
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-fix-text-muted">
                      {listingTypeLabel(listing.listingType)}
                    </span>
                    <Link
                      href={discoverListingPath(listing.id)}
                      className="mt-0.5 block font-medium text-fix-heading hover:text-fix-link hover:underline"
                    >
                      {listing.title}
                    </Link>
                    <Link
                      href={discoverVendorPath(listing.vendorProfile.id)}
                      className="mt-1 inline-flex flex-col items-start gap-0.5 text-xs font-medium text-fix-link hover:text-fix-link-hover"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <UserAvatar
                          src={listing.vendorProfile.profileImageUrl}
                          name={listing.vendorProfile.displayName}
                          size="xs"
                        />
                        {listing.vendorProfile.displayName}
                      </span>
                      <VerifiedVendorBadge size="sm" />
                    </Link>
                    <div className="mt-1 text-sm font-medium text-fix-text">{formatPrice(listing.priceCents)}</div>
                    <p className="mt-2 line-clamp-2 text-sm text-fix-text-muted">{listing.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <MarketplaceListingCheckoutActions
                        listingId={listing.id}
                        listingType={listing.listingType}
                        compact
                      />
                      <MessageVendorLink vendorProfileId={listing.vendorProfile.id} />
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Search } from "lucide-react";

import { MarketplaceListingCheckoutActions } from "@/components/MarketplaceListingCheckoutActions";
import { ListingImage } from "@/components/ListingImage";
import { MessageVendorLink } from "@/components/MessageVendorLink";
import { DiscoverCollapsibleSection } from "@/components/DiscoverCollapsibleSection";
import {
  DiscoverFavoritesSection,
  type DiscoverFavoriteItem,
} from "@/components/DiscoverFavoritesSection";
import { DiscoverVendorSpotlight } from "@/components/DiscoverVendorSpotlight";
import { UserAvatar } from "@/components/UserAvatar";
import { DirectoryListingBadge } from "@/components/DirectoryListingBadge";
import { RootSyncLoader } from "@/components/RootSyncLoader";
import { VerifiedVendorBadge } from "@/components/VerifiedVendorBadge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { DiscoverPagination } from "@/components/DiscoverPagination";
import {
  DISCOVER_CATEGORY_SUGGESTIONS,
  DISCOVER_SOURCE_FILTERS,
  DISCOVER_TYPE_FILTERS,
  type DiscoverSourceFilter,
} from "@/config/discoverFilters";
import {
  DISCOVER_STATE_RADIUS_OPTIONS,
  DEFAULT_STATE_RADIUS_MILES,
  isDiscoverStateRadiusAnywhere,
  parseDiscoverStateRadius,
} from "@/config/discoverLocation";
import {
  DISCOVER_PAGE_SIZE_OPTIONS,
  type DiscoverPageSize,
} from "@/config/discoverPagination";
import { discoverDirectoryPath, discoverListingPath, discoverVendorPath } from "@/config/discoverPaths";
import { rememberDiscoverResults } from "@/lib/discoverReturn";
import { RESOURCE_SUBTYPE_OPTIONS } from "@/config/resourceSubtypes";
import { formatPrice } from "@/lib/format";
import { directoryTypeLabel } from "@/lib/directory/types";
import type { DirectoryLocationMode } from "@/lib/directory/directoryLocationFilter";
import { listingTypeLabel } from "@/lib/listingDisplay";
import { resourceSubtypeLabel } from "@/config/resourceSubtypes";
import { LISTING_TYPE, type ListingType, type ResourceSubtype } from "@/lib/roles";
import { US_STATE_OPTIONS } from "@/lib/usStates";
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
    publicSlug?: string | null;
    displayName: string;
    profileImageUrl: string | null;
  };
  offering: {
    paymentUrl: string | null;
    productUrl: string | null;
    resourceSubtype: string | null;
  };
};

export type DiscoverDirectoryRow = {
  id: string;
  name: string;
  description: string | null;
  directoryType: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  website: string | null;
  addressLine1: string | null;
};

export type DiscoverVendorRow = {
  id: string;
  publicSlug: string | null;
  displayName: string;
  bio: string | null;
  pickupLocation: string | null;
  website: string | null;
  profileImageUrl: string | null;
  listingsCount: number;
  latitude: number | null;
  longitude: number | null;
  /** Vendor account community Pulse score (0 if none yet). */
  pulseScore: number;
};

export type DiscoverSearchFormValues = {
  query: string;
  sourceFilter: DiscoverSourceFilter;
  typeFilter: "" | ListingType;
  resourceSubtypeFilter: "" | ResourceSubtype;
  categoryFilter: string;
  locationMode: DirectoryLocationMode;
  state: string;
  city: string;
  zip: string;
  radiusMiles: string;
};

type Props = {
  vendors: DiscoverVendorRow[];
  vendorsTotal: number;
  vendorsPage: number;
  onVendorsPageChange: (page: number) => void;
  listings: DiscoverListingRow[];
  listingsTotal: number;
  listingsPage: number;
  onListingsPageChange: (page: number) => void;
  allListings: DiscoverListingRow[];
  directory: DiscoverDirectoryRow[];
  directoryTotal: number;
  directoryPage: number;
  onDirectoryPageChange: (page: number) => void;
  directoryLoading: boolean;
  directoryError: string | null;
  directorySummary: string | null;
  directorySearchScope: "state" | "zip" | null;
  directoryStateRadius?: string | null;
  locationSummary: string | null;
  pageSize: DiscoverPageSize;
  onPageSizeChange: (size: DiscoverPageSize) => void;
  form: DiscoverSearchFormValues;
  onFormChange: (form: DiscoverSearchFormValues) => void;
  onSearch: () => void;
  showVendors: boolean;
  showDirectory: boolean;
  showListings: boolean;
  isAllView: boolean;
  searchError?: string | null;
  discoverResultsHref: string;
  buildDetailHref: (
    detailPath: string,
    kind: "vendor" | "directory" | "listing",
    id: string,
  ) => string;
  /** Signed-in only; null/undefined hides the section from guests. */
  favorites?: DiscoverFavoriteItem[] | null;
  /** Always-on Pulse + nearby spotlights (independent of search filters). */
  spotlightTopByPulse?: DiscoverVendorRow[];
  spotlightNearby?: Array<DiscoverVendorRow & { distanceMiles?: number }>;
  /** True after the member runs a real search (query / location / filters). */
  searchActive?: boolean;
};

export function DiscoverBrowse({
  vendors,
  vendorsTotal,
  vendorsPage,
  onVendorsPageChange,
  listings,
  listingsTotal,
  listingsPage,
  onListingsPageChange,
  allListings,
  directory,
  directoryTotal,
  directoryPage,
  onDirectoryPageChange,
  directoryLoading,
  directoryError,
  directorySummary,
  directorySearchScope,
  directoryStateRadius,
  locationSummary,
  pageSize,
  onPageSizeChange,
  form,
  onFormChange,
  onSearch,
  showVendors,
  showDirectory,
  showListings,
  isAllView,
  searchError,
  discoverResultsHref,
  buildDetailHref,
  favorites = null,
  spotlightTopByPulse = [],
  spotlightNearby = [],
  searchActive = false,
}: Props) {
  const rememberResults = () => rememberDiscoverResults(discoverResultsHref);

  const showListingsFilters = !form.sourceFilter || form.sourceFilter === "listings";

  const formStateRadius = parseDiscoverStateRadius(form.radiusMiles);
  const isStateAnywhere =
    form.locationMode === "state" &&
    formStateRadius !== null &&
    isDiscoverStateRadiusAnywhere(formStateRadius);
  const directoryIsAnywhere =
    directoryStateRadius === "anywhere" || (directoryLoading && isStateAnywhere);

  const shouldShowSection = (total: number, loading = false) => {
    if (!isAllView) return true;
    return loading || total > 0;
  };

  /** Directory stays visible in All view after a search attempt so empty/error states aren't hidden. */
  const showDirectorySection =
    showDirectory &&
    (directoryLoading ||
      Boolean(directoryError) ||
      directoryTotal > 0 ||
      directorySearchScope != null ||
      !isAllView);

  const hasAnyResults =
    (showVendors && vendorsTotal > 0) ||
    (showDirectory && (directoryLoading || directoryTotal > 0)) ||
    (showListings && listingsTotal > 0);

  const categories = useMemo(() => {
    const fromListings = allListings
      .map((l) => l.category?.trim())
      .filter((c): c is string => Boolean(c));
    return [...new Set([...DISCOVER_CATEGORY_SUGGESTIONS, ...fromListings])].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [allListings]);

  const patchForm = (patch: Partial<DiscoverSearchFormValues>) => {
    onFormChange({ ...form, city: form.city ?? "", ...patch });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch();
  };

  return (
    <>
      <section className="mt-8 rounded-2xl border border-fix-border/15 bg-fix-surface p-4 sm:p-5">
        <h2 className="sr-only">Search and filter</h2>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="discover-search"
                className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted"
              >
                Search Discover
              </label>
              <div className="relative mt-1">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fix-text-muted"
                  aria-hidden
                />
                <input
                  id="discover-search"
                  type="search"
                  value={form.query}
                  onChange={(e) => patchForm({ query: e.target.value })}
                  placeholder="Search vendors, directory, listings…"
                  className="w-full rounded-full border border-fix-border/20 bg-fix-bg-muted/40 py-2.5 pl-10 pr-4 text-sm text-fix-text focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta"
                />
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div>
                <label
                  htmlFor="discover-source"
                  className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted"
                >
                  Show
                </label>
                <select
                  id="discover-source"
                  value={form.sourceFilter}
                  onChange={(e) =>
                    patchForm({ sourceFilter: e.target.value as DiscoverSourceFilter })
                  }
                  className="mt-1 rounded-full border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
                >
                  {DISCOVER_SOURCE_FILTERS.map((opt) => (
                    <option key={opt.label} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {showListingsFilters ? (
                <div>
                  <label
                    htmlFor="discover-type"
                    className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted"
                  >
                    Type
                  </label>
                  <select
                    id="discover-type"
                    value={form.typeFilter}
                    onChange={(e) => {
                      const next = e.target.value as "" | ListingType;
                      patchForm({
                        typeFilter: next,
                        resourceSubtypeFilter:
                          next !== LISTING_TYPE.RESOURCE ? "" : form.resourceSubtypeFilter,
                      });
                    }}
                    className="mt-1 rounded-full border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
                  >
                    {DISCOVER_TYPE_FILTERS.map((opt) => (
                      <option key={opt.label} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {showListingsFilters && form.typeFilter === LISTING_TYPE.RESOURCE ? (
                <div>
                  <label
                    htmlFor="discover-resource-subtype"
                    className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted"
                  >
                    Resource kind
                  </label>
                  <select
                    id="discover-resource-subtype"
                    value={form.resourceSubtypeFilter}
                    onChange={(e) =>
                      patchForm({
                        resourceSubtypeFilter: e.target.value as "" | ResourceSubtype,
                      })
                    }
                    className="mt-1 max-w-[12rem] rounded-full border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
                  >
                    <option value="">All resources</option>
                    {RESOURCE_SUBTYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
              {showListingsFilters ? (
                <div>
                  <label
                    htmlFor="discover-category"
                    className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted"
                  >
                    Category
                  </label>
                  <select
                    id="discover-category"
                    value={form.categoryFilter}
                    onChange={(e) => patchForm({ categoryFilter: e.target.value })}
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
              ) : null}
              <div>
                <label
                  htmlFor="discover-page-size"
                  className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted"
                >
                  Per page
                </label>
                <select
                  id="discover-page-size"
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value) as DiscoverPageSize)}
                  className="mt-1 rounded-full border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
                >
                  {DISCOVER_PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {showListingsFilters ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {DISCOVER_TYPE_FILTERS.filter((t) => t.value).map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() =>
                    patchForm({
                      typeFilter: form.typeFilter === t.value ? "" : t.value,
                      resourceSubtypeFilter:
                        t.value !== LISTING_TYPE.RESOURCE ? "" : form.resourceSubtypeFilter,
                    })
                  }
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                    form.typeFilter === t.value
                      ? "bg-forest text-fix-primary-foreground"
                      : "bg-fix-bg-muted text-fix-text-muted hover:bg-fix-bg-muted/80",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-4 rounded-xl border border-fix-border/15 bg-fix-bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
              Location
            </p>
            <p className="mt-1 text-sm text-fix-text-muted">
              By city &amp; state: enter city (optional when Anywhere), then state and distance. By
              ZIP: use a ZIP code and radius in miles. Click Search to apply.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  patchForm({
                    locationMode: "state",
                    radiusMiles: String(DEFAULT_STATE_RADIUS_MILES),
                  })
                }
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  form.locationMode === "state"
                    ? "bg-forest text-fix-primary-foreground"
                    : "bg-fix-surface text-fix-text-muted hover:bg-fix-bg-muted",
                )}
              >
                By state
              </button>
              <button
                type="button"
                onClick={() => patchForm({ locationMode: "zip" })}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  form.locationMode === "zip"
                    ? "bg-forest text-fix-primary-foreground"
                    : "bg-fix-surface text-fix-text-muted hover:bg-fix-bg-muted",
                )}
              >
                By ZIP &amp; radius
              </button>
            </div>
            {form.locationMode === "state" ? (
              <div className="mt-3 space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="max-w-xs flex-1">
                    <label
                      htmlFor="discover-location-city"
                      className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted"
                    >
                      City
                      {isStateAnywhere ? (
                        <span className="ml-1 font-normal normal-case text-fix-text-muted/80">
                          (optional)
                        </span>
                      ) : null}
                    </label>
                    <input
                      id="discover-location-city"
                      required={!isStateAnywhere}
                      value={form.city}
                      onChange={(e) => patchForm({ city: e.target.value })}
                      placeholder={isStateAnywhere ? "Optional — narrow map focus" : "Hartford"}
                      className="mt-1 w-full rounded-full border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="max-w-xs flex-1">
                    <label
                      htmlFor="discover-location-state"
                      className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted"
                    >
                      State
                    </label>
                    <input
                      id="discover-location-state"
                      list="discover-us-states"
                      required
                      value={form.state}
                      onChange={(e) => patchForm({ state: e.target.value })}
                      placeholder="GA or Georgia"
                      className="mt-1 w-full rounded-full border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
                    />
                    <datalist id="discover-us-states">
                      {US_STATE_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                      {US_STATE_OPTIONS.map((s) => (
                        <option key={`${s.value}-name`} value={s.label} />
                      ))}
                    </datalist>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
                    {isStateAnywhere ? "State coverage" : "Distance from city"}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DISCOVER_STATE_RADIUS_OPTIONS.map((opt) => (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => patchForm({ radiusMiles: String(opt.value) })}
                        className={cn(
                          "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                          form.radiusMiles === String(opt.value)
                            ? "bg-forest text-fix-primary-foreground"
                            : "bg-fix-surface text-fix-text-muted hover:bg-fix-bg-muted",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div>
                  <label
                    htmlFor="discover-location-zip"
                    className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted"
                  >
                    ZIP code
                  </label>
                  <input
                    id="discover-location-zip"
                    inputMode="numeric"
                    pattern="\d{5}"
                    maxLength={5}
                    value={form.zip}
                    onChange={(e) =>
                      patchForm({ zip: e.target.value.replace(/\D/g, "").slice(0, 5) })
                    }
                    placeholder="31216"
                    className="mt-1 w-28 rounded-full border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="discover-location-radius"
                    className="block text-xs font-semibold uppercase tracking-wide text-fix-text-muted"
                  >
                    Radius (miles)
                  </label>
                  <input
                    id="discover-location-radius"
                    type="number"
                    min={1}
                    max={250}
                    value={form.radiusMiles}
                    onChange={(e) => patchForm({ radiusMiles: e.target.value })}
                    className="mt-1 w-28 rounded-full border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {searchError ? (
            <p className="mt-3 text-sm text-red-700">{searchError}</p>
          ) : null}

          <div className="mt-5 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-fix-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta"
            >
              <Search className="h-4 w-4" aria-hidden />
              Search
            </button>
          </div>
        </form>
      </section>

      {favorites ? (
        <DiscoverFavoritesSection
          favorites={favorites}
          discoverResultsHref={discoverResultsHref}
          buildDetailHref={buildDetailHref}
          defaultOpen={!searchActive}
        />
      ) : null}

      {showVendors ? (
        <DiscoverVendorSpotlight
          topByPulse={spotlightTopByPulse}
          nearby={spotlightNearby}
          discoverResultsHref={discoverResultsHref}
          buildDetailHref={buildDetailHref}
          locationSummary={locationSummary}
          defaultOpen={!searchActive}
        />
      ) : null}

      {isAllView ? (
        <div className="mt-10 border-b border-fix-border/15 pb-4">
          <h2 className="text-2xl font-bold tracking-tight text-fix-heading sm:text-3xl">
            Search results
          </h2>
          <p className="mt-2 text-base leading-relaxed text-fix-text-muted sm:text-lg">
            Matches are grouped by type — vendors, directory listings, and marketplace listings.
          </p>
          {!hasAnyResults && !directoryLoading ? (
            <div className="mt-6">
              <EmptyState
                bordered={false}
                title="No results found"
                description="Try a different search term, state, or ZIP and radius, then click Search."
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {showVendors && shouldShowSection(vendorsTotal) ? (
        <DiscoverCollapsibleSection
          id="discover-matching-vendors"
          title="Matching vendors"
          description={
            <>
              Vendors that match your search
              {locationSummary ? ` · ${locationSummary}` : ""}.
            </>
          }
          count={vendorsTotal}
          defaultOpen={searchActive || vendorsTotal > 0}
          className="mt-12"
        >
          {vendorsTotal === 0 ? (
            <EmptyState
                bordered={false}
                title="No vendors match your search"
                description="Try a different search or clear filters, then click Search."
              />
          ) : (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {vendors.map((v) => (
                  <li key={v.id}>
                    <Card id={`discover-vendor-${v.id}`} className="h-full scroll-mt-24 p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <UserAvatar
                          src={v.profileImageUrl}
                          name={v.displayName}
                          size="lg"
                          className="shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <Link
                              href={buildDetailHref(discoverVendorPath(v), "vendor", v.id)}
                              onClick={rememberResults}
                              className="min-w-0 truncate text-sm font-semibold text-fix-heading hover:text-fix-link hover:underline"
                            >
                              {v.displayName}
                            </Link>
                            <span className="select-none text-sm text-fix-text-muted/45" aria-hidden>
                              |
                            </span>
                            <VerifiedVendorBadge size="sm" className="shrink-0" />
                          </div>
                          {v.pickupLocation ? (
                            <p className="mt-1 text-xs text-fix-text-muted">{v.pickupLocation}</p>
                          ) : null}
                        </div>
                      </div>
                      {v.bio ? (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-fix-text-muted">
                          {v.bio}
                        </p>
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
              <DiscoverPagination
                page={vendorsPage}
                pageSize={pageSize}
                total={vendorsTotal}
                onPageChange={onVendorsPageChange}
              />
            </>
          )}
        </DiscoverCollapsibleSection>
      ) : null}

      {showDirectorySection ? (
        <DiscoverCollapsibleSection
          id="discover-directory-listings"
          title="Directory listings"
          description={
            <>
              Local food businesses from the USDA directory — view only, not RootSync vendors.
              {directorySummary ? ` · ${directorySummary}` : ""}
            </>
          }
          count={directoryLoading ? null : directoryTotal}
          defaultOpen={searchActive || directoryLoading || directoryTotal > 0}
          className="mt-12"
        >
          {directorySearchScope === "state" ? (
            <p className="mt-2 text-sm text-fix-text-muted">
              {directoryLoading
                ? directoryIsAnywhere
                  ? "Loading statewide directory listings… First search may take a moment while we sync USDA data."
                  : "Searching directory listings near your city… Use distance presets above to narrow results, or Anywhere for the full state."
                : directoryIsAnywhere
                  ? "Showing USDA directory listings across the state. Add a city above to focus the map, or switch to a distance preset for a local radius."
                  : "Results are scoped by city and distance. Try a smaller radius for more local listings, or Anywhere for the full state."}
            </p>
          ) : null}
          {directoryLoading ? (
            <div className="mt-6">
              <RootSyncLoader
                label={
                  directoryIsAnywhere
                    ? "Loading statewide directory listings…"
                    : "Searching directory listings…"
                }
                size="md"
                block
              />
            </div>
          ) : directoryError ? (
            <div className="mt-6">
              <EmptyState bordered={false} title="Directory search failed" description={directoryError} />
            </div>
          ) : directoryTotal === 0 ? (
            <div className="mt-6">
              <EmptyState
                bordered={false}
                title="No directory listings found"
                description="Try a different state, ZIP, radius, or search term, then click Search."
              />
            </div>
          ) : (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {directory.map((d) => (
                  <li key={d.id}>
                    <Card id={`discover-directory-${d.id}`} className="h-full scroll-mt-24 p-4 sm:p-5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-fix-text-muted">
                        {directoryTypeLabel(d.directoryType)}
                      </p>
                      <Link
                        href={buildDetailHref(discoverDirectoryPath(d.id), "directory", d.id)}
                        onClick={rememberResults}
                        className="mt-1 block text-sm font-semibold text-fix-heading hover:text-fix-link hover:underline"
                      >
                        {d.name}
                      </Link>
                      <DirectoryListingBadge size="sm" className="mt-1" />
                      <p className="mt-2 text-xs text-fix-text-muted">
                        {[d.city, d.state].filter(Boolean).join(", ") ||
                          d.addressLine1 ||
                          "Location on file"}
                      </p>
                      {d.description ? (
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-fix-text-muted">
                          {d.description}
                        </p>
                      ) : null}
                      {d.website ? (
                        <a
                          href={d.website}
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
              <DiscoverPagination
                page={directoryPage}
                pageSize={pageSize}
                total={directoryTotal}
                onPageChange={onDirectoryPageChange}
              />
            </>
          )}
        </DiscoverCollapsibleSection>
      ) : null}

      {showListings && shouldShowSection(listingsTotal) ? (
        <DiscoverCollapsibleSection
          id="discover-listings"
          title="Listings"
          description={
            <>
              {listingsTotal} listing{listingsTotal === 1 ? "" : "s"}
              {form.typeFilter ? ` · ${listingTypeLabel(form.typeFilter)}` : ""}
              {form.categoryFilter ? ` · ${form.categoryFilter}` : ""}
              {locationSummary ? ` · ${locationSummary}` : ""}
            </>
          }
          count={listingsTotal}
          defaultOpen={searchActive || listingsTotal > 0}
          className="mt-12"
        >
          {listingsTotal === 0 ? (
            <div className="mt-6">
              <EmptyState
                bordered={false}
                title="No listings match"
                description="Try clearing search or filters, then click Search."
              />
            </div>
          ) : (
            <>
              <ul className="grid gap-4 sm:grid-cols-2">
                {listings.map((listing) => (
                  <li key={listing.id}>
                    <Card
                      id={`discover-listing-${listing.id}`}
                      className="flex h-full scroll-mt-24 gap-4 overflow-hidden p-4"
                    >
                      <Link
                        href={buildDetailHref(discoverListingPath(listing.id), "listing", listing.id)}
                        onClick={rememberResults}
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
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-fix-text-muted">
                          {listingTypeLabel(listing.listingType)}
                          {listing.offering.resourceSubtype
                            ? ` · ${resourceSubtypeLabel(listing.offering.resourceSubtype) ?? ""}`
                            : ""}
                        </span>
                        <Link
                          href={buildDetailHref(discoverListingPath(listing.id), "listing", listing.id)}
                          onClick={rememberResults}
                          className="mt-0.5 block font-medium text-fix-heading hover:text-fix-link hover:underline"
                        >
                          {listing.title}
                        </Link>
                        <Link
                          href={buildDetailHref(
                            discoverVendorPath(listing.vendorProfile),
                            "vendor",
                            listing.vendorProfile.id,
                          )}
                          onClick={rememberResults}
                          className="mt-1 inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-fix-link hover:text-fix-link-hover"
                        >
                          <span className="inline-flex min-w-0 items-center gap-1.5">
                            <UserAvatar
                              src={listing.vendorProfile.profileImageUrl}
                              name={listing.vendorProfile.displayName}
                              size="xs"
                            />
                            <span className="truncate">{listing.vendorProfile.displayName}</span>
                          </span>
                          <span className="select-none text-fix-text-muted/45" aria-hidden>
                            |
                          </span>
                          <VerifiedVendorBadge size="sm" className="shrink-0" />
                        </Link>
                        <div className="mt-1 text-sm font-medium text-fix-text">
                          {formatPrice(listing.priceCents)}
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm text-fix-text-muted">
                          {listing.description}
                        </p>
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
              <DiscoverPagination
                page={listingsPage}
                pageSize={pageSize}
                total={listingsTotal}
                onPageChange={onListingsPageChange}
              />
            </>
          )}
        </DiscoverCollapsibleSection>
      ) : null}
    </>
  );
}

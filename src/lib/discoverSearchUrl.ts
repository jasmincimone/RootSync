import type { DiscoverSearchFormValues } from "@/components/DiscoverBrowse";
import { DISCOVER_SOURCE_FILTERS } from "@/config/discoverFilters";
import { DISCOVER_BASE } from "@/config/discoverPaths";
import {
  DEFAULT_DISCOVER_PAGE_SIZE,
  parseDiscoverPageSize,
  type DiscoverPageSize,
} from "@/config/discoverPagination";
import {
  DEFAULT_DISCOVER_SEARCH_FORM,
  normalizeDiscoverSearchForm,
  type AppliedDiscoverSearch,
} from "@/lib/discoverSearch";
import { LISTING_TYPE, type ListingType, type ResourceSubtype } from "@/lib/roles";

export type DiscoverUrlState = {
  form: DiscoverSearchFormValues;
  pageSize: DiscoverPageSize;
  vendorsPage: number;
  listingsPage: number;
  directoryPage: number;
};

function isListingType(value: string): value is ListingType {
  return Object.values(LISTING_TYPE).includes(value as ListingType);
}

function isSourceFilter(value: string): value is DiscoverSearchFormValues["sourceFilter"] {
  return DISCOVER_SOURCE_FILTERS.some((f) => f.value === value);
}

function isLocationMode(value: string): value is DiscoverSearchFormValues["locationMode"] {
  return value === "state" || value === "zip";
}

export function parseDiscoverSearchParams(searchParams: URLSearchParams): DiscoverUrlState | null {
  const hasSearchParams = [...searchParams.keys()].some((key) => key !== "type" && key !== "source");
  const legacyType = searchParams.get("type");
  const legacySource = searchParams.get("source");

  if (!hasSearchParams && !legacyType && !legacySource) {
    return null;
  }

  const form = normalizeDiscoverSearchForm({
    ...DEFAULT_DISCOVER_SEARCH_FORM,
    query: searchParams.get("q") ?? DEFAULT_DISCOVER_SEARCH_FORM.query,
    sourceFilter:
      (searchParams.get("source") as DiscoverSearchFormValues["sourceFilter"] | null) ??
      DEFAULT_DISCOVER_SEARCH_FORM.sourceFilter,
    typeFilter:
      (searchParams.get("type") as DiscoverSearchFormValues["typeFilter"] | null) ??
      DEFAULT_DISCOVER_SEARCH_FORM.typeFilter,
    resourceSubtypeFilter:
      (searchParams.get("subtype") as DiscoverSearchFormValues["resourceSubtypeFilter"] | null) ??
      DEFAULT_DISCOVER_SEARCH_FORM.resourceSubtypeFilter,
    categoryFilter: searchParams.get("category") ?? DEFAULT_DISCOVER_SEARCH_FORM.categoryFilter,
    locationMode:
      (searchParams.get("loc") as DiscoverSearchFormValues["locationMode"] | null) ??
      DEFAULT_DISCOVER_SEARCH_FORM.locationMode,
    state: searchParams.get("state") ?? DEFAULT_DISCOVER_SEARCH_FORM.state,
    city: searchParams.get("city") ?? DEFAULT_DISCOVER_SEARCH_FORM.city,
    zip: searchParams.get("zip") ?? DEFAULT_DISCOVER_SEARCH_FORM.zip,
    radiusMiles: searchParams.get("radius") ?? DEFAULT_DISCOVER_SEARCH_FORM.radiusMiles,
  });

  if (form.sourceFilter && !isSourceFilter(form.sourceFilter)) {
    form.sourceFilter = "";
  }
  if (form.typeFilter && !isListingType(form.typeFilter)) {
    form.typeFilter = "";
  }
  if (form.locationMode && !isLocationMode(form.locationMode)) {
    form.locationMode = DEFAULT_DISCOVER_SEARCH_FORM.locationMode;
  }

  const pageSize = parseDiscoverPageSize(searchParams.get("ps"));
  const vendorsPage = Math.max(1, Number(searchParams.get("vp")) || 1);
  const listingsPage = Math.max(1, Number(searchParams.get("lp")) || 1);
  const directoryPage = Math.max(1, Number(searchParams.get("dp")) || 1);

  return { form, pageSize, vendorsPage, listingsPage, directoryPage };
}

export function buildDiscoverSearchHref(
  state: DiscoverUrlState,
  options?: { hash?: string },
): string {
  const { form } = state;
  const params = new URLSearchParams();

  const q = form.query.trim();
  if (q) params.set("q", q);
  if (form.sourceFilter && isSourceFilter(form.sourceFilter)) {
    params.set("source", form.sourceFilter);
  }
  if (form.typeFilter && isListingType(form.typeFilter)) {
    params.set("type", form.typeFilter);
  }
  if (form.resourceSubtypeFilter) {
    params.set("subtype", form.resourceSubtypeFilter as ResourceSubtype);
  }
  if (form.categoryFilter.trim()) {
    params.set("category", form.categoryFilter.trim());
  }
  if (form.locationMode === "zip") {
    params.set("loc", "zip");
  } else if (
    form.state.trim() ||
    form.city.trim() ||
    form.radiusMiles.trim() !== String(DEFAULT_DISCOVER_SEARCH_FORM.radiusMiles)
  ) {
    params.set("loc", "state");
  }
  if (form.state.trim()) params.set("state", form.state.trim());
  if (form.city.trim()) params.set("city", form.city.trim());
  if (form.zip.trim()) params.set("zip", form.zip.trim());
  if (form.radiusMiles.trim()) params.set("radius", form.radiusMiles.trim());
  if (state.pageSize !== DEFAULT_DISCOVER_PAGE_SIZE) {
    params.set("ps", String(state.pageSize));
  }
  if (state.vendorsPage > 1) params.set("vp", String(state.vendorsPage));
  if (state.listingsPage > 1) params.set("lp", String(state.listingsPage));
  if (state.directoryPage > 1) params.set("dp", String(state.directoryPage));

  const query = params.toString();
  const base = query ? `${DISCOVER_BASE}?${query}` : DISCOVER_BASE;
  return options?.hash ? `${base}#${options.hash}` : base;
}

export function discoverUrlStateFromApplied(
  applied: AppliedDiscoverSearch,
  pages: Pick<DiscoverUrlState, "vendorsPage" | "listingsPage" | "directoryPage">,
): DiscoverUrlState {
  const { pageSize, ...form } = applied;
  return {
    form: normalizeDiscoverSearchForm(form),
    pageSize: parseDiscoverPageSize(pageSize),
    vendorsPage: pages.vendorsPage,
    listingsPage: pages.listingsPage,
    directoryPage: pages.directoryPage,
  };
}

export function discoverResultAnchor(
  kind: "vendor" | "directory" | "listing",
  id: string,
): string {
  if (kind === "vendor") return `discover-vendor-${id}`;
  if (kind === "directory") return `discover-directory-${id}`;
  return `discover-listing-${id}`;
}

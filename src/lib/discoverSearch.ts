import { distanceMiles } from "@/lib/geo";
import {
  DEFAULT_STATE_RADIUS_MILES,
  isDiscoverStateRadiusAnywhere,
  parseDiscoverStateRadius,
  type DiscoverStateRadius,
} from "@/config/discoverLocation";
import { isStateLocationComplete, isValidUsZip } from "@/lib/directory/directoryLocationFilter";
import { listingTypeLabel } from "@/lib/listingDisplay";
import { LISTING_TYPE } from "@/lib/roles";
import { normalizeUsState, US_STATE_OPTIONS } from "@/lib/usStates";
import { coordinatesInUsState } from "@/lib/usStateBounds";

import type { DiscoverListingRow, DiscoverSearchFormValues, DiscoverVendorRow } from "@/components/DiscoverBrowse";

export type AppliedDiscoverSearch = DiscoverSearchFormValues & {
  pageSize: number;
};

export const DEFAULT_DISCOVER_SEARCH_FORM: DiscoverSearchFormValues = {
  query: "",
  sourceFilter: "",
  typeFilter: "",
  resourceSubtypeFilter: "",
  categoryFilter: "",
  locationMode: "state",
  state: "",
  city: "",
  zip: "",
  radiusMiles: String(DEFAULT_STATE_RADIUS_MILES),
};

/** Backfill fields added after older client bundles / hot reloads. */
export function normalizeDiscoverSearchForm(
  form: Partial<DiscoverSearchFormValues> & Pick<DiscoverSearchFormValues, "locationMode">,
): DiscoverSearchFormValues {
  return { ...DEFAULT_DISCOVER_SEARCH_FORM, ...form, city: form.city ?? "" };
}

function searchCity(search: DiscoverSearchFormValues): string {
  return (search.city ?? "").trim();
}

export type DiscoverLocationFilter = {
  state: string | null;
  city: string | null;
  stateRadius: DiscoverStateRadius | null;
  zip: string | null;
  locationCenter: { latitude: number; longitude: number } | null;
  radiusMiles: number | null;
};

export function buildLocationFilter(search: AppliedDiscoverSearch): DiscoverLocationFilter {
  if (search.locationMode === "state") {
    return {
      state: normalizeUsState(search.state),
      city: searchCity(search) || null,
      stateRadius: parseDiscoverStateRadius(String(search.radiusMiles ?? "")),
      zip: null,
      locationCenter: null,
      radiusMiles: null,
    };
  }
  const zip = search.zip.trim();
  const radius = Number(search.radiusMiles);
  if (isValidUsZip(zip) && Number.isFinite(radius) && radius > 0) {
    return {
      state: null,
      city: null,
      stateRadius: null,
      zip,
      locationCenter: null,
      radiusMiles: radius,
    };
  }
  return {
    state: null,
    city: null,
    stateRadius: null,
    zip: null,
    locationCenter: null,
    radiusMiles: null,
  };
}

export function hasLocationFilter(location: DiscoverLocationFilter): boolean {
  if (location.state && location.city && location.stateRadius) return true;
  return Boolean(location.zip && location.radiusMiles);
}

export function isStateSearchReady(search: AppliedDiscoverSearch): boolean {
  if (search.locationMode !== "state") return true;
  return isStateLocationComplete({
    state: search.state,
    city: search.city,
    stateRadius: parseDiscoverStateRadius(search.radiusMiles),
  });
}

export function validateDiscoverSearch(search: AppliedDiscoverSearch): string | null {
  if (search.locationMode === "state") {
    const hasState = Boolean(normalizeUsState(search.state));
    const hasCity = Boolean(searchCity(search));
    if (!hasState && !hasCity) return null;
    if (!hasState) return "Choose a valid US state.";
    if (!hasCity) return "City is required for state search.";
    if (!parseDiscoverStateRadius(String(search.radiusMiles ?? ""))) {
      return "Choose a distance preset (5 mi through Anywhere).";
    }
  }
  if (search.locationMode === "zip") {
    const zip = search.zip.trim();
    const radius = Number(search.radiusMiles);
    if (!zip && !search.radiusMiles.trim()) return null;
    if (!isValidUsZip(zip)) return "Enter a valid 5-digit ZIP code.";
    if (!Number.isFinite(radius) || radius <= 0) return "Enter a radius in miles.";
  }
  return null;
}

export function hasActiveDiscoverSearch(search: AppliedDiscoverSearch): boolean {
  const location = buildLocationFilter(search);
  return Boolean(
    search.query.trim() ||
      hasLocationFilter(location) ||
      search.typeFilter ||
      search.resourceSubtypeFilter ||
      search.categoryFilter,
  );
}

function vendorMatchesState(vendor: DiscoverVendorRow, state: string): boolean {
  const st = state.toUpperCase();
  const loc = vendor.pickupLocation?.toUpperCase() ?? "";
  if (loc.includes(st)) return true;
  const stateName = US_STATE_OPTIONS.find((s) => s.value === st)?.label.toUpperCase();
  if (stateName && loc.includes(stateName)) return true;
  if (
    vendor.latitude != null &&
    vendor.longitude != null &&
    Number.isFinite(vendor.latitude) &&
    Number.isFinite(vendor.longitude) &&
    coordinatesInUsState(vendor.latitude, vendor.longitude, st)
  ) {
    return true;
  }
  return false;
}

function vendorWithinRadius(
  vendor: DiscoverVendorRow,
  center: { latitude: number; longitude: number },
  radiusMiles: number,
): boolean {
  if (vendor.latitude == null || vendor.longitude == null) return false;
  return (
    distanceMiles(center.latitude, center.longitude, vendor.latitude, vendor.longitude) <=
    radiusMiles
  );
}

export function locationSummaryFromSearch(search: AppliedDiscoverSearch): string | null {
  const location = buildLocationFilter(search);
  if (location.state && location.city && location.stateRadius) {
    if (isDiscoverStateRadiusAnywhere(location.stateRadius)) {
      return `Anywhere in ${location.state} (from ${location.city})`;
    }
    return `Within ${location.stateRadius} mi of ${location.city}, ${location.state}`;
  }
  if (location.zip && location.radiusMiles) {
    return `Within ${location.radiusMiles} mi of ${location.zip}`;
  }
  return null;
}

export function filterDiscoverVendors(
  vendors: DiscoverVendorRow[],
  search: AppliedDiscoverSearch,
  locationCenter: { latitude: number; longitude: number } | null,
): DiscoverVendorRow[] {
  const q = search.query.trim().toLowerCase();
  const location = buildLocationFilter(search);

  return vendors.filter((v) => {
    if (location.state) {
      if (!vendorMatchesState(v, location.state)) return false;
      if (
        location.stateRadius &&
        !isDiscoverStateRadiusAnywhere(location.stateRadius) &&
        locationCenter &&
        !vendorWithinRadius(v, locationCenter, location.stateRadius)
      ) {
        return false;
      }
    }
    if (location.zip && location.radiusMiles) {
      if (!locationCenter || !vendorWithinRadius(v, locationCenter, location.radiusMiles)) {
        return false;
      }
    }
    if (!q) return true;
    const haystack = [v.displayName, v.bio ?? "", v.pickupLocation ?? ""].join(" ").toLowerCase();
    return haystack.includes(q);
  });
}

export function filterDiscoverListings(
  listings: DiscoverListingRow[],
  vendors: DiscoverVendorRow[],
  search: AppliedDiscoverSearch,
  locationCenter: { latitude: number; longitude: number } | null,
): DiscoverListingRow[] {
  const q = search.query.trim().toLowerCase();
  const location = buildLocationFilter(search);
  const matchingVendorIds = hasLocationFilter(location)
    ? new Set(filterDiscoverVendors(vendors, search, locationCenter).map((v) => v.id))
    : null;

  return listings.filter((l) => {
    if (search.typeFilter && l.listingType !== search.typeFilter) return false;
    if (
      search.resourceSubtypeFilter &&
      (l.listingType !== LISTING_TYPE.RESOURCE ||
        l.offering.resourceSubtype !== search.resourceSubtypeFilter)
    ) {
      return false;
    }
    if (search.categoryFilter && (l.category?.trim() ?? "") !== search.categoryFilter) {
      return false;
    }
    if (matchingVendorIds && !matchingVendorIds.has(l.vendorProfile.id)) return false;
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
}

export function directoryLocationPayload(search: AppliedDiscoverSearch): {
  state?: string;
  city?: string;
  stateRadius?: DiscoverStateRadius;
  zip?: string;
  radiusMiles?: number;
} {
  if (search.locationMode === "state") {
    const st = normalizeUsState(search.state);
    const city = searchCity(search);
    const stateRadius = parseDiscoverStateRadius(String(search.radiusMiles ?? ""));
    if (!st || !city || !stateRadius) return {};
    return { state: st, city, stateRadius };
  }
  const zip = search.zip.trim();
  const radius = Number(search.radiusMiles);
  if (isValidUsZip(zip) && Number.isFinite(radius) && radius > 0) {
    return { zip, radiusMiles: radius };
  }
  return {};
}

export function shouldFetchDirectory(sourceFilter: AppliedDiscoverSearch["sourceFilter"]): boolean {
  return !sourceFilter || sourceFilter === "directory";
}

export { DEFAULT_STATE_RADIUS_MILES };

// Re-export for client components
export { parseDiscoverStateRadius } from "@/config/discoverLocation";

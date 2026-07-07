import { distanceMiles } from "@/lib/geo";
import { isValidUsZip } from "@/lib/directory/directoryLocationFilter";
import { listingTypeLabel } from "@/lib/listingDisplay";
import { LISTING_TYPE } from "@/lib/roles";
import { normalizeUsState, US_STATE_OPTIONS } from "@/lib/usStates";
import { coordinatesInUsState } from "@/lib/usStateBounds";

import type { DiscoverListingRow, DiscoverSearchFormValues, DiscoverVendorRow } from "@/components/DiscoverBrowse";

export type AppliedDiscoverSearch = DiscoverSearchFormValues & {
  pageSize: number;
};

export type DiscoverLocationFilter = {
  state: string | null;
  zip: string | null;
  zipCenter: { latitude: number; longitude: number } | null;
  radiusMiles: number | null;
};

export function buildLocationFilter(search: AppliedDiscoverSearch): DiscoverLocationFilter {
  if (search.locationMode === "state") {
    return {
      state: normalizeUsState(search.state),
      zip: null,
      zipCenter: null,
      radiusMiles: null,
    };
  }
  const zip = search.zip.trim();
  const radius = Number(search.radiusMiles);
  if (isValidUsZip(zip) && Number.isFinite(radius) && radius > 0) {
    return { state: null, zip, zipCenter: null, radiusMiles: radius };
  }
  return { state: null, zip: null, zipCenter: null, radiusMiles: null };
}

export function hasLocationFilter(location: DiscoverLocationFilter): boolean {
  return Boolean(location.state || (location.zip && location.radiusMiles));
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

export function locationSummaryFromSearch(search: AppliedDiscoverSearch): string | null {
  const location = buildLocationFilter(search);
  if (location.state) return `State: ${location.state}`;
  if (location.zip && location.radiusMiles) {
    return `Within ${location.radiusMiles} mi of ${location.zip}`;
  }
  return null;
}

export function filterDiscoverVendors(
  vendors: DiscoverVendorRow[],
  search: AppliedDiscoverSearch,
  zipCenter: { latitude: number; longitude: number } | null,
): DiscoverVendorRow[] {
  const q = search.query.trim().toLowerCase();
  const location = buildLocationFilter(search);

  return vendors.filter((v) => {
    if (location.state && !vendorMatchesState(v, location.state)) return false;
    if (location.zip && location.radiusMiles) {
      if (!zipCenter || v.latitude == null || v.longitude == null) return false;
      if (
        distanceMiles(zipCenter.latitude, zipCenter.longitude, v.latitude, v.longitude) >
        location.radiusMiles
      ) {
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
  zipCenter: { latitude: number; longitude: number } | null,
): DiscoverListingRow[] {
  const q = search.query.trim().toLowerCase();
  const location = buildLocationFilter(search);
  const matchingVendorIds = hasLocationFilter(location)
    ? new Set(filterDiscoverVendors(vendors, search, zipCenter).map((v) => v.id))
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
  zip?: string;
  radiusMiles?: number;
} {
  if (search.locationMode === "state") {
    const st = normalizeUsState(search.state);
    return st ? { state: st } : {};
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

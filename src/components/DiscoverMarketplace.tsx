"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  DiscoverBrowse,
  type DiscoverDirectoryRow,
  type DiscoverListingRow,
  type DiscoverSearchFormValues,
  type DiscoverVendorRow,
} from "@/components/DiscoverBrowse";
import { MarketplaceMapDynamic } from "@/components/MarketplaceMapDynamic";
import {
  DEFAULT_DISCOVER_PAGE_SIZE,
  paginateSlice,
  type DiscoverPageSize,
} from "@/config/discoverPagination";
import { directoryToMapPins, vendorsToMapPins, type DiscoverMapPin } from "@/lib/discoverMap";
import {
  directoryLocationPayload,
  filterDiscoverListings,
  filterDiscoverVendors,
  locationSummaryFromSearch,
  shouldFetchDirectory,
  type AppliedDiscoverSearch,
} from "@/lib/discoverSearch";
import { isValidUsZip } from "@/lib/directory/directoryLocationFilter";

type Props = {
  vendors: DiscoverVendorRow[];
  listings: DiscoverListingRow[];
};

type DirectorySearchResponse = {
  items: DiscoverDirectoryRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: string | null;
  mapPins: { id: string; name: string; latitude: number; longitude: number }[];
  error?: string;
};

const DEFAULT_FORM: DiscoverSearchFormValues = {
  query: "",
  sourceFilter: "",
  typeFilter: "",
  resourceSubtypeFilter: "",
  categoryFilter: "",
  locationMode: "state",
  state: "",
  zip: "",
  radiusMiles: "20",
};

async function geocodeZip(zip: string): Promise<{ latitude: number; longitude: number } | null> {
  const res = await fetch(`/api/discover/geocode?zip=${encodeURIComponent(zip)}`);
  const body = (await res.json()) as {
    latitude?: number;
    longitude?: number;
    error?: string;
  };
  if (!res.ok) throw new Error(body.error ?? "Could not look up that ZIP code.");
  if (
    typeof body.latitude !== "number" ||
    typeof body.longitude !== "number" ||
    !Number.isFinite(body.latitude) ||
    !Number.isFinite(body.longitude)
  ) {
    throw new Error("Invalid geocoder response.");
  }
  return { latitude: body.latitude, longitude: body.longitude };
}

export function DiscoverMarketplace({ vendors, listings }: Props) {
  const [form, setForm] = useState<DiscoverSearchFormValues>(DEFAULT_FORM);
  const [pageSize, setPageSize] = useState<DiscoverPageSize>(DEFAULT_DISCOVER_PAGE_SIZE);
  const [applied, setApplied] = useState<AppliedDiscoverSearch | null>(null);
  const [zipCenter, setZipCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [vendorsPage, setVendorsPage] = useState(1);
  const [listingsPage, setListingsPage] = useState(1);
  const [directoryItems, setDirectoryItems] = useState<DiscoverDirectoryRow[]>([]);
  const [directoryTotal, setDirectoryTotal] = useState(0);
  const [directorySummary, setDirectorySummary] = useState<string | null>(null);
  const [directoryMapPins, setDirectoryMapPins] = useState<
    { id: string; name: string; latitude: number; longitude: number }[]
  >([]);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const initialSearchDone = useRef(false);

  const fetchDirectory = useCallback(async (search: AppliedDiscoverSearch, page: number) => {
    if (!shouldFetchDirectory(search.sourceFilter)) {
      setDirectoryItems([]);
      setDirectoryTotal(0);
      setDirectorySummary(null);
      setDirectoryMapPins([]);
      setDirectoryError(null);
      setDirectoryLoading(false);
      return;
    }

    setDirectoryLoading(true);
    setDirectoryError(null);
    try {
      const location = directoryLocationPayload(search);
      const res = await fetch("/api/discover/directory-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: search.query,
          page,
          pageSize: search.pageSize,
          ...location,
        }),
      });
      const body = (await res.json()) as DirectorySearchResponse;
      if (!res.ok) {
        throw new Error(body.error ?? "Directory search failed.");
      }
      setDirectoryItems(body.items);
      setDirectoryTotal(body.total);
      setDirectorySummary(body.summary);
      setDirectoryMapPins(body.mapPins);
      setDirectoryPage(body.page);
    } catch (err) {
      setDirectoryItems([]);
      setDirectoryTotal(0);
      setDirectoryMapPins([]);
      setDirectoryError(err instanceof Error ? err.message : "Directory search failed.");
    } finally {
      setDirectoryLoading(false);
    }
  }, []);

  const runSearch = useCallback(
    async (nextForm: DiscoverSearchFormValues, nextPageSize: DiscoverPageSize = pageSize) => {
      setSearchError(null);
      const nextApplied: AppliedDiscoverSearch = { ...nextForm, pageSize: nextPageSize };

      let nextZipCenter: { latitude: number; longitude: number } | null = null;
      if (
        nextApplied.locationMode === "zip" &&
        isValidUsZip(nextApplied.zip) &&
        Number(nextApplied.radiusMiles) > 0
      ) {
        try {
          nextZipCenter = await geocodeZip(nextApplied.zip.trim());
        } catch (err) {
          setSearchError(err instanceof Error ? err.message : "ZIP lookup failed.");
          return;
        }
      }

      setZipCenter(nextZipCenter);
      setApplied(nextApplied);
      setDirectoryPage(1);
      setVendorsPage(1);
      setListingsPage(1);
      await fetchDirectory(nextApplied, 1);
    },
    [fetchDirectory, pageSize],
  );

  useEffect(() => {
    if (initialSearchDone.current) return;
    initialSearchDone.current = true;
    void runSearch(DEFAULT_FORM, DEFAULT_DISCOVER_PAGE_SIZE);
  }, [runSearch]);

  const isAllView = !applied?.sourceFilter;

  const showVendors = isAllView || applied?.sourceFilter === "vendors";
  const showDirectory = isAllView || applied?.sourceFilter === "directory";
  const showListings = isAllView || applied?.sourceFilter === "listings";

  const filteredVendors = useMemo(() => {
    if (!applied) return [];
    return filterDiscoverVendors(vendors, applied, zipCenter);
  }, [applied, vendors, zipCenter]);

  const filteredListings = useMemo(() => {
    if (!applied) return [];
    return filterDiscoverListings(listings, vendors, applied, zipCenter);
  }, [applied, listings, vendors, zipCenter]);

  const pagedVendors = useMemo(
    () => paginateSlice(filteredVendors, vendorsPage, pageSize),
    [filteredVendors, vendorsPage, pageSize],
  );

  const pagedListings = useMemo(
    () => paginateSlice(filteredListings, listingsPage, pageSize),
    [filteredListings, listingsPage, pageSize],
  );

  const locationSummary = useMemo(
    () => (applied ? locationSummaryFromSearch(applied) : null),
    [applied],
  );

  const mapPins: DiscoverMapPin[] = useMemo(() => {
    const vendorsForMap = showVendors
      ? filteredVendors
      : showListings
        ? vendors.filter((v) =>
            filteredListings.some((l) => l.vendorProfile.id === v.id),
          )
        : [];

    const vendorPins = vendorsToMapPins(
      vendorsForMap
        .filter(
          (v) =>
            v.latitude != null &&
            v.longitude != null &&
            Number.isFinite(v.latitude) &&
            Number.isFinite(v.longitude),
        )
        .map((v) => ({
          id: v.id,
          displayName: v.displayName,
          latitude: v.latitude as number,
          longitude: v.longitude as number,
        })),
    );
    const dirPins = showDirectory ? directoryToMapPins(directoryMapPins) : [];
    return [...vendorPins, ...dirPins];
  }, [
    directoryMapPins,
    filteredListings,
    filteredVendors,
    showDirectory,
    showListings,
    showVendors,
    vendors,
  ]);

  const handleSearch = () => {
    void runSearch(form, pageSize);
  };

  const handlePageSizeChange = (next: DiscoverPageSize) => {
    setPageSize(next);
    void runSearch(form, next);
  };

  const handleDirectoryPageChange = (page: number) => {
    if (!applied) return;
    setDirectoryPage(page);
    void fetchDirectory(applied, page);
  };

  return (
    <>
      <div className="mt-8">
        <h2 className="sr-only">Discover map</h2>
        <MarketplaceMapDynamic pins={mapPins} />
        {mapPins.length === 0 ? (
          <p className="mt-3 text-sm text-fix-text-muted">
            Map pins appear for search results with location coordinates.
          </p>
        ) : (
          <p className="mt-3 text-xs text-fix-text-muted">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-forest align-middle" /> Vendor
            <span className="ml-4 inline-block h-2.5 w-2.5 rounded-full border-2 border-amber bg-fix-surface align-middle" />{" "}
            Directory
            {directorySummary ? (
              <span className="ml-2 text-fix-text-muted">· {directorySummary}</span>
            ) : locationSummary ? (
              <span className="ml-2 text-fix-text-muted">· {locationSummary}</span>
            ) : null}
          </p>
        )}
      </div>

      <DiscoverBrowse
        vendors={pagedVendors}
        vendorsTotal={filteredVendors.length}
        vendorsPage={vendorsPage}
        onVendorsPageChange={setVendorsPage}
        allListings={listings}
        listings={pagedListings}
        listingsTotal={filteredListings.length}
        listingsPage={listingsPage}
        onListingsPageChange={setListingsPage}
        directory={directoryItems}
        directoryTotal={directoryTotal}
        directoryPage={directoryPage}
        onDirectoryPageChange={handleDirectoryPageChange}
        directoryLoading={directoryLoading}
        directoryError={directoryError}
        directorySummary={directorySummary}
        locationSummary={locationSummary}
        searchError={searchError}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        form={form}
        onFormChange={setForm}
        onSearch={handleSearch}
        showVendors={showVendors}
        showDirectory={showDirectory}
        showListings={showListings}
        isAllView={isAllView}
      />
    </>
  );
}

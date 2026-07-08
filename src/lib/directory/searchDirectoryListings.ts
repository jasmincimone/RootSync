import type { Prisma } from "@prisma/client";

import {
  type DiscoverStateRadius,
  isDiscoverStateRadiusAnywhere,
} from "@/config/discoverLocation";
import { DEFAULT_DISCOVER_PAGE_SIZE, parseDiscoverPageSize } from "@/config/discoverPagination";
import { withPrismaRetry } from "@/lib/prisma";
import { DIRECTORY_SOURCE } from "@/lib/roles";
import { normalizeUsState } from "@/lib/usStates";

import { filterDirectoryByLocation } from "./directoryLocationFilter";
import { directoryTypeLabel, usdaRadiusMiles } from "./types";
import { fetchUsdaListings, usdaSearchLocationFromState } from "./usdaClient";
import type { NormalizedDirectoryListing } from "./types";
import { upsertNormalizedDirectoryListings } from "./upsertDirectoryListings";
import { publicDirectoryWhere } from "./syncUsdaDirectory";
import {
  clearCachedUsdaListings,
  directoryUsdaCacheKey,
  getCachedUsdaListings,
  setCachedUsdaListings,
} from "./usdaSearchCache";

export type DirectorySearchRow = {
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

export type DirectorySearchParams = {
  state?: string | null;
  city?: string | null;
  stateRadius?: DiscoverStateRadius | null;
  zip?: string | null;
  radiusMiles?: number;
  locationCenter?: { latitude: number; longitude: number } | null;
  query?: string;
  page: number;
  pageSize?: number;
  refresh?: boolean;
};

export type DirectorySearchResult = {
  items: DirectorySearchRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: string | null;
  mapPins: { id: string; name: string; latitude: number; longitude: number }[];
  searchScope: "state" | "zip" | null;
};

function matchesQuery(row: DirectorySearchRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.name,
    row.description ?? "",
    row.city ?? "",
    row.state ?? "",
    row.zip ?? "",
    row.addressLine1 ?? "",
    directoryTypeLabel(row.directoryType),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function matchesNormalizedQuery(row: NormalizedDirectoryListing, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    row.name,
    row.description ?? "",
    row.city ?? "",
    row.state ?? "",
    row.zip ?? "",
    row.addressLine1 ?? "",
    directoryTypeLabel(row.directoryType),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

function toSearchRow(row: {
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
}): DirectorySearchRow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    directoryType: row.directoryType,
    city: row.city,
    state: row.state,
    zip: row.zip,
    latitude: row.latitude,
    longitude: row.longitude,
    website: row.website,
    addressLine1: row.addressLine1,
  };
}

function buildSummary(params: {
  stateAbbrev: string | null;
  city: string | null;
  stateRadius: DiscoverStateRadius | null;
  zip: string | null;
  radiusMiles: number | null;
}): string | null {
  if (params.stateAbbrev && params.city && params.stateRadius) {
    if (isDiscoverStateRadiusAnywhere(params.stateRadius)) {
      return `Anywhere in ${params.stateAbbrev} (from ${params.city})`;
    }
    return `Within ${params.stateRadius} mi of ${params.city}, ${params.stateAbbrev}`;
  }
  if (params.zip && params.radiusMiles) {
    return `Within ${params.radiusMiles} mi of ${params.zip}`;
  }
  return null;
}

function mapPinsFromRows(rows: DirectorySearchRow[]) {
  return rows
    .filter(
      (r) =>
        r.latitude != null &&
        r.longitude != null &&
        Number.isFinite(r.latitude) &&
        Number.isFinite(r.longitude),
    )
    .map((r) => ({
      id: r.id,
      name: r.name,
      latitude: r.latitude as number,
      longitude: r.longitude as number,
    }));
}

function locationFilterInput(params: {
  stateAbbrev: string | null;
  city: string;
  stateRadius: DiscoverStateRadius | null;
  zip: string;
  radiusMiles: number | null;
  locationCenter: { latitude: number; longitude: number } | null;
}) {
  return {
    mode: params.stateAbbrev ? ("state" as const) : ("zip" as const),
    state: params.stateAbbrev ?? "",
    city: params.city,
    stateRadius: params.stateRadius,
    zip: params.zip,
    radiusMiles: params.radiusMiles ?? 0,
    zipCenter: params.locationCenter,
  };
}

function filterUsdaToLocation(
  rows: NormalizedDirectoryListing[],
  params: {
    stateAbbrev: string | null;
    city: string;
    stateRadius: DiscoverStateRadius | null;
    zip: string;
    radiusMiles: number | null;
    locationCenter: { latitude: number; longitude: number } | null;
  },
): NormalizedDirectoryListing[] {
  return filterDirectoryByLocation(rows, locationFilterInput(params));
}

async function loadRowsByExternalIds(externalIds: string[]): Promise<DirectorySearchRow[]> {
  if (externalIds.length === 0) return [];
  return withPrismaRetry(async (client) => {
    const dbRows = await client.directoryListing.findMany({
      where: {
        ...publicDirectoryWhere,
        source: DIRECTORY_SOURCE.USDA,
        externalId: { in: externalIds },
      },
      orderBy: { name: "asc" },
    });
    const byExternalId = new Map(dbRows.map((row) => [row.externalId, row]));
    return externalIds
      .map((id) => byExternalId.get(id))
      .filter((row): row is NonNullable<typeof row> => row != null)
      .map(toSearchRow);
  });
}

function dbLocationWhere(stateAbbrev: string | null): Prisma.DirectoryListingWhereInput {
  if (stateAbbrev) return { state: stateAbbrev };
  return {};
}

async function searchDirectoryFromDb(params: {
  stateAbbrev: string | null;
  city: string;
  stateRadius: DiscoverStateRadius | null;
  hasZipSearch: boolean;
  zip: string;
  radiusMiles: number | null;
  locationCenter: { latitude: number; longitude: number } | null;
  query: string;
  page: number;
  pageSize: number;
}): Promise<DirectorySearchResult | null> {
  const { stateAbbrev, hasZipSearch, query, page, pageSize } = params;

  if (hasZipSearch && !params.locationCenter) return null;

  const rows = await withPrismaRetry(async (client) => {
    return client.directoryListing.findMany({
      where: {
        ...publicDirectoryWhere,
        source: DIRECTORY_SOURCE.USDA,
        ...dbLocationWhere(stateAbbrev),
      },
      orderBy: { name: "asc" },
    });
  });

  let filtered = rows.map(toSearchRow);
  filtered = filterDirectoryByLocation(
    filtered,
    locationFilterInput({
      stateAbbrev,
      city: params.city,
      stateRadius: params.stateRadius,
      zip: params.zip,
      radiusMiles: params.radiusMiles,
      locationCenter: params.locationCenter,
    }),
  );
  if (query) filtered = filtered.filter((row) => matchesQuery(row, query));

  if (filtered.length === 0) return null;

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return {
    items,
    total,
    page,
    pageSize,
    summary: buildSummary({
      stateAbbrev,
      city: params.city,
      stateRadius: params.stateRadius,
      zip: hasZipSearch ? params.zip : null,
      radiusMiles: params.radiusMiles,
    }),
    mapPins: mapPinsFromRows(items),
    searchScope: stateAbbrev ? "state" : hasZipSearch ? "zip" : null,
  };
}

export async function searchDirectoryListings(
  params: DirectorySearchParams,
): Promise<DirectorySearchResult> {
  const page = Math.max(1, params.page);
  const pageSize = parseDiscoverPageSize(params.pageSize ?? DEFAULT_DISCOVER_PAGE_SIZE);
  const query = params.query?.trim() ?? "";
  const refresh = params.refresh === true;

  const stateAbbrev = params.state ? normalizeUsState(params.state) : null;
  const city = params.city?.trim() ?? "";
  const stateRadius = params.stateRadius ?? null;
  const zip = params.zip?.trim() ?? "";
  const radiusMiles =
    typeof params.radiusMiles === "number" && Number.isFinite(params.radiusMiles)
      ? params.radiusMiles
      : null;
  const locationCenter = params.locationCenter ?? null;

  const hasStateSearch = Boolean(stateAbbrev && city && stateRadius);
  const hasZipSearch = /^\d{5}$/.test(zip) && radiusMiles != null && radiusMiles > 0;
  const summary = buildSummary({
    stateAbbrev,
    city,
    stateRadius,
    zip: hasZipSearch ? zip : null,
    radiusMiles,
  });
  const searchScope: DirectorySearchResult["searchScope"] = hasStateSearch
    ? "state"
    : hasZipSearch
      ? "zip"
      : null;

  const locationParams = {
    stateAbbrev,
    city,
    stateRadius,
    zip,
    radiusMiles,
    locationCenter,
  };

  if (!hasStateSearch && !hasZipSearch) {
    const rows = await withPrismaRetry(async (client) => {
      const dbRows = await client.directoryListing.findMany({
        where: publicDirectoryWhere,
        orderBy: { name: "asc" },
      });
      return dbRows.map(toSearchRow);
    });
    const filtered = query ? rows.filter((row) => matchesQuery(row, query)) : rows;
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);
    return {
      items,
      total,
      page,
      pageSize,
      summary: null,
      mapPins: mapPinsFromRows(items),
      searchScope: null,
    };
  }

  const cacheKey = directoryUsdaCacheKey({
    state: stateAbbrev,
    city,
    stateRadius,
    zip: hasZipSearch ? zip : null,
    radiusMiles,
  });

  if (refresh && cacheKey) clearCachedUsdaListings(cacheKey);

  let catalog = cacheKey ? getCachedUsdaListings(cacheKey) : null;

  if (!catalog) {
    if (page > 1) {
      const fromDb = await searchDirectoryFromDb({
        stateAbbrev,
        city,
        stateRadius,
        hasZipSearch,
        zip,
        radiusMiles,
        locationCenter,
        query,
        page,
        pageSize,
      });
      if (fromDb && fromDb.total > page * pageSize - pageSize) {
        return fromDb;
      }
    }

    let location: string;
    let usdaRadius: number;
    if (hasStateSearch && stateRadius) {
      if (isDiscoverStateRadiusAnywhere(stateRadius)) {
        location = usdaSearchLocationFromState(stateAbbrev!) ?? stateAbbrev!;
        usdaRadius = 250;
      } else {
        location = `${city}, ${stateAbbrev}`;
        usdaRadius = usdaRadiusMiles(stateRadius);
      }
    } else {
      location = zip;
      usdaRadius = radiusMiles ?? 20;
    }

    const fetched = await fetchUsdaListings(location, usdaRadius);
    catalog = filterUsdaToLocation(fetched, locationParams);
    if (cacheKey) setCachedUsdaListings(cacheKey, catalog);
  }

  const filteredCatalog = query
    ? catalog.filter((row) => matchesNormalizedQuery(row, query))
    : catalog;
  const total = filteredCatalog.length;
  const start = (page - 1) * pageSize;
  const pageSlice = filteredCatalog.slice(start, start + pageSize);

  await upsertNormalizedDirectoryListings(pageSlice);

  const items = await loadRowsByExternalIds(pageSlice.map((row) => row.externalId));

  return {
    items,
    total,
    page,
    pageSize,
    summary,
    mapPins: mapPinsFromRows(items),
    searchScope,
  };
}

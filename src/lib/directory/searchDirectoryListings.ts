import type { Prisma } from "@prisma/client";

import {
  type DiscoverStateRadius,
  isDiscoverStateRadiusAnywhere,
} from "@/config/discoverLocation";
import { DEFAULT_DISCOVER_PAGE_SIZE, parseDiscoverPageSize } from "@/config/discoverPagination";
import { withPrismaRetry } from "@/lib/prisma";
import { DIRECTORY_SOURCE } from "@/lib/roles";
import { normalizeUsState } from "@/lib/usStates";

import {
  getStateDirectorySyncMeta,
  isDirectoryDbFresh,
} from "./directoryDbFreshness";
import { filterDirectoryByLocation } from "./directoryLocationFilter";
import { DIRECTORY_PREFETCH_NEXT_PAGE } from "./directorySearchConfig";
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
  stateRadius: DiscoverStateRadius | null;
  servedFromCache: boolean;
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
  if (params.stateAbbrev && params.stateRadius) {
    const city = params.city?.trim() ?? "";
    if (isDiscoverStateRadiusAnywhere(params.stateRadius)) {
      return city ? `Anywhere in ${params.stateAbbrev} (near ${city})` : `Anywhere in ${params.stateAbbrev}`;
    }
    if (city) return `Within ${params.stateRadius} mi of ${city}, ${params.stateAbbrev}`;
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

function textQueryWhere(query: string): Prisma.DirectoryListingWhereInput | undefined {
  const q = query.trim();
  if (!q) return undefined;
  return {
    OR: [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { addressLine1: { contains: q, mode: "insensitive" } },
      { zip: { contains: q, mode: "insensitive" } },
    ],
  };
}

function baseStateWhere(stateAbbrev: string): Prisma.DirectoryListingWhereInput {
  return {
    ...publicDirectoryWhere,
    source: DIRECTORY_SOURCE.USDA,
    state: stateAbbrev,
  };
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

function buildResult(params: {
  items: DirectorySearchRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: string | null;
  searchScope: DirectorySearchResult["searchScope"];
  stateRadius: DiscoverStateRadius | null;
  servedFromCache: boolean;
}): DirectorySearchResult {
  return {
    items: params.items,
    total: params.total,
    page: params.page,
    pageSize: params.pageSize,
    summary: params.summary,
    mapPins: mapPinsFromRows(params.items),
    searchScope: params.searchScope,
    stateRadius: params.stateRadius,
    servedFromCache: params.servedFromCache,
  };
}

/** Fast path for statewide Anywhere — paginate directly in Postgres. */
async function searchAnywhereFromDb(params: {
  stateAbbrev: string;
  query: string;
  page: number;
  pageSize: number;
  summary: string | null;
}): Promise<DirectorySearchResult> {
  const skip = (params.page - 1) * params.pageSize;
  const textWhere = textQueryWhere(params.query);
  const where: Prisma.DirectoryListingWhereInput = textWhere
    ? { AND: [baseStateWhere(params.stateAbbrev), textWhere] }
    : baseStateWhere(params.stateAbbrev);

  const [total, rows] = await withPrismaRetry(async (client) => {
    return Promise.all([
      client.directoryListing.count({ where }),
      client.directoryListing.findMany({
        where,
        orderBy: { name: "asc" },
        skip,
        take: params.pageSize,
      }),
    ]);
  });

  return buildResult({
    items: rows.map(toSearchRow),
    total,
    page: params.page,
    pageSize: params.pageSize,
    summary: params.summary,
    searchScope: "state",
    stateRadius: "anywhere",
    servedFromCache: true,
  });
}

async function searchStateRadiusFromDb(params: {
  stateAbbrev: string;
  city: string;
  stateRadius: DiscoverStateRadius;
  locationCenter: { latitude: number; longitude: number } | null;
  query: string;
  page: number;
  pageSize: number;
  summary: string | null;
}): Promise<DirectorySearchResult | null> {
  const rows = await withPrismaRetry(async (client) => {
    return client.directoryListing.findMany({
      where: baseStateWhere(params.stateAbbrev),
      orderBy: { name: "asc" },
    });
  });

  let filtered = rows.map(toSearchRow);
  filtered = filterDirectoryByLocation(
    filtered,
    locationFilterInput({
      stateAbbrev: params.stateAbbrev,
      city: params.city,
      stateRadius: params.stateRadius,
      zip: "",
      radiusMiles: null,
      locationCenter: params.locationCenter,
    }),
  );
  if (params.query) filtered = filtered.filter((row) => matchesQuery(row, params.query));
  if (filtered.length === 0) return null;

  const start = (params.page - 1) * params.pageSize;
  const items = filtered.slice(start, start + params.pageSize);

  return buildResult({
    items,
    total: filtered.length,
    page: params.page,
    pageSize: params.pageSize,
    summary: params.summary,
    searchScope: "state",
    stateRadius: params.stateRadius,
    servedFromCache: true,
  });
}

async function searchZipFromDb(params: {
  zip: string;
  radiusMiles: number;
  locationCenter: { latitude: number; longitude: number };
  query: string;
  page: number;
  pageSize: number;
  summary: string | null;
}): Promise<DirectorySearchResult | null> {
  const rows = await withPrismaRetry(async (client) => {
    return client.directoryListing.findMany({
      where: {
        ...publicDirectoryWhere,
        source: DIRECTORY_SOURCE.USDA,
        latitude: { not: null },
        longitude: { not: null },
      },
      orderBy: { name: "asc" },
    });
  });

  let filtered = filterDirectoryByLocation(
    rows.map(toSearchRow),
    locationFilterInput({
      stateAbbrev: null,
      city: "",
      stateRadius: null,
      zip: params.zip,
      radiusMiles: params.radiusMiles,
      locationCenter: params.locationCenter,
    }),
  );
  if (params.query) filtered = filtered.filter((row) => matchesQuery(row, params.query));
  if (filtered.length === 0) return null;

  const start = (params.page - 1) * params.pageSize;
  const items = filtered.slice(start, start + params.pageSize);

  return buildResult({
    items,
    total: filtered.length,
    page: params.page,
    pageSize: params.pageSize,
    summary: params.summary,
    searchScope: "zip",
    stateRadius: null,
    servedFromCache: true,
  });
}

async function tryFastDirectoryDbSearch(params: {
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
  summary: string | null;
}): Promise<DirectorySearchResult | null> {
  if (params.stateAbbrev && params.stateRadius) {
    const meta = await getStateDirectorySyncMeta(params.stateAbbrev);
    if (!isDirectoryDbFresh(meta)) return null;
    const minRowsNeeded = params.page * params.pageSize;
    if (meta.count < minRowsNeeded && !isDiscoverStateRadiusAnywhere(params.stateRadius)) {
      return null;
    }

    if (isDiscoverStateRadiusAnywhere(params.stateRadius)) {
      return searchAnywhereFromDb({
        stateAbbrev: params.stateAbbrev,
        query: params.query,
        page: params.page,
        pageSize: params.pageSize,
        summary: params.summary,
      });
    }

    if (params.city && params.locationCenter) {
      const result = await searchStateRadiusFromDb({
        stateAbbrev: params.stateAbbrev,
        city: params.city,
        stateRadius: params.stateRadius,
        locationCenter: params.locationCenter,
        query: params.query,
        page: params.page,
        pageSize: params.pageSize,
        summary: params.summary,
      });
      if (result && result.total >= minRowsNeeded - params.pageSize + 1) return result;
    }
    return null;
  }

  if (
    params.hasZipSearch &&
    params.locationCenter &&
    params.radiusMiles &&
    params.radiusMiles > 0
  ) {
    const result = await searchZipFromDb({
      zip: params.zip,
      radiusMiles: params.radiusMiles,
      locationCenter: params.locationCenter,
      query: params.query,
      page: params.page,
      pageSize: params.pageSize,
      summary: params.summary,
    });
    if (result && result.total > (params.page - 1) * params.pageSize) return result;
  }

  return null;
}

function hasStateSearchInput(
  stateAbbrev: string | null,
  city: string,
  stateRadius: DiscoverStateRadius | null,
): boolean {
  if (!stateAbbrev || !stateRadius) return false;
  if (isDiscoverStateRadiusAnywhere(stateRadius)) return true;
  return Boolean(city);
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

  const hasStateSearch = hasStateSearchInput(stateAbbrev, city, stateRadius);
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
    return buildResult({
      items,
      total,
      page,
      pageSize,
      summary: null,
      searchScope: null,
      stateRadius: null,
      servedFromCache: true,
    });
  }

  if (!refresh) {
    const fast = await tryFastDirectoryDbSearch({
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
      summary,
    });
    if (fast) return fast;
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
  const prefetchSlice = DIRECTORY_PREFETCH_NEXT_PAGE
    ? filteredCatalog.slice(start + pageSize, start + pageSize * 2)
    : [];

  const upsertRows = prefetchSlice.length > 0 ? [...pageSlice, ...prefetchSlice] : pageSlice;
  await upsertNormalizedDirectoryListings(upsertRows);

  const items = await loadRowsByExternalIds(pageSlice.map((row) => row.externalId));

  return buildResult({
    items,
    total,
    page,
    pageSize,
    summary,
    searchScope,
    stateRadius,
    servedFromCache: Boolean(catalog && !refresh),
  });
}

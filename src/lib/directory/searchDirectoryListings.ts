import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { DIRECTORY_LISTING_STATUS, DIRECTORY_SOURCE } from "@/lib/roles";
import { normalizeUsState } from "@/lib/usStates";

import { directoryTypeLabel } from "./types";
import { fetchUsdaListings, usdaSearchLocationFromState } from "./usdaClient";
import type { NormalizedDirectoryListing } from "./types";
import { publicDirectoryWhere } from "./syncUsdaDirectory";

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
  zip?: string | null;
  radiusMiles?: number;
  query?: string;
  page: number;
  pageSize: number;
};

export type DirectorySearchResult = {
  items: DirectorySearchRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: string | null;
  mapPins: { id: string; name: string; latitude: number; longitude: number }[];
};

function toPrismaData(
  row: NormalizedDirectoryListing,
  syncedAt: Date,
): Prisma.DirectoryListingCreateInput {
  return {
    name: row.name,
    description: row.description,
    directoryType: row.directoryType,
    addressLine1: row.addressLine1,
    city: row.city,
    state: row.state,
    zip: row.zip,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    email: row.email,
    website: row.website,
    source: DIRECTORY_SOURCE.USDA,
    externalId: row.externalId,
    externalUrl: row.externalUrl,
    rawSourceJson: row.rawSourceJson as Prisma.InputJsonValue,
    lastSyncedAt: syncedAt,
    status: DIRECTORY_LISTING_STATUS.ACTIVE,
  };
}

async function upsertNormalizedRows(rows: NormalizedDirectoryListing[]): Promise<void> {
  const syncedAt = new Date();
  for (const row of rows) {
    const data = toPrismaData(row, syncedAt);
    try {
      await prisma.directoryListing.upsert({
        where: {
          source_externalId: {
            source: DIRECTORY_SOURCE.USDA,
            externalId: row.externalId,
          },
        },
        create: data,
        update: {
          name: data.name,
          description: data.description,
          directoryType: data.directoryType,
          addressLine1: data.addressLine1,
          city: data.city,
          state: data.state,
          zip: data.zip,
          latitude: data.latitude,
          longitude: data.longitude,
          phone: data.phone,
          email: data.email,
          website: data.website,
          externalUrl: data.externalUrl,
          rawSourceJson: data.rawSourceJson,
          lastSyncedAt: syncedAt,
          status: DIRECTORY_LISTING_STATUS.ACTIVE,
        },
      });
    } catch {
      // Skip individual row failures.
    }
  }
}

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
  zip: string | null;
  radiusMiles: number | null;
}): string | null {
  if (params.stateAbbrev) return `State: ${params.stateAbbrev}`;
  if (params.zip && params.radiusMiles) {
    return `Within ${params.radiusMiles} mi of ${params.zip}`;
  }
  return null;
}

export async function searchDirectoryListings(
  params: DirectorySearchParams,
): Promise<DirectorySearchResult> {
  const page = Math.max(1, params.page);
  const pageSize = Math.max(1, params.pageSize);
  const query = params.query?.trim() ?? "";

  const stateAbbrev = params.state ? normalizeUsState(params.state) : null;
  const zip = params.zip?.trim() ?? "";
  const radiusMiles =
    typeof params.radiusMiles === "number" && Number.isFinite(params.radiusMiles)
      ? params.radiusMiles
      : null;

  const hasStateSearch = Boolean(stateAbbrev);
  const hasZipSearch = /^\d{5}$/.test(zip) && radiusMiles != null && radiusMiles > 0;

  let rows: DirectorySearchRow[];

  if (hasStateSearch || hasZipSearch) {
    const location = hasStateSearch
      ? (usdaSearchLocationFromState(stateAbbrev!) ?? stateAbbrev!)
      : zip;
    const usdaRadius = hasStateSearch ? 250 : (radiusMiles ?? 20);
    const usdaRows = await fetchUsdaListings(location, usdaRadius);
    await upsertNormalizedRows(usdaRows);

    const externalIds = usdaRows.map((r) => r.externalId);
    const dbRows = await prisma.directoryListing.findMany({
      where: {
        ...publicDirectoryWhere,
        source: DIRECTORY_SOURCE.USDA,
        externalId: { in: externalIds },
      },
      orderBy: { name: "asc" },
    });
    rows = dbRows.map(toSearchRow);
  } else {
    const dbRows = await prisma.directoryListing.findMany({
      where: publicDirectoryWhere,
      orderBy: { name: "asc" },
    });
    rows = dbRows.map(toSearchRow);
  }

  const filtered = query ? rows.filter((row) => matchesQuery(row, query)) : rows;
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  const mapPins = filtered
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

  return {
    items,
    total,
    page,
    pageSize,
    summary: buildSummary({ stateAbbrev, zip: hasZipSearch ? zip : null, radiusMiles }),
    mapPins,
  };
}

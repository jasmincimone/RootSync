import {
  DIRECTORY_TYPE,
  type DirectoryType,
} from "@/lib/roles";

import {
  directoryTypeToUsdaSlug,
  usdaSlugToDirectoryType,
  type NormalizedDirectoryListing,
  type UsdaDirectorySlug,
  type UsdaRawListing,
  type UsdaSearchParams,
  USDA_DIRECTORY_SLUG_LIST,
  usdaRadiusMiles,
} from "./types";

const USER_AGENT = "RootSync/1.0 (directory-sync; contact@rootsync.io)";
const SEARCH_BASE = "https://www.usdalocalfoodportal.com/api/get_searchresult_list/";
const DATA_API_BASE = "https://www.usdalocalfoodportal.com/api";

function str(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeWebsite(raw: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function stateAbbrev(raw: string | null): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (s.length === 2) return s.toUpperCase();
  const map: Record<string, string> = {
    georgia: "GA",
    michigan: "MI",
    california: "CA",
    "new york": "NY",
  };
  return map[s.toLowerCase()] ?? s.slice(0, 2).toUpperCase();
}

export function normalizeUsdaListing(raw: UsdaRawListing): NormalizedDirectoryListing | null {
  const externalId = str(raw.listing_id) ?? str(raw.id);
  const name = str(raw.listing_name) ?? str(raw.name);
  if (!externalId || !name) return null;

  const slug = str(raw.directory_type) ?? "farmersmarket";
  const directoryType = usdaSlugToDirectoryType(slug) ?? DIRECTORY_TYPE.FARMERS_MARKET;

  const longitude = num(raw.location_x);
  const latitude = num(raw.location_y);

  const externalUrl = `https://www.usdalocalfoodportal.com/fe/flisting/?lid=${encodeURIComponent(externalId)}&directory_type=${encodeURIComponent(slug)}`;

  return {
    name,
    description: str(raw.listing_desc) ?? str(raw.description),
    directoryType,
    addressLine1: str(raw.location_street) ?? str(raw.location_address),
    city: str(raw.location_city),
    state: stateAbbrev(str(raw.location_state)),
    zip: str(raw.location_zipcode),
    latitude,
    longitude,
    phone: str(raw.contact_phone),
    email: str(raw.contact_email),
    website: normalizeWebsite(str(raw.media_website) ?? str(raw.listing_website)),
    externalId,
    externalUrl,
    rawSourceJson: raw,
  };
}

function buildSearchUrl(params: UsdaSearchParams): string {
  const dirs = params.directories?.length ? params.directories : USDA_DIRECTORY_SLUG_LIST;
  const radius = usdaRadiusMiles(params.radiusMiles);
  const q = new URLSearchParams();
  q.set("mydata[directory]", dirs.join("|"));
  q.set("mydata[radius]", String(radius));

  if (params.zip) {
    q.set("mydata[location]", params.zip);
  } else if (params.latitude != null && params.longitude != null) {
    q.set("mydata[x]", String(params.longitude));
    q.set("mydata[y]", String(params.latitude));
  }

  return `${SEARCH_BASE}?${q.toString()}`;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json, text/plain, */*",
    },
    next: { revalidate: 0 },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`USDA request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`USDA returned non-JSON: ${text.slice(0, 200)}`);
  }
}

function extractListings(payload: unknown): UsdaRawListing[] {
  if (Array.isArray(payload)) return payload as UsdaRawListing[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    const data = obj.data ?? obj.results ?? obj.listings;
    if (Array.isArray(data)) return data as UsdaRawListing[];
  }
  return [];
}

/** Primary search — USDA portal unified search API. */
export async function fetchUsdaSearchListings(params: UsdaSearchParams): Promise<UsdaRawListing[]> {
  const url = buildSearchUrl(params);
  const payload = await fetchJson(url);
  return extractListings(payload);
}

/** Fallback — per-directory datasharing API (requires API key). */
export async function fetchUsdaDirectoryListings(
  slug: UsdaDirectorySlug,
  params: { zip: string; radiusMiles: number; apiKey: string },
): Promise<UsdaRawListing[]> {
  const radius = usdaRadiusMiles(params.radiusMiles);
  const url = `${DATA_API_BASE}/${slug}/?apikey=${encodeURIComponent(params.apiKey)}&zip=${encodeURIComponent(params.zip)}&radius=${radius}`;
  const payload = await fetchJson(url);
  return extractListings(payload).map((row) => ({
    ...row,
    directory_type: row.directory_type ?? slug,
  }));
}

export async function fetchUsdaListingsNearZip(
  zip: string,
  radiusMiles: number,
  apiKey?: string | null,
): Promise<NormalizedDirectoryListing[]> {
  let raw: UsdaRawListing[] = [];
  let searchError: Error | null = null;

  try {
    raw = await fetchUsdaSearchListings({ zip, radiusMiles });
  } catch (e) {
    searchError = e instanceof Error ? e : new Error(String(e));
  }

  if (raw.length === 0 && apiKey) {
    const batches = await Promise.all(
      USDA_DIRECTORY_SLUG_LIST.map((slug) =>
        fetchUsdaDirectoryListings(slug, { zip, radiusMiles, apiKey }).catch(() => [] as UsdaRawListing[]),
      ),
    );
    raw = batches.flat();
  }

  if (raw.length === 0 && searchError && !apiKey) {
    throw searchError;
  }

  if (raw.length === 0 && searchError) {
    console.warn("USDA search API failed; datasharing fallback returned no rows.", searchError.message);
  }

  const byId = new Map<string, NormalizedDirectoryListing>();
  for (const row of raw) {
    const normalized = normalizeUsdaListing(row);
    if (!normalized) continue;
    byId.set(`${normalized.directoryType}:${normalized.externalId}`, normalized);
  }
  return [...byId.values()];
}

export function formatDirectoryAddress(parts: {
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string | null {
  const line = [parts.addressLine1, [parts.city, parts.state].filter(Boolean).join(", "), parts.zip]
    .filter(Boolean)
    .join(" · ");
  return line || null;
}

export { directoryTypeToUsdaSlug };

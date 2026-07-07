import {
  DIRECTORY_TYPE,
  type DirectoryType,
} from "@/lib/roles";
import { normalizeUsState, usdaLocationForState } from "@/lib/usStates";

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

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const USDA_HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENT,
  Accept: "application/json, text/plain, */*",
  Referer: "https://www.usdalocalfoodportal.com/",
};

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
  return normalizeUsState(raw) ?? raw.trim().slice(0, 2).toUpperCase();
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

  const location = params.location ?? params.zip;
  if (location) {
    q.set("mydata[location]", location);
  } else if (params.latitude != null && params.longitude != null) {
    q.set("mydata[x]", String(params.longitude));
    q.set("mydata[y]", String(params.latitude));
  }

  return `${SEARCH_BASE}?${q.toString()}`;
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: USDA_HEADERS,
    next: { revalidate: 0 },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`USDA request failed (${res.status}): ${text.slice(0, 200)}`);
  }
  if (text.trim() === "apikey error") {
    throw new Error("USDA datasharing API key rejected (use search API instead).");
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

export async function fetchUsdaListings(
  location: string,
  radiusMiles: number,
  _apiKey?: string | null,
): Promise<NormalizedDirectoryListing[]> {
  let raw: UsdaRawListing[] = [];

  try {
    raw = await fetchUsdaSearchListings({ location, radiusMiles });
  } catch (searchErr) {
    const message = searchErr instanceof Error ? searchErr.message : String(searchErr);
    throw new Error(`USDA search failed: ${message}`);
  }

  if (raw.length === 0) {
    console.warn("USDA search returned zero listings for this area.");
  }

  const byId = new Map<string, NormalizedDirectoryListing>();
  for (const row of raw) {
    const normalized = normalizeUsdaListing(row);
    if (!normalized) continue;
    byId.set(`${normalized.directoryType}:${normalized.externalId}`, normalized);
  }
  return [...byId.values()];
}

/** @deprecated Use fetchUsdaListings */
export async function fetchUsdaListingsNearZip(
  zip: string,
  radiusMiles: number,
  apiKey?: string | null,
): Promise<NormalizedDirectoryListing[]> {
  return fetchUsdaListings(zip, radiusMiles, apiKey);
}

/** Resolve state input to the label USDA expects in `mydata[location]`. */
export function usdaSearchLocationFromState(stateInput: string): string | null {
  const abbrev = normalizeUsState(stateInput);
  if (!abbrev) return null;
  return usdaLocationForState(abbrev);
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

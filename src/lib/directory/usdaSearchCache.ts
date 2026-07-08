import type { DiscoverStateRadius } from "@/config/discoverLocation";
import { isDiscoverStateRadiusAnywhere } from "@/config/discoverLocation";

import type { NormalizedDirectoryListing } from "./types";

const CACHE_TTL_MS = 15 * 60 * 1000;

type CacheEntry = {
  rows: NormalizedDirectoryListing[];
  at: number;
};

const cache = new Map<string, CacheEntry>();

export function directoryUsdaCacheKey(params: {
  state?: string | null;
  city?: string | null;
  stateRadius?: DiscoverStateRadius | null;
  zip?: string | null;
  radiusMiles?: number | null;
}): string | null {
  if (params.state && params.city && params.stateRadius) {
    const cityKey = params.city.trim().toLowerCase();
    const radiusKey = isDiscoverStateRadiusAnywhere(params.stateRadius)
      ? "anywhere"
      : String(params.stateRadius);
    return `state:${params.state.toUpperCase()}:${cityKey}:${radiusKey}`;
  }
  if (params.zip && params.radiusMiles) {
    return `zip:${params.zip}:${params.radiusMiles}`;
  }
  return null;
}

export function getCachedUsdaListings(key: string): NormalizedDirectoryListing[] | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.rows;
}

export function setCachedUsdaListings(key: string, rows: NormalizedDirectoryListing[]): void {
  cache.set(key, { rows, at: Date.now() });
}

export function clearCachedUsdaListings(key: string): void {
  cache.delete(key);
}

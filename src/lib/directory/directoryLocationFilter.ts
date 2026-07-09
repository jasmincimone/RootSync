import {
  type DiscoverStateRadius,
  isDiscoverStateRadiusAnywhere,
} from "@/config/discoverLocation";
import { distanceMiles } from "@/lib/geo";
import { normalizeUsState } from "@/lib/usStates";

export type DirectoryLocationMode = "state" | "zip";

export type DirectoryLocationFilterInput = {
  mode: DirectoryLocationMode;
  state: string;
  city: string;
  zip: string;
  radiusMiles: number;
  stateRadius: DiscoverStateRadius | null;
  zipCenter: { latitude: number; longitude: number } | null;
};

export type DirectoryWithCoords = {
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
};

export function isValidUsZip(zip: string): boolean {
  return /^\d{5}$/.test(zip.trim());
}

export function isStateLocationComplete(input: {
  state: string;
  city: string;
  stateRadius: DiscoverStateRadius | null;
}): boolean {
  const st = normalizeUsState(input.state);
  if (!st || !input.stateRadius) return false;
  if (isDiscoverStateRadiusAnywhere(input.stateRadius)) return true;
  return Boolean(input.city.trim());
}

export function isDirectoryLocationFilterActive(input: DirectoryLocationFilterInput): boolean {
  if (input.mode === "state") {
    return isStateLocationComplete({
      state: input.state,
      city: input.city,
      stateRadius: input.stateRadius,
    });
  }
  return (
    isValidUsZip(input.zip) &&
    input.radiusMiles > 0 &&
    input.zipCenter != null
  );
}

export function directoryLocationFilterSummary(input: DirectoryLocationFilterInput): string | null {
  if (!isDirectoryLocationFilterActive(input)) return null;
  if (input.mode === "state") {
    const st = normalizeUsState(input.state);
    if (!st || !input.stateRadius) return null;
    const city = input.city.trim();
    if (isDiscoverStateRadiusAnywhere(input.stateRadius)) {
      return city ? `Anywhere in ${st} (near ${city})` : `Anywhere in ${st}`;
    }
    if (!city) return null;
    return `Within ${input.stateRadius} mi of ${city}, ${st}`;
  }
  return `Within ${input.radiusMiles} mi of ${input.zip.trim()}`;
}

export function filterDirectoryByLocation<T extends DirectoryWithCoords>(
  rows: T[],
  input: DirectoryLocationFilterInput,
): T[] {
  if (!isDirectoryLocationFilterActive(input)) return rows;

  if (input.mode === "state") {
    const st = normalizeUsState(input.state);
    if (!st) return rows;
    let filtered = rows.filter((r) => r.state?.toUpperCase() === st);
    if (
      input.stateRadius &&
      !isDiscoverStateRadiusAnywhere(input.stateRadius) &&
      input.zipCenter
    ) {
      const radiusMiles = input.stateRadius;
      const { latitude: cLat, longitude: cLon } = input.zipCenter;
      filtered = filtered.filter((r) => {
        if (r.latitude == null || r.longitude == null) return false;
        return distanceMiles(cLat, cLon, r.latitude, r.longitude) <= radiusMiles;
      });
    }
    return filtered;
  }

  const zip = input.zip.trim();
  if (!isValidUsZip(zip) || input.radiusMiles <= 0 || !input.zipCenter) return rows;

  const { latitude: cLat, longitude: cLon } = input.zipCenter;
  return rows.filter((r) => {
    if (r.latitude == null || r.longitude == null) return false;
    return distanceMiles(cLat, cLon, r.latitude, r.longitude) <= input.radiusMiles;
  });
}

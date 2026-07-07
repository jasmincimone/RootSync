import { distanceMiles } from "@/lib/geo";
import { normalizeUsState } from "@/lib/usStates";

export type DirectoryLocationMode = "state" | "zip";

export type DirectoryLocationFilterInput = {
  mode: DirectoryLocationMode;
  state: string;
  zip: string;
  radiusMiles: number;
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

export function isDirectoryLocationFilterActive(input: DirectoryLocationFilterInput): boolean {
  if (input.mode === "state") {
    return normalizeUsState(input.state) != null;
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
    return st ? `State: ${st}` : null;
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
    return rows.filter((r) => r.state?.toUpperCase() === st);
  }

  const zip = input.zip.trim();
  if (!isValidUsZip(zip) || input.radiusMiles <= 0 || !input.zipCenter) return rows;

  const { latitude: cLat, longitude: cLon } = input.zipCenter;
  return rows.filter((r) => {
    if (r.latitude == null || r.longitude == null) return false;
    return distanceMiles(cLat, cLon, r.latitude, r.longitude) <= input.radiusMiles;
  });
}

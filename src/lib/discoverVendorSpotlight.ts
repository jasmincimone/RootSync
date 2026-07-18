import { distanceMiles } from "@/lib/geo";

import type { DiscoverVendorRow } from "@/components/DiscoverBrowse";

export const DISCOVER_VENDOR_SPOTLIGHT_LIMIT = 4;

export type DiscoverVendorSpotlightLists = {
  topByPulse: DiscoverVendorRow[];
  nearby: Array<DiscoverVendorRow & { distanceMiles: number }>;
};

/**
 * Always-visible Discover vendor spotlights:
 * - topByPulse: highest community Pulse scores system-wide
 * - nearby: closest vendors when a location center is available (empty otherwise)
 */
export function buildDiscoverVendorSpotlight(
  vendors: DiscoverVendorRow[],
  locationCenter: { latitude: number; longitude: number } | null,
  limit = DISCOVER_VENDOR_SPOTLIGHT_LIMIT,
): DiscoverVendorSpotlightLists {
  const topByPulse = [...vendors]
    .sort((a, b) => {
      const scoreDiff = (b.pulseScore ?? 0) - (a.pulseScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return a.displayName.localeCompare(b.displayName);
    })
    .slice(0, limit);

  if (!locationCenter) {
    return { topByPulse, nearby: [] };
  }

  const withCoords = vendors.filter(
    (v) =>
      v.latitude != null &&
      v.longitude != null &&
      Number.isFinite(v.latitude) &&
      Number.isFinite(v.longitude),
  );

  const nearby = [...withCoords]
    .map((v) => ({
      vendor: v,
      miles: distanceMiles(
        locationCenter.latitude,
        locationCenter.longitude,
        v.latitude as number,
        v.longitude as number,
      ),
    }))
    .sort((a, b) => {
      if (a.miles !== b.miles) return a.miles - b.miles;
      const scoreDiff = (b.vendor.pulseScore ?? 0) - (a.vendor.pulseScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return a.vendor.displayName.localeCompare(b.vendor.displayName);
    })
    .slice(0, limit)
    .map(({ vendor, miles }) => ({ ...vendor, distanceMiles: miles }));

  return { topByPulse, nearby };
}

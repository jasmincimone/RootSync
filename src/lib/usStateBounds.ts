/** Approximate WGS84 bounding boxes for US states (continental + AK/HI). Good for Discover filters. */
const US_STATE_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  AL: { minLat: 30.14, maxLat: 35.01, minLng: -88.47, maxLng: -84.89 },
  AK: { minLat: 51.21, maxLat: 71.39, minLng: -179.15, maxLng: -129.98 },
  AZ: { minLat: 31.33, maxLat: 37.0, minLng: -114.82, maxLng: -109.05 },
  AR: { minLat: 33.0, maxLat: 36.5, minLng: -94.62, maxLng: -89.64 },
  CA: { minLat: 32.53, maxLat: 42.01, minLng: -124.41, maxLng: -114.13 },
  CO: { minLat: 36.99, maxLat: 41.0, minLng: -109.06, maxLng: -102.04 },
  CT: { minLat: 40.98, maxLat: 42.05, minLng: -73.73, maxLng: -71.79 },
  DC: { minLat: 38.79, maxLat: 38.99, minLng: -77.12, maxLng: -76.91 },
  DE: { minLat: 38.45, maxLat: 39.84, minLng: -75.79, maxLng: -75.05 },
  FL: { minLat: 24.52, maxLat: 31.0, minLng: -87.63, maxLng: -79.97 },
  GA: { minLat: 30.36, maxLat: 35.0, minLng: -85.61, maxLng: -80.84 },
  HI: { minLat: 18.91, maxLat: 22.24, minLng: -160.25, maxLng: -154.81 },
  ID: { minLat: 41.99, maxLat: 49.0, minLng: -117.24, maxLng: -111.04 },
  IL: { minLat: 36.97, maxLat: 42.51, minLng: -91.51, maxLng: -87.02 },
  IN: { minLat: 37.77, maxLat: 41.76, minLng: -88.1, maxLng: -84.78 },
  IA: { minLat: 40.38, maxLat: 43.5, minLng: -96.64, maxLng: -90.14 },
  KS: { minLat: 36.99, maxLat: 40.0, minLng: -102.05, maxLng: -94.59 },
  KY: { minLat: 36.5, maxLat: 39.15, minLng: -89.57, maxLng: -81.96 },
  LA: { minLat: 28.93, maxLat: 33.02, minLng: -94.04, maxLng: -88.82 },
  ME: { minLat: 43.06, maxLat: 47.46, minLng: -71.08, maxLng: -66.95 },
  MD: { minLat: 37.91, maxLat: 39.72, minLng: -79.49, maxLng: -75.05 },
  MA: { minLat: 41.24, maxLat: 42.89, minLng: -73.51, maxLng: -69.93 },
  MI: { minLat: 41.7, maxLat: 48.19, minLng: -90.42, maxLng: -82.41 },
  MN: { minLat: 43.5, maxLat: 49.38, minLng: -97.24, maxLng: -89.49 },
  MS: { minLat: 30.17, maxLat: 34.99, minLng: -91.66, maxLng: -88.1 },
  MO: { minLat: 35.99, maxLat: 40.61, minLng: -95.77, maxLng: -89.1 },
  MT: { minLat: 44.36, maxLat: 49.0, minLng: -116.05, maxLng: -104.04 },
  NE: { minLat: 39.99, maxLat: 43.0, minLng: -104.05, maxLng: -95.31 },
  NV: { minLat: 35.0, maxLat: 42.0, minLng: -120.01, maxLng: -114.04 },
  NH: { minLat: 42.7, maxLat: 45.31, minLng: -72.56, maxLng: -70.7 },
  NJ: { minLat: 38.93, maxLat: 41.36, minLng: -75.56, maxLng: -73.89 },
  NM: { minLat: 31.33, maxLat: 37.0, minLng: -109.05, maxLng: -103.0 },
  NY: { minLat: 40.5, maxLat: 45.02, minLng: -79.76, maxLng: -71.86 },
  NC: { minLat: 33.84, maxLat: 36.59, minLng: -84.32, maxLng: -75.46 },
  ND: { minLat: 45.94, maxLat: 49.0, minLng: -104.05, maxLng: -96.55 },
  OH: { minLat: 38.4, maxLat: 42.0, minLng: -84.82, maxLng: -80.52 },
  OK: { minLat: 33.62, maxLat: 37.0, minLng: -103.0, maxLng: -94.43 },
  OR: { minLat: 41.99, maxLat: 46.29, minLng: -124.57, maxLng: -116.46 },
  PA: { minLat: 39.72, maxLat: 42.27, minLng: -80.52, maxLng: -74.69 },
  RI: { minLat: 41.15, maxLat: 42.02, minLng: -71.86, maxLng: -71.12 },
  SC: { minLat: 32.03, maxLat: 35.22, minLng: -83.35, maxLng: -78.54 },
  SD: { minLat: 42.48, maxLat: 45.95, minLng: -104.06, maxLng: -96.44 },
  TN: { minLat: 34.98, maxLat: 36.68, minLng: -90.31, maxLng: -81.65 },
  TX: { minLat: 25.84, maxLat: 36.5, minLng: -106.65, maxLng: -93.51 },
  UT: { minLat: 36.99, maxLat: 42.0, minLng: -114.05, maxLng: -109.04 },
  VT: { minLat: 42.73, maxLat: 45.02, minLng: -73.44, maxLng: -71.46 },
  VA: { minLat: 36.54, maxLat: 39.47, minLng: -83.68, maxLng: -75.24 },
  WA: { minLat: 45.54, maxLat: 49.0, minLng: -124.76, maxLng: -116.92 },
  WV: { minLat: 37.2, maxLat: 40.64, minLng: -82.64, maxLng: -77.72 },
  WI: { minLat: 42.49, maxLat: 47.08, minLng: -92.89, maxLng: -86.25 },
  WY: { minLat: 40.99, maxLat: 45.01, minLng: -111.06, maxLng: -104.05 },
};

/** Whether a point falls inside a state's approximate bounding box. */
export function coordinatesInUsState(
  latitude: number,
  longitude: number,
  stateAbbrev: string,
): boolean {
  const bounds = US_STATE_BOUNDS[stateAbbrev.toUpperCase()];
  if (!bounds) return false;
  return (
    latitude >= bounds.minLat &&
    latitude <= bounds.maxLat &&
    longitude >= bounds.minLng &&
    longitude <= bounds.maxLng
  );
}

/** Best-effort state lookup from coordinates (first matching bounding box). */
export function stateAbbrevFromCoordinates(
  latitude: number,
  longitude: number,
): string | null {
  for (const [abbrev, bounds] of Object.entries(US_STATE_BOUNDS)) {
    if (
      latitude >= bounds.minLat &&
      latitude <= bounds.maxLat &&
      longitude >= bounds.minLng &&
      longitude <= bounds.maxLng
    ) {
      return abbrev;
    }
  }
  return null;
}

export type DiscoverMapPin =
  | {
      kind: "vendor";
      id: string;
      label: string;
      latitude: number;
      longitude: number;
    }
  | {
      kind: "directory";
      id: string;
      label: string;
      latitude: number;
      longitude: number;
    };

/** @deprecated Use DiscoverMapPin */
export type MarketplaceMapVendor = {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
};

export function vendorsToMapPins(
  vendors: { id: string; displayName: string; latitude: number; longitude: number }[],
): DiscoverMapPin[] {
  return vendors.map((v) => ({
    kind: "vendor",
    id: v.id,
    label: v.displayName,
    latitude: v.latitude,
    longitude: v.longitude,
  }));
}

export function directoryToMapPins(
  rows: { id: string; name: string; latitude: number; longitude: number }[],
): DiscoverMapPin[] {
  return rows.map((d) => ({
    kind: "directory",
    id: d.id,
    label: d.name,
    latitude: d.latitude,
    longitude: d.longitude,
  }));
}

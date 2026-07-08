export const DISCOVER_STATE_RADIUS_PRESETS = [5, 10, 25, 50, 100] as const;

export type DiscoverStateRadiusPreset = (typeof DISCOVER_STATE_RADIUS_PRESETS)[number];

export const DISCOVER_STATE_RADIUS_ANYWHERE = "anywhere" as const;

export type DiscoverStateRadius = DiscoverStateRadiusPreset | typeof DISCOVER_STATE_RADIUS_ANYWHERE;

export const DEFAULT_STATE_RADIUS_MILES = 25;

export const DISCOVER_STATE_RADIUS_OPTIONS: {
  value: DiscoverStateRadius;
  label: string;
}[] = [
  { value: 5, label: "5 mi" },
  { value: 10, label: "10 mi" },
  { value: 25, label: "25 mi" },
  { value: 50, label: "50 mi" },
  { value: 100, label: "100 mi" },
  { value: DISCOVER_STATE_RADIUS_ANYWHERE, label: "Anywhere" },
];

export function parseDiscoverStateRadius(value: string): DiscoverStateRadius | null {
  const trimmed = value.trim().toLowerCase();
  if (trimmed === DISCOVER_STATE_RADIUS_ANYWHERE) return DISCOVER_STATE_RADIUS_ANYWHERE;
  const n = Number(trimmed);
  if (DISCOVER_STATE_RADIUS_PRESETS.includes(n as DiscoverStateRadiusPreset)) {
    return n as DiscoverStateRadiusPreset;
  }
  return null;
}

/** Accept string or number from JSON request bodies. */
export function parseDiscoverStateRadiusFromUnknown(
  value: unknown,
): DiscoverStateRadius | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return parseDiscoverStateRadius(String(value));
  }
  if (typeof value === "string") return parseDiscoverStateRadius(value);
  return null;
}

export function isDiscoverStateRadiusAnywhere(
  radius: DiscoverStateRadius | null,
): radius is typeof DISCOVER_STATE_RADIUS_ANYWHERE {
  return radius === DISCOVER_STATE_RADIUS_ANYWHERE;
}

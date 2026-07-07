import { DIRECTORY_TYPE, type DirectoryType } from "@/lib/roles";

/** USDA portal directory_type → internal enum */
export const USDA_DIRECTORY_SLUGS = {
  farmersmarket: DIRECTORY_TYPE.FARMERS_MARKET,
  csa: DIRECTORY_TYPE.CSA,
  onfarmmarket: DIRECTORY_TYPE.ON_FARM_MARKET,
  foodhub: DIRECTORY_TYPE.FOOD_HUB,
  agritourism: DIRECTORY_TYPE.AGRITOURISM,
} as const;

export type UsdaDirectorySlug = keyof typeof USDA_DIRECTORY_SLUGS;

export const USDA_DIRECTORY_SLUG_LIST = Object.keys(
  USDA_DIRECTORY_SLUGS,
) as UsdaDirectorySlug[];

export const DIRECTORY_TYPE_LABELS: Record<DirectoryType, string> = {
  [DIRECTORY_TYPE.FARMERS_MARKET]: "Farmers market",
  [DIRECTORY_TYPE.CSA]: "CSA",
  [DIRECTORY_TYPE.ON_FARM_MARKET]: "On-farm market",
  [DIRECTORY_TYPE.FOOD_HUB]: "Food hub",
  [DIRECTORY_TYPE.AGRITOURISM]: "Agritourism",
};

export function directoryTypeLabel(type: string | null | undefined): string {
  if (!type) return "Directory listing";
  return DIRECTORY_TYPE_LABELS[type as DirectoryType] ?? "Directory listing";
}

export function usdaSlugToDirectoryType(slug: string): DirectoryType | null {
  const key = slug.toLowerCase().replace(/[^a-z]/g, "") as UsdaDirectorySlug;
  if (key in USDA_DIRECTORY_SLUGS) {
    return USDA_DIRECTORY_SLUGS[key as UsdaDirectorySlug];
  }
  const normalized = slug.toLowerCase();
  for (const [k, v] of Object.entries(USDA_DIRECTORY_SLUGS)) {
    if (normalized.includes(k)) return v;
  }
  return null;
}

export function directoryTypeToUsdaSlug(type: DirectoryType): UsdaDirectorySlug {
  const entry = Object.entries(USDA_DIRECTORY_SLUGS).find(([, v]) => v === type);
  return (entry?.[0] ?? "farmersmarket") as UsdaDirectorySlug;
}

/** USDA radius enum (miles): 10, 30, 100, 250 */
export function usdaRadiusMiles(requested: number): 10 | 30 | 100 | 250 {
  if (requested <= 10) return 10;
  if (requested <= 30) return 30;
  if (requested <= 100) return 100;
  return 250;
}

export type UsdaSearchParams = {
  /** ZIP, state name, or state abbreviation — passed to USDA `mydata[location]`. */
  location?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  radiusMiles: number;
  directories?: UsdaDirectorySlug[];
};

export type UsdaRawListing = Record<string, unknown>;

export type NormalizedDirectoryListing = {
  name: string;
  description: string | null;
  directoryType: DirectoryType;
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  externalId: string;
  externalUrl: string | null;
  rawSourceJson: UsdaRawListing;
};

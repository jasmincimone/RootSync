import { LISTING_TYPE, type ListingType } from "@/lib/roles";

/** Filter Discover by entity source */
export const DISCOVER_SOURCE_FILTERS = [
  { value: "", label: "All" },
  { value: "vendors", label: "Vendors" },
  { value: "directory", label: "Directory" },
  { value: "listings", label: "Listings" },
] as const;

export type DiscoverSourceFilter = (typeof DISCOVER_SOURCE_FILTERS)[number]["value"];

/** Listing type filter options per docs/17_GLOSSARY.md */
export const DISCOVER_TYPE_FILTERS: { value: "" | ListingType; label: string }[] = [
  { value: "", label: "All types" },
  { value: LISTING_TYPE.PRODUCT, label: "Products" },
  { value: LISTING_TYPE.SERVICE, label: "Services" },
  { value: LISTING_TYPE.RESOURCE, label: "Resources" },
  { value: LISTING_TYPE.EVENT, label: "Events" },
];

/** Common browse categories — vendors may add custom categories on listings. */
export const DISCOVER_CATEGORY_SUGGESTIONS = [
  "Urban gardening",
  "Self-care",
  "Preparedness",
  "Handmade goods",
  "Consulting",
  "Workshops & events",
] as const;

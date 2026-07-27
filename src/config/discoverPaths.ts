/** Public Discover routes (canonical). Legacy `/marketplace/*` redirects here. */
import { withDiscoverReturnTo } from "@/lib/discoverReturn";

export const DISCOVER_BASE = "/discover";

export type DiscoverVendorRef = string | { id: string; publicSlug?: string | null };

export type DiscoverListingRef = string | { id: string; publicSlug?: string | null };

export function discoverVendorPath(vendor: DiscoverVendorRef): string {
  if (typeof vendor === "string") {
    return `${DISCOVER_BASE}/vendors/${vendor}`;
  }
  const segment = vendor.publicSlug?.trim() || vendor.id;
  return `${DISCOVER_BASE}/vendors/${segment}`;
}

export function discoverListingPath(listing: DiscoverListingRef): string {
  if (typeof listing === "string") {
    return `${DISCOVER_BASE}/listings/${listing}`;
  }
  const segment = listing.publicSlug?.trim() || listing.id;
  return `${DISCOVER_BASE}/listings/${segment}`;
}

export function discoverDirectoryPath(directoryId: string) {
  return `${DISCOVER_BASE}/directory/${directoryId}`;
}

export function discoverBookPath(listing: DiscoverListingRef, variantId?: string | null) {
  const base = `${discoverListingPath(listing)}/book`;
  if (variantId) return `${base}?variant=${encodeURIComponent(variantId)}`;
  return base;
}

export function isDiscoverActive(pathname: string): boolean {
  return pathname === DISCOVER_BASE || pathname.startsWith(`${DISCOVER_BASE}/`);
}

export function discoverDetailHref(detailPath: string, resultsHref: string): string {
  return withDiscoverReturnTo(detailPath, resultsHref);
}

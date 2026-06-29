/** Public Discover routes (canonical). Legacy `/marketplace/*` redirects here. */
export const DISCOVER_BASE = "/discover";

export function discoverVendorPath(vendorId: string) {
  return `${DISCOVER_BASE}/vendors/${vendorId}`;
}

export function discoverListingPath(listingId: string) {
  return `${DISCOVER_BASE}/listings/${listingId}`;
}

export function discoverBookPath(listingId: string, variantId?: string | null) {
  const base = `${DISCOVER_BASE}/listings/${listingId}/book`;
  if (variantId) return `${base}?variant=${encodeURIComponent(variantId)}`;
  return base;
}

export function isDiscoverActive(pathname: string): boolean {
  return pathname === DISCOVER_BASE || pathname.startsWith(`${DISCOVER_BASE}/`);
}

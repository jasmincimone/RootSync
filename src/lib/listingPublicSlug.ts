/** Reserved path segments under /discover/listings — cannot be used as listing slugs. */
const RESERVED_LISTING_PUBLIC_SLUGS = new Set([
  "api",
  "book",
  "checkout",
  "claim-free",
  "directory",
  "discover",
  "listings",
  "marketplace",
  "members",
  "new",
  "search",
  "vendors",
]);

const LISTING_CUID_RE = /^c[a-z0-9]{20,}$/i;
const LISTING_SLUG_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function isListingCuidRef(ref: string): boolean {
  return LISTING_CUID_RE.test(ref.trim());
}

export function normalizeListingPublicSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateListingPublicSlug(
  raw: string,
): { ok: true; slug: string | null } | { ok: false; error: string } {
  if (raw.trim() === "") {
    return { ok: true, slug: null };
  }

  const slug = normalizeListingPublicSlug(raw);
  if (slug.length < 3) {
    return { ok: false, error: "Listing URL must be at least 3 characters." };
  }
  if (slug.length > 64) {
    return { ok: false, error: "Listing URL must be 64 characters or fewer." };
  }
  if (!LISTING_SLUG_RE.test(slug)) {
    return {
      ok: false,
      error: "Use lowercase letters, numbers, and hyphens. Start with a letter.",
    };
  }
  if (RESERVED_LISTING_PUBLIC_SLUGS.has(slug)) {
    return { ok: false, error: "That listing URL is reserved. Choose another." };
  }
  if (isListingCuidRef(slug)) {
    return { ok: false, error: "That listing URL looks like a system id. Choose a readable name." };
  }

  return { ok: true, slug };
}

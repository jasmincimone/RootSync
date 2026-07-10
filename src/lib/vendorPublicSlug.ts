/** Reserved path segments under /discover/vendors — cannot be used as vendor slugs. */
const RESERVED_VENDOR_PUBLIC_SLUGS = new Set([
  "api",
  "directory",
  "discover",
  "listings",
  "marketplace",
  "members",
  "new",
  "search",
  "vendors",
]);

const VENDOR_CUID_RE = /^c[a-z0-9]{20,}$/i;
const VENDOR_SLUG_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function isVendorCuidRef(ref: string): boolean {
  return VENDOR_CUID_RE.test(ref.trim());
}

export function normalizeVendorPublicSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function validateVendorPublicSlug(
  raw: string,
): { ok: true; slug: string | null } | { ok: false; error: string } {
  if (raw.trim() === "") {
    return { ok: true, slug: null };
  }

  const slug = normalizeVendorPublicSlug(raw);
  if (slug.length < 3) {
    return { ok: false, error: "Profile URL must be at least 3 characters." };
  }
  if (slug.length > 48) {
    return { ok: false, error: "Profile URL must be 48 characters or fewer." };
  }
  if (!VENDOR_SLUG_RE.test(slug)) {
    return {
      ok: false,
      error: "Use lowercase letters, numbers, and hyphens. Start with a letter.",
    };
  }
  if (RESERVED_VENDOR_PUBLIC_SLUGS.has(slug)) {
    return { ok: false, error: "That profile URL is reserved. Choose another." };
  }
  if (isVendorCuidRef(slug)) {
    return { ok: false, error: "That profile URL looks like a system id. Choose a readable name." };
  }

  return { ok: true, slug };
}

/** Public growth URLs: rootsync.io/{vendorSlug}/funnels/{funnelSlug} (campaigns later). */

const RESERVED_GROWTH_PUBLIC_SLUGS = new Set([
  "api",
  "edit",
  "new",
  "preview",
]);

const GROWTH_CUID_RE = /^c[a-z0-9]{20,}$/i;
const GROWTH_SLUG_RE = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export function normalizeGrowthPublicSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function suggestGrowthPublicSlug(name: string): string {
  return normalizeGrowthPublicSlug(name).slice(0, 48) || "funnel";
}

export function validateGrowthPublicSlug(
  raw: string,
): { ok: true; slug: string | null } | { ok: false; error: string } {
  if (raw.trim() === "") {
    return { ok: true, slug: null };
  }

  const slug = normalizeGrowthPublicSlug(raw);
  if (slug.length < 3) {
    return { ok: false, error: "Funnel URL must be at least 3 characters." };
  }
  if (slug.length > 64) {
    return { ok: false, error: "Funnel URL must be 64 characters or fewer." };
  }
  if (!GROWTH_SLUG_RE.test(slug)) {
    return {
      ok: false,
      error: "Use lowercase letters, numbers, and hyphens. Start with a letter.",
    };
  }
  if (RESERVED_GROWTH_PUBLIC_SLUGS.has(slug)) {
    return { ok: false, error: "That funnel URL is reserved. Choose another." };
  }
  if (GROWTH_CUID_RE.test(slug)) {
    return { ok: false, error: "That funnel URL looks like a system id. Choose a readable name." };
  }

  return { ok: true, slug };
}

export function resolveGrowthPublicSlug(
  raw: string,
  fallbackName: string,
): { ok: true; slug: string } | { ok: false; error: string } {
  const parsed = validateGrowthPublicSlug(raw);
  if (!parsed.ok) return parsed;
  const slug = parsed.slug ?? suggestGrowthPublicSlug(fallbackName);
  const confirmed = validateGrowthPublicSlug(slug);
  if (!confirmed.ok || !confirmed.slug) {
    return { ok: false, error: "Choose a funnel URL with at least 3 letters." };
  }
  return { ok: true, slug: confirmed.slug };
}

export function vendorFunnelPublicPath(vendorSlug: string, funnelSlug: string): string {
  return `/${vendorSlug}/funnels/${funnelSlug}`;
}

export function vendorCampaignPublicPath(vendorSlug: string, campaignSlug: string): string {
  return `/${vendorSlug}/campaigns/${campaignSlug}`;
}

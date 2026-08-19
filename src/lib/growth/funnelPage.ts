import { sanitizePulsePostHtml } from "@/lib/pulsePostHtml";
import { sanitizePulsePostMediaInput } from "@/lib/pulsePostMedia";
import type { PulsePostMediaItem } from "@/config/pulsePostMedia";

export const FUNNEL_PAGE_FONTS = [
  { label: "Sans", value: "Inter, ui-sans-serif, system-ui, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Handwriting", value: "var(--font-caveat), cursive" },
  { label: "Mono", value: "'Courier New', ui-monospace, monospace" },
] as const;

/** RootSync design-system colors plus cream/white for page backgrounds. */
export const FUNNEL_PAGE_COLORS = [
  { label: "Cream", value: "#F8F4EE" },
  { label: "White", value: "#FFFFFF" },
  { label: "Forest", value: "#044730" },
  { label: "Sage", value: "#7A8B63" },
  { label: "Terracotta", value: "#B55A30" },
  { label: "Gold", value: "#B8895F" },
  { label: "Espresso", value: "#342a0f" },
] as const;

export const FUNNEL_SECTION_KINDS = ["hero", "body", "cta", "band"] as const;
export type FunnelSectionKind = (typeof FUNNEL_SECTION_KINDS)[number];

export const FUNNEL_SECTION_SHAPES = ["none", "rounded", "pill", "split"] as const;
export type FunnelSectionShape = (typeof FUNNEL_SECTION_SHAPES)[number];

export type FunnelPageSection = {
  id: string;
  kind: FunnelSectionKind;
  html: string;
  background?: string;
  shape?: FunnelSectionShape;
  media: PulsePostMediaItem[];
};

export type FunnelPageTheme = {
  background: string;
  textColor: string;
  fontFamily: string;
  accent: string;
};

export type FunnelPageContent = {
  version: 1;
  theme: FunnelPageTheme;
  sections: FunnelPageSection[];
  ctaHref: string;
  media: PulsePostMediaItem[];
};

export const DEFAULT_FUNNEL_THEME: FunnelPageTheme = {
  background: "#F8F4EE",
  textColor: "#342a0f",
  fontFamily: FUNNEL_PAGE_FONTS[0].value,
  accent: "#044730",
};

export const PAGE_MEDIA_ID = "page";
export const MAX_FUNNEL_PAGE_MEDIA = 12;

export type FunnelMediaBucketId = typeof PAGE_MEDIA_ID | string;

function newSectionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{6})$/.test(value);
}

function allowedFont(value: string): string {
  return FUNNEL_PAGE_FONTS.some((font) => font.value === value)
    ? value
    : DEFAULT_FUNNEL_THEME.fontFamily;
}

function allowedShape(value: unknown): FunnelSectionShape {
  return FUNNEL_SECTION_SHAPES.includes(value as FunnelSectionShape)
    ? (value as FunnelSectionShape)
    : "none";
}

function allowedKind(value: unknown): FunnelSectionKind {
  return FUNNEL_SECTION_KINDS.includes(value as FunnelSectionKind)
    ? (value as FunnelSectionKind)
    : "body";
}

export function createDefaultFunnelPage(args?: {
  name?: string;
  objective?: string | null;
  description?: string | null;
}): FunnelPageContent {
  const name = args?.name?.trim() || "Your funnel";
  const objective = args?.objective?.trim();
  const description = args?.description?.trim();
  return {
    version: 1,
    theme: { ...DEFAULT_FUNNEL_THEME },
    ctaHref: "",
    media: [],
    sections: [
      {
        id: newSectionId(),
        kind: "hero",
        html: `<h1>${escapeText(name)}</h1>${objective ? `<p>${escapeText(objective)}</p>` : "<p>Tell people why this matters.</p>"}`,
        shape: "none",
        media: [],
      },
      {
        id: newSectionId(),
        kind: "body",
        html: description ? `<p>${escapeText(description)}</p>` : "<p>Add photos, video, files, and links — same tools as a Pulse post.</p>",
        shape: "none",
        media: [],
      },
      {
        id: newSectionId(),
        kind: "cta",
        html: "",
        shape: "rounded",
        background: "#FFFFFF",
        media: [],
      },
    ],
  };
}

export function createFunnelSection(kind: FunnelSectionKind): FunnelPageSection {
  if (kind === "hero") {
    return { id: newSectionId(), kind, html: "<h1>Headline</h1><p>A short invitation.</p>", shape: "none", media: [] };
  }
  if (kind === "cta") {
    return {
      id: newSectionId(),
      kind,
      html: "",
      shape: "rounded",
      background: "#FFFFFF",
      media: [],
    };
  }
  if (kind === "band") {
    return {
      id: newSectionId(),
      kind,
      html: "<p>A colored band, rounded panel, or split block.</p>",
      background: "#044730",
      shape: "rounded",
      media: [],
    };
  }
  return { id: newSectionId(), kind: "body", html: "<p></p>", shape: "none", media: [] };
}

export function parseFunnelPageContent(
  raw: unknown,
  fallback?: { name?: string; objective?: string | null; description?: string | null },
): FunnelPageContent {
  const defaults = createDefaultFunnelPage(fallback);
  if (!raw || typeof raw !== "object") return defaults;
  const row = raw as Record<string, unknown>;
  const themeRaw = row.theme && typeof row.theme === "object" ? (row.theme as Record<string, unknown>) : {};
  const sectionsRaw = Array.isArray(row.sections) ? row.sections : [];
  const sections = sectionsRaw
    .filter((section): section is Record<string, unknown> => !!section && typeof section === "object")
    .map((section, index) => ({
      id: typeof section.id === "string" && section.id ? section.id : `section-${index}`,
      kind: allowedKind(section.kind),
      html: sanitizePulsePostHtml(typeof section.html === "string" ? section.html : ""),
      background:
        typeof section.background === "string" && isHexColor(section.background)
          ? section.background
          : undefined,
      shape: allowedShape(section.shape),
      media: sanitizePulsePostMediaInput(section.media, MAX_FUNNEL_PAGE_MEDIA),
    }));

  return {
    version: 1,
    ctaHref: typeof row.ctaHref === "string" ? row.ctaHref.trim() : "",
    media: sanitizePulsePostMediaInput(row.media, MAX_FUNNEL_PAGE_MEDIA),
    theme: {
      background:
        typeof themeRaw.background === "string" && isHexColor(themeRaw.background)
          ? themeRaw.background
          : defaults.theme.background,
      textColor:
        typeof themeRaw.textColor === "string" && isHexColor(themeRaw.textColor)
          ? themeRaw.textColor
          : defaults.theme.textColor,
      fontFamily: typeof themeRaw.fontFamily === "string" ? allowedFont(themeRaw.fontFamily) : defaults.theme.fontFamily,
      accent:
        typeof themeRaw.accent === "string" && isHexColor(themeRaw.accent)
          ? themeRaw.accent
          : defaults.theme.accent,
    },
    sections: sections.length ? sections : defaults.sections,
  };
}

export function serializeFunnelPageContent(page: FunnelPageContent): FunnelPageContent {
  return trimFunnelMedia(parseFunnelPageContent(page));
}

export function funnelSectionLabel(kind: FunnelSectionKind, index: number): string {
  if (kind === "cta") return `Button ${index + 1}`;
  if (kind === "band") return `Shape ${index + 1}`;
  if (kind === "hero") return `Hero ${index + 1}`;
  return `Body ${index + 1}`;
}

export function funnelMediaLocationLabel(page: FunnelPageContent, bucketId: FunnelMediaBucketId): string {
  if (bucketId === PAGE_MEDIA_ID) return "Top of page";
  const index = page.sections.findIndex((section) => section.id === bucketId);
  if (index < 0) return "Section";
  return funnelSectionLabel(page.sections[index].kind, index);
}

function bucketOrder(page: FunnelPageContent): FunnelMediaBucketId[] {
  return [PAGE_MEDIA_ID, ...page.sections.map((section) => section.id)];
}

function getMediaBucket(page: FunnelPageContent, bucketId: FunnelMediaBucketId): PulsePostMediaItem[] {
  if (bucketId === PAGE_MEDIA_ID) return [...(page.media ?? [])];
  return [...(page.sections.find((section) => section.id === bucketId)?.media ?? [])];
}

function setMediaBucket(
  page: FunnelPageContent,
  bucketId: FunnelMediaBucketId,
  items: PulsePostMediaItem[],
): FunnelPageContent {
  if (bucketId === PAGE_MEDIA_ID) return { ...page, media: items };
  return {
    ...page,
    sections: page.sections.map((section) =>
      section.id === bucketId ? { ...section, media: items } : section,
    ),
  };
}

export function countFunnelMedia(page: FunnelPageContent): number {
  return listFunnelMedia(page).length;
}

export function listFunnelMedia(page: FunnelPageContent): Array<{
  item: PulsePostMediaItem;
  bucketId: FunnelMediaBucketId;
  index: number;
  locationLabel: string;
}> {
  const rows: Array<{
    item: PulsePostMediaItem;
    bucketId: FunnelMediaBucketId;
    index: number;
    locationLabel: string;
  }> = [];
  for (const bucketId of bucketOrder(page)) {
    const items = getMediaBucket(page, bucketId);
    items.forEach((item, index) => {
      rows.push({
        item,
        bucketId,
        index,
        locationLabel: funnelMediaLocationLabel(page, bucketId),
      });
    });
  }
  return rows;
}

export function addFunnelMedia(
  page: FunnelPageContent,
  item: PulsePostMediaItem,
  bucketId: FunnelMediaBucketId = PAGE_MEDIA_ID,
): FunnelPageContent {
  if (countFunnelMedia(page) >= MAX_FUNNEL_PAGE_MEDIA) return page;
  return setMediaBucket(page, bucketId, [...getMediaBucket(page, bucketId), item]);
}

export function removeFunnelMedia(
  page: FunnelPageContent,
  bucketId: FunnelMediaBucketId,
  index: number,
): FunnelPageContent {
  return setMediaBucket(
    page,
    bucketId,
    getMediaBucket(page, bucketId).filter((_, itemIndex) => itemIndex !== index),
  );
}

export function canMoveFunnelMedia(
  page: FunnelPageContent,
  bucketId: FunnelMediaBucketId,
  index: number,
  direction: -1 | 1,
): boolean {
  const items = getMediaBucket(page, bucketId);
  if (index < 0 || index >= items.length) return false;
  const nextIndex = index + direction;
  if (nextIndex >= 0 && nextIndex < items.length) return true;
  const buckets = bucketOrder(page);
  const bucketIndex = buckets.indexOf(bucketId);
  return Boolean(buckets[bucketIndex + direction]);
}

/** Move one file within its section, or into the previous/next section. */
export function moveFunnelMedia(
  page: FunnelPageContent,
  bucketId: FunnelMediaBucketId,
  index: number,
  direction: -1 | 1,
): FunnelPageContent {
  const items = getMediaBucket(page, bucketId);
  if (index < 0 || index >= items.length) return page;

  const nextIndex = index + direction;
  if (nextIndex >= 0 && nextIndex < items.length) {
    const reordered = [...items];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, removed);
    return setMediaBucket(page, bucketId, reordered);
  }

  const buckets = bucketOrder(page);
  const bucketIndex = buckets.indexOf(bucketId);
  const targetId = buckets[bucketIndex + direction];
  if (!targetId) return page;

  const item = items[index];
  const without = items.filter((_, itemIndex) => itemIndex !== index);
  const targetItems = getMediaBucket(page, targetId);
  const inserted = direction === 1 ? [item, ...targetItems] : [...targetItems, item];
  return setMediaBucket(setMediaBucket(page, bucketId, without), targetId, inserted);
}

export function absorbSectionMedia(page: FunnelPageContent, sectionId: string): FunnelPageContent {
  const index = page.sections.findIndex((section) => section.id === sectionId);
  if (index < 0) return page;
  const moving = page.sections[index].media ?? [];
  const targetId = index === 0 ? PAGE_MEDIA_ID : page.sections[index - 1].id;
  const withoutSection = {
    ...page,
    sections: page.sections.filter((section) => section.id !== sectionId),
  };
  if (moving.length === 0) return withoutSection;
  return setMediaBucket(withoutSection, targetId, [...getMediaBucket(withoutSection, targetId), ...moving]);
}

function trimFunnelMedia(page: FunnelPageContent): FunnelPageContent {
  let remaining = MAX_FUNNEL_PAGE_MEDIA;
  const media = (page.media ?? []).slice(0, remaining);
  remaining -= media.length;
  const sections = page.sections.map((section) => {
    const items = (section.media ?? []).slice(0, Math.max(0, remaining));
    remaining -= items.length;
    return { ...section, media: items };
  });
  return { ...page, media, sections };
}

export function isLightColor(hex: string): boolean {
  const value = hex.replace("#", "");
  if (value.length !== 6) return true;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

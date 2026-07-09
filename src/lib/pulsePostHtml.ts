import sanitizeHtml from "sanitize-html";

import {
  MAX_PULSE_POST_MEDIA,
  type PulsePostMediaItem,
  newPulsePostMediaItem,
} from "@/config/pulsePostMedia";

const MAX_HTML_LENGTH = 48_000;

const FONT_FAMILIES = new Set([
  "Inter, sans-serif",
  "Georgia, serif",
  "var(--font-caveat), cursive",
  "'Courier New', monospace",
]);

const ALLOWED_STYLE_PROPS = new Set([
  "color",
  "background-color",
  "font-size",
  "font-family",
  "text-align",
  "margin-left",
  "margin-right",
]);

const MEDIA_STYLE_PROPS = new Set([
  ...ALLOWED_STYLE_PROPS,
  "width",
  "max-width",
  "height",
  "max-height",
  "object-fit",
  "background",
]);

function sanitizeMediaStyleValue(prop: string, value: string): string | null {
  if (prop === "width" || prop === "max-width") {
    if (/^(\d{1,3})%$/.test(value)) {
      const n = Number(value.slice(0, -1));
      if (n >= 1 && n <= 100) return value;
    }
    if (/^(\d{1,4})px$/.test(value)) return value;
    return null;
  }
  if (prop === "height" || prop === "max-height") {
    if (value === "auto") return value;
    if (/^(\d{1,4})px$/.test(value)) return value;
    if (/^min\([^)]+\)$/.test(value)) return value;
    return null;
  }
  if (prop === "object-fit" && (value === "cover" || value === "contain")) return value;
  if (prop === "background" && /^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  if (prop === "margin-left" || prop === "margin-right") {
    if (value === "auto") return value;
    if (/^\d{1,3}px$/.test(value)) return value;
  }
  return null;
}

function sanitizeInlineStyle(style: string, media = false): string {
  const allowed = media ? MEDIA_STYLE_PROPS : ALLOWED_STYLE_PROPS;
  const parts = style
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const kept: string[] = [];
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const prop = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (!allowed.has(prop) || !value) continue;
    if (!media) {
      if (prop === "font-family" && !FONT_FAMILIES.has(value)) continue;
      if (prop === "font-size" && !/^\d{1,3}px$/.test(value)) continue;
      if (prop === "color" || prop === "background-color") {
        if (!/^#[0-9a-fA-F]{3,8}$/.test(value) && !/^rgb(a)?\([^)]+\)$/.test(value)) continue;
      }
      if (prop === "text-align" && !["left", "center", "right", "justify"].includes(value)) continue;
      if ((prop === "margin-left" || prop === "margin-right") && !/^\d{1,3}px$/.test(value) && value !== "auto")
        continue;
    } else {
      const mediaValue = sanitizeMediaStyleValue(prop, value);
      if (!mediaValue) continue;
      kept.push(`${prop}: ${mediaValue}`);
      continue;
    }
    kept.push(`${prop}: ${value}`);
  }
  return kept.join("; ");
}

export const pulsePostSanitizeOptions: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "div",
    "span",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "strike",
    "sub",
    "sup",
    "h1",
    "h2",
    "h3",
    "h4",
    "blockquote",
    "figure",
    "figcaption",
    "img",
    "video",
    "a",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "class", "data-pulse-file"],
    img: ["src", "alt", "class", "style"],
    video: ["src", "controls", "playsinline", "class", "style"],
    figure: ["class", "style"],
    figcaption: ["class"],
    p: ["style", "class"],
    div: ["style", "class"],
    span: ["style", "class"],
    h1: ["style", "class"],
    h2: ["style", "class"],
    h3: ["style", "class"],
    h4: ["style", "class"],
    blockquote: ["style", "class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https"],
    video: ["http", "https"],
  },
  transformTags: {
    "*": (tagName, attribs) => {
      const isMediaTag = tagName === "img" || tagName === "video" || tagName === "figure";
      if (attribs.style) {
        const clean = sanitizeInlineStyle(attribs.style, isMediaTag);
        if (clean) attribs.style = clean;
        else delete attribs.style;
      }
      if (tagName === "a") {
        attribs.target = "_blank";
        attribs.rel = "noopener noreferrer";
      }
      if (attribs.class?.includes("pulse-embed-selected")) {
        attribs.class = attribs.class.replace(/\bpulse-embed-selected\b/g, "").trim();
        if (!attribs.class) delete attribs.class;
      }
      return { tagName, attribs };
    },
  },
};

export function sanitizePulsePostHtml(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const cleaned = sanitizeHtml(trimmed, pulsePostSanitizeOptions).trim();
  if (cleaned.length > MAX_HTML_LENGTH) {
    return cleaned.slice(0, MAX_HTML_LENGTH);
  }
  return cleaned;
}

export function isPulseHtmlContent(content: string): boolean {
  return /<[a-z][\s\S]*>/i.test(content);
}

export function pulsePostPlainText(html: string): string {
  return sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();
}

export function pulsePostHasVisibleContent(html: string): boolean {
  const text = pulsePostPlainText(html);
  if (text.length > 0) return true;
  return /<img[\s>]|<video[\s>]|data-pulse-file/i.test(html);
}

function isAllowedMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith("/uploads/pulse-posts/")) return true;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return true;
  return false;
}

/** Extract attachment metadata from editor HTML for mediaJson column. */
export function extractPulseMediaFromHtml(html: string): PulsePostMediaItem[] {
  const items: PulsePostMediaItem[] = [];

  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1];
    if (!isAllowedMediaUrl(url)) continue;
    items.push(newPulsePostMediaItem({ type: "image", url }));
    if (items.length >= MAX_PULSE_POST_MEDIA) return items;
  }

  const videoRegex = /<video[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = videoRegex.exec(html)) !== null) {
    const url = match[1];
    if (!isAllowedMediaUrl(url)) continue;
    items.push(newPulsePostMediaItem({ type: "video", url }));
    if (items.length >= MAX_PULSE_POST_MEDIA) return items;
  }

  const fileRegex =
    /<a[^>]+class=["'][^"']*pulse-embed-file[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi;
  while ((match = fileRegex.exec(html)) !== null) {
    const url = match[1];
    const label = match[2]?.trim() || "File";
    if (!isAllowedMediaUrl(url)) continue;
    items.push(newPulsePostMediaItem({ type: "file", url, fileName: label, label }));
    if (items.length >= MAX_PULSE_POST_MEDIA) return items;
  }

  return items;
}

export function plainTextToPulseHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<p>${escaped.replace(/\n/g, "<br />")}</p>`;
}

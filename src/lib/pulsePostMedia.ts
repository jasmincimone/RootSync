import {
  MAX_PULSE_POST_MEDIA,
  type PulsePostMediaItem,
  isPulsePostMediaItem,
} from "@/config/pulsePostMedia";

export function parsePulsePostMediaJson(raw: unknown): PulsePostMediaItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isPulsePostMediaItem).slice(0, MAX_PULSE_POST_MEDIA);
}

function isAllowedMediaUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/uploads/pulse-posts/")) return true;
  if (trimmed.startsWith("https://") || trimmed.startsWith("http://")) return true;
  return false;
}

export function sanitizePulsePostMediaInput(raw: unknown): PulsePostMediaItem[] {
  if (!Array.isArray(raw)) return [];
  const out: PulsePostMediaItem[] = [];
  for (const item of raw) {
    if (!isPulsePostMediaItem(item)) continue;
    const url = item.url.trim();
    if (!isAllowedMediaUrl(url)) continue;
    out.push({
      id: item.id.trim() || crypto.randomUUID(),
      type: item.type,
      url,
      ...(item.fileName?.trim() ? { fileName: item.fileName.trim() } : {}),
      ...(item.label?.trim() ? { label: item.label.trim() } : {}),
    });
    if (out.length >= MAX_PULSE_POST_MEDIA) break;
  }
  return out;
}

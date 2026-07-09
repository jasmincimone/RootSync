export type PulsePostMediaItem = {
  id: string;
  type: "image" | "video" | "file";
  url: string;
  fileName?: string;
  label?: string;
};

export const MAX_PULSE_POST_MEDIA = 6;

export function isPulsePostMediaItem(x: unknown): x is PulsePostMediaItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    (o.type === "image" || o.type === "video" || o.type === "file") &&
    typeof o.url === "string" &&
    o.url.trim().length > 0 &&
    (o.fileName === undefined || typeof o.fileName === "string") &&
    (o.label === undefined || typeof o.label === "string")
  );
}

export function newPulsePostMediaItem(
  partial: Pick<PulsePostMediaItem, "type" | "url"> &
    Partial<Pick<PulsePostMediaItem, "fileName" | "label">>,
): PulsePostMediaItem {
  return {
    id: crypto.randomUUID(),
    type: partial.type,
    url: partial.url.trim(),
    ...(partial.fileName?.trim() ? { fileName: partial.fileName.trim() } : {}),
    ...(partial.label?.trim() ? { label: partial.label.trim() } : {}),
  };
}

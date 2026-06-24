export type ShopMediaCarouselItem = {
  id: string;
  type: "image" | "video";
  url: string;
  alt?: string;
  caption?: string;
};

export function isShopMediaCarouselItem(x: unknown): x is ShopMediaCarouselItem {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    (o.type === "image" || o.type === "video") &&
    typeof o.url === "string" &&
    o.url.trim().length > 0 &&
    (o.alt === undefined || typeof o.alt === "string") &&
    (o.caption === undefined || typeof o.caption === "string")
  );
}

export function parseMediaCarouselJson(raw: unknown): ShopMediaCarouselItem[] | null {
  if (!Array.isArray(raw) || !raw.every(isShopMediaCarouselItem)) return null;
  return raw;
}

export function newCarouselItem(
  partial: Pick<ShopMediaCarouselItem, "type" | "url"> &
    Partial<Pick<ShopMediaCarouselItem, "alt" | "caption">>,
): ShopMediaCarouselItem {
  return {
    id: crypto.randomUUID(),
    type: partial.type,
    url: partial.url.trim(),
    ...(partial.alt?.trim() ? { alt: partial.alt.trim() } : {}),
    ...(partial.caption?.trim() ? { caption: partial.caption.trim() } : {}),
  };
}

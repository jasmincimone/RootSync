import {
  getShop,
  type ShopCategory,
  type ShopLandingContent,
  type ShopProduct,
  type ShopSlug,
} from "@/config/shops";
import type { ShopFeatureCard } from "@/config/shopFeatures";
import {
  parseMediaCarouselJson,
  type ShopMediaCarouselItem,
} from "@/config/shopMediaCarousel";
import { LISTING_STATUS } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

/** How many newest published listings to show as featured on each shop landing page. */
export const SHOP_LANDING_FEATURED_LIMIT = 6;

function isShopCategory(x: unknown): x is ShopCategory {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.description === "string"
  );
}

function parseCategoriesJson(raw: unknown): ShopCategory[] | null {
  if (!Array.isArray(raw) || !raw.every(isShopCategory)) return null;
  return raw;
}

function isFeatureCard(x: unknown): x is ShopFeatureCard {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.title === "string" &&
    typeof o.description === "string" &&
    typeof o.href === "string" &&
    typeof o.cta === "string"
  );
}

function parseFeatureSectionsJson(raw: unknown): ShopFeatureCard[] | null {
  if (!Array.isArray(raw) || !raw.every(isFeatureCard)) return null;
  return raw;
}

export type MergedShopPageDisplay = {
  shopSlug: ShopSlug;
  name: string;
  tagline: string;
  description: string;
  content: ShopLandingContent;
  features: ShopFeatureCard[];
  mediaCarousel: ShopMediaCarouselItem[];
};

async function loadRecentFeaturedForShop(shopSlug: string): Promise<ShopProduct[]> {
  const rows = await prisma.shopCatalogListing.findMany({
    where: { shopSlug, status: LISTING_STATUS.PUBLISHED },
    orderBy: { createdAt: "desc" },
    take: SHOP_LANDING_FEATURED_LIMIT,
    select: { id: true, name: true, summary: true, badge: true },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    summary: r.summary,
    badge: r.badge?.trim() || undefined,
  }));
}

export async function loadMergedShopDisplay(slug: string): Promise<MergedShopPageDisplay | null> {
  const shop = getShop(slug);
  if (!shop) return null;

  const shopKey = shop.slug as ShopSlug;

  const [row, featured] = await Promise.all([
    prisma.shopPage.findUnique({ where: { shopSlug: shop.slug } }),
    loadRecentFeaturedForShop(shop.slug),
  ]);

  const categories = parseCategoriesJson(row?.categoriesJson) ?? [];
  const content: ShopLandingContent = { categories, featured };

  const features = parseFeatureSectionsJson(row?.featureSectionsJson) ?? [];
  const mediaCarousel = parseMediaCarouselJson(row?.mediaCarouselJson) ?? [];

  return {
    shopSlug: shopKey,
    name: row?.name?.trim() || shop.name,
    tagline: row?.tagline?.trim() || shop.tagline,
    description: row?.description?.trim() || shop.description,
    content,
    features,
    mediaCarousel,
  };
}

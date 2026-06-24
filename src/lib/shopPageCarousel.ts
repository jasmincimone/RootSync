import { Prisma } from "@prisma/client";

import {
  parseMediaCarouselJson,
  type ShopMediaCarouselItem,
} from "@/config/shopMediaCarousel";
import { prisma } from "@/lib/prisma";

export async function loadShopCarousel(slug: string): Promise<ShopMediaCarouselItem[]> {
  const row = await prisma.shopPage.findUnique({
    where: { shopSlug: slug },
    select: { mediaCarouselJson: true },
  });
  return parseMediaCarouselJson(row?.mediaCarouselJson) ?? [];
}

export async function saveShopCarousel(
  slug: string,
  items: ShopMediaCarouselItem[],
): Promise<void> {
  const isEmpty = items.length === 0;

  if (isEmpty) {
    const row = await prisma.shopPage.findUnique({ where: { shopSlug: slug } });
    if (!row) return;
    const hasOtherContent =
      !!row.name?.trim() ||
      !!row.tagline?.trim() ||
      !!row.description?.trim() ||
      row.categoriesJson != null ||
      row.featureSectionsJson != null;
    if (hasOtherContent) {
      await prisma.shopPage.update({
        where: { shopSlug: slug },
        data: { mediaCarouselJson: Prisma.DbNull },
      });
      return;
    }
    await prisma.shopPage.deleteMany({ where: { shopSlug: slug } });
    return;
  }

  await prisma.shopPage.upsert({
    where: { shopSlug: slug },
    create: {
      shopSlug: slug,
      mediaCarouselJson: items as Prisma.InputJsonValue,
    },
    update: {
      mediaCarouselJson: items as Prisma.InputJsonValue,
    },
  });
}

export function validateCarouselItems(raw: unknown): ShopMediaCarouselItem[] | null {
  return parseMediaCarouselJson(raw);
}

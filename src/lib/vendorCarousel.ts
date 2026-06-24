import { Prisma } from "@prisma/client";

import {
  parseMediaCarouselJson,
  type ShopMediaCarouselItem,
} from "@/config/shopMediaCarousel";
import { prisma } from "@/lib/prisma";

export async function loadVendorCarousel(vendorProfileId: string): Promise<ShopMediaCarouselItem[]> {
  const row = await prisma.vendorProfile.findUnique({
    where: { id: vendorProfileId },
    select: { mediaCarouselJson: true },
  });
  return parseMediaCarouselJson(row?.mediaCarouselJson) ?? [];
}

export async function saveVendorCarousel(
  vendorProfileId: string,
  items: ShopMediaCarouselItem[],
): Promise<void> {
  await prisma.vendorProfile.update({
    where: { id: vendorProfileId },
    data: {
      mediaCarouselJson:
        items.length === 0 ? Prisma.DbNull : (items as Prisma.InputJsonValue),
    },
  });
}

export function validateCarouselItems(raw: unknown): ShopMediaCarouselItem[] | null {
  return parseMediaCarouselJson(raw);
}

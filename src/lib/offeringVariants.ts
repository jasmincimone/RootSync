import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { LISTING_TYPE, type ListingType } from "@/lib/roles";

export type OfferingVariantInput = {
  title: string;
  priceCents: number;
  /** Configurable units in this deal (default 1). */
  unitsIncluded?: number;
  durationMinutes?: number | null;
  sku?: string | null;
  inventoryQuantity?: number | null;
  sortOrder: number;
};

export type SerializedOfferingVariant = {
  id: string;
  sortOrder: number;
  title: string;
  priceCents: number;
  unitsIncluded: number;
  durationMinutes: number | null;
  sku: string | null;
  inventoryQuantity: number | null;
};

function parseOptionalInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number.parseInt(value, 10);
    if (!Number.isNaN(n) && n >= 0) return n;
  }
  throw new Error("Invalid number");
}

export function parseOfferingVariantsFromBody(
  body: Record<string, unknown>,
  listingType: ListingType,
): OfferingVariantInput[] | undefined {
  if (!("variants" in body)) return undefined;
  const raw = body.variants;
  if (!Array.isArray(raw)) {
    throw new Error("variants must be an array.");
  }
  if (raw.length === 0) return [];

  const variants: OfferingVariantInput[] = [];
  raw.forEach((row, index) => {
    if (!row || typeof row !== "object") return;
    const item = row as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title.trim() : "";
    if (!title) {
      throw new Error(`Variant ${index + 1} needs a title.`);
    }

    let priceCents: number;
    if (typeof item.priceCents === "number" && item.priceCents >= 0) {
      priceCents = Math.round(item.priceCents);
    } else if (typeof item.priceDollars === "string" || typeof item.priceDollars === "number") {
      const dollars =
        typeof item.priceDollars === "number"
          ? item.priceDollars
          : Number.parseFloat(item.priceDollars);
      if (!Number.isFinite(dollars) || dollars < 0) {
        throw new Error(`Variant "${title}" needs a valid price.`);
      }
      priceCents = Math.round(dollars * 100);
    } else {
      throw new Error(`Variant "${title}" needs a price.`);
    }

    const durationMinutes = parseOptionalInt(item.durationMinutes);
    if (listingType === LISTING_TYPE.SERVICE) {
      if (durationMinutes === null || durationMinutes === undefined || durationMinutes <= 0) {
        throw new Error(`Service variant "${title}" needs duration in minutes.`);
      }
      if (durationMinutes !== 1 && durationMinutes % 15 !== 0) {
        throw new Error(
          `Service variant "${title}": use 15-minute increments (e.g. 30, 60, 90). Got ${durationMinutes}.`,
        );
      }
    }

    const sku =
      typeof item.sku === "string" ? item.sku.trim() || null : item.sku === null ? null : undefined;
    const inventoryQuantity =
      "inventoryQuantity" in item ? parseOptionalInt(item.inventoryQuantity) ?? null : null;

    let unitsIncluded = 1;
    if ("unitsIncluded" in item) {
      const parsed = parseOptionalInt(item.unitsIncluded);
      if (parsed === undefined || parsed === null || parsed < 1 || parsed > 50) {
        throw new Error(`Deal “${title}” needs units included between 1 and 50.`);
      }
      unitsIncluded = parsed;
    }

    variants.push({
      title,
      priceCents,
      unitsIncluded,
      durationMinutes: durationMinutes ?? null,
      sku: sku ?? null,
      inventoryQuantity,
      sortOrder:
        typeof item.sortOrder === "number" && Number.isInteger(item.sortOrder)
          ? item.sortOrder
          : index,
    });
  });

  return variants;
}

export function serializeOfferingVariants(
  variants: Array<{
    id: string;
    sortOrder: number;
    title: string;
    priceCents: number;
    unitsIncluded?: number;
    durationMinutes: number | null;
    sku: string | null;
    inventoryQuantity: number | null;
  }>,
): SerializedOfferingVariant[] {
  return variants.map((v) => ({
    id: v.id,
    sortOrder: v.sortOrder,
    title: v.title,
    priceCents: v.priceCents,
    unitsIncluded: Math.max(1, v.unitsIncluded ?? 1),
    durationMinutes: v.durationMinutes,
    sku: v.sku,
    inventoryQuantity: v.inventoryQuantity,
  }));
}

export function minVariantPriceCents(variants: Array<{ priceCents: number }>): number | null {
  if (variants.length === 0) return null;
  return Math.min(...variants.map((v) => v.priceCents));
}

export function listingPriceLabel(priceCents: number, variantCount: number): string {
  if (variantCount > 1) return `From $${(priceCents / 100).toFixed(2)}`;
  return `$${(priceCents / 100).toFixed(2)}`;
}

export async function syncOfferingVariants(
  tx: Prisma.TransactionClient,
  offeringId: string,
  variants: OfferingVariantInput[] | undefined,
): Promise<number | null> {
  if (variants === undefined) return null;

  await tx.offeringVariant.deleteMany({ where: { offeringId } });

  if (variants.length === 0) return null;

  await tx.offeringVariant.createMany({
    data: variants.map((v) => ({
      offeringId,
      sortOrder: v.sortOrder,
      title: v.title,
      priceCents: v.priceCents,
      unitsIncluded: Math.max(1, v.unitsIncluded ?? 1),
      durationMinutes: v.durationMinutes ?? null,
      sku: v.sku ?? null,
      inventoryQuantity: v.inventoryQuantity ?? null,
    })),
  });

  return minVariantPriceCents(variants);
}

export async function deleteOfferingVariants(
  tx: Prisma.TransactionClient,
  offeringId: string,
) {
  await tx.offeringVariant.deleteMany({ where: { offeringId } });
}

export async function resolveOfferingVariant(
  offeringId: string,
  variantId: string | null | undefined,
): Promise<{
  id: string;
  title: string;
  priceCents: number;
  unitsIncluded: number;
  durationMinutes: number | null;
  sku: string | null;
  inventoryQuantity: number | null;
} | null> {
  const variants = await prisma.offeringVariant.findMany({
    where: { offeringId },
    orderBy: { sortOrder: "asc" },
  });
  if (variants.length === 0) return null;
  if (!variantId) {
    throw new Error("Choose a deal before continuing.");
  }
  const variant = variants.find((v) => v.id === variantId);
  if (!variant) {
    throw new Error("Selected deal is not available.");
  }
  return {
    ...variant,
    unitsIncluded: Math.max(1, variant.unitsIncluded ?? 1),
  };
}

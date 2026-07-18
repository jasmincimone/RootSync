import { getServerSession } from "next-auth";

import { discoverDirectoryPath, discoverListingPath, discoverVendorPath } from "@/config/discoverPaths";
import { authOptions } from "@/lib/authOptions";
import { prisma, resetPrismaConnection } from "@/lib/prisma";
import {
  DIRECTORY_LISTING_STATUS,
  FAVORITE_TARGET_TYPE,
  LISTING_VISIBILITY,
  VENDOR_STATUS,
  type FavoriteTargetType,
} from "@/lib/roles";

function favoriteDelegate() {
  let delegate = (prisma as { favorite?: typeof prisma.favorite }).favorite;
  if (!delegate) {
    // Dev server may still hold a PrismaClient from before `prisma generate`.
    resetPrismaConnection();
    delegate = (prisma as { favorite?: typeof prisma.favorite }).favorite;
  }
  return delegate ?? null;
}

export function isFavoriteTargetType(value: string): value is FavoriteTargetType {
  return (
    value === FAVORITE_TARGET_TYPE.LISTING ||
    value === FAVORITE_TARGET_TYPE.VENDOR ||
    value === FAVORITE_TARGET_TYPE.DIRECTORY
  );
}

export async function requireSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

async function assertFavoriteTargetExists(
  targetType: FavoriteTargetType,
  targetId: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  if (targetType === FAVORITE_TARGET_TYPE.LISTING) {
    const listing = await prisma.listing.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        visibility: true,
        vendorProfile: { select: { status: true } },
      },
    });
    if (!listing) return { ok: false, error: "Listing not found", status: 404 };
    if (
      listing.visibility !== LISTING_VISIBILITY.PUBLIC ||
      listing.vendorProfile.status !== VENDOR_STATUS.APPROVED
    ) {
      return { ok: false, error: "Listing is not available to save", status: 404 };
    }
    return { ok: true };
  }

  if (targetType === FAVORITE_TARGET_TYPE.VENDOR) {
    const vendor = await prisma.vendorProfile.findUnique({
      where: { id: targetId },
      select: { id: true, status: true },
    });
    if (!vendor || vendor.status !== VENDOR_STATUS.APPROVED) {
      return { ok: false, error: "Vendor not found", status: 404 };
    }
    return { ok: true };
  }

  const directory = await prisma.directoryListing.findUnique({
    where: { id: targetId },
    select: { id: true, status: true },
  });
  if (!directory || directory.status !== DIRECTORY_LISTING_STATUS.ACTIVE) {
    return { ok: false, error: "Directory listing not found", status: 404 };
  }
  return { ok: true };
}

export type ToggleFavoriteResult =
  | { ok: true; saved: boolean }
  | { ok: false; error: string; status: number };

export async function toggleFavorite(
  userId: string,
  targetType: FavoriteTargetType,
  targetId: string,
): Promise<ToggleFavoriteResult> {
  const favorite = favoriteDelegate();
  if (!favorite) {
    return {
      ok: false,
      error: "Favorites are not available yet. Restart the app after migrating.",
      status: 503,
    };
  }

  const exists = await assertFavoriteTargetExists(targetType, targetId);
  if (!exists.ok) return exists;

  try {
    const existing = await favorite.findUnique({
      where: {
        userId_targetType_targetId: { userId, targetType, targetId },
      },
      select: { id: true },
    });

    if (existing) {
      await favorite.delete({ where: { id: existing.id } });
      return { ok: true, saved: false };
    }

    await favorite.create({
      data: { userId, targetType, targetId },
    });
    return { ok: true, saved: true };
  } catch (err) {
    console.warn("[favorites] toggle failed", err);
    return {
      ok: false,
      error: "Could not update favorite. Run database migrations if this persists.",
      status: 503,
    };
  }
}

export async function isFavorited(
  userId: string | undefined,
  targetType: FavoriteTargetType,
  targetId: string,
): Promise<boolean> {
  if (!userId) return false;
  const favorite = favoriteDelegate();
  if (!favorite) return false;

  try {
    const row = await favorite.findUnique({
      where: {
        userId_targetType_targetId: { userId, targetType, targetId },
      },
      select: { id: true },
    });
    return Boolean(row);
  } catch (err) {
    // Missing table / stale client must not break Discover detail pages.
    console.warn("[favorites] isFavorited skipped", err);
    return false;
  }
}

export type SavedFavoriteItem = {
  id: string;
  targetType: FavoriteTargetType;
  targetId: string;
  createdAt: Date;
  title: string;
  subtitle: string | null;
  href: string;
  imageUrl: string | null;
};

export async function listSavedFavorites(userId: string): Promise<SavedFavoriteItem[]> {
  const favorite = favoriteDelegate();
  if (!favorite) return [];

  let rows: Array<{
    id: string;
    targetType: string;
    targetId: string;
    createdAt: Date;
  }>;
  try {
    rows = await favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  } catch (err) {
    console.warn("[favorites] list skipped", err);
    return [];
  }

  const listingIds = rows
    .filter((r) => r.targetType === FAVORITE_TARGET_TYPE.LISTING)
    .map((r) => r.targetId);
  const vendorIds = rows
    .filter((r) => r.targetType === FAVORITE_TARGET_TYPE.VENDOR)
    .map((r) => r.targetId);
  const directoryIds = rows
    .filter((r) => r.targetType === FAVORITE_TARGET_TYPE.DIRECTORY)
    .map((r) => r.targetId);

  const [listings, vendors, directories] = await Promise.all([
    listingIds.length
      ? prisma.listing.findMany({
          where: { id: { in: listingIds } },
          select: {
            id: true,
            title: true,
            imageUrl: true,
            listingType: true,
            vendorProfile: { select: { displayName: true } },
          },
        })
      : Promise.resolve([]),
    vendorIds.length
      ? prisma.vendorProfile.findMany({
          where: { id: { in: vendorIds } },
          select: {
            id: true,
            displayName: true,
            profileImageUrl: true,
            publicSlug: true,
            pickupLocation: true,
          },
        })
      : Promise.resolve([]),
    directoryIds.length
      ? prisma.directoryListing.findMany({
          where: { id: { in: directoryIds } },
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            directoryType: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const listingById = new Map(listings.map((l) => [l.id, l]));
  const vendorById = new Map(vendors.map((v) => [v.id, v]));
  const directoryById = new Map(directories.map((d) => [d.id, d]));

  const items: SavedFavoriteItem[] = [];
  for (const row of rows) {
    if (row.targetType === FAVORITE_TARGET_TYPE.LISTING) {
      const listing = listingById.get(row.targetId);
      if (!listing) continue;
      items.push({
        id: row.id,
        targetType: FAVORITE_TARGET_TYPE.LISTING,
        targetId: row.targetId,
        createdAt: row.createdAt,
        title: listing.title,
        subtitle: listing.vendorProfile.displayName,
        href: discoverListingPath(listing.id),
        imageUrl: listing.imageUrl,
      });
      continue;
    }
    if (row.targetType === FAVORITE_TARGET_TYPE.VENDOR) {
      const vendor = vendorById.get(row.targetId);
      if (!vendor) continue;
      items.push({
        id: row.id,
        targetType: FAVORITE_TARGET_TYPE.VENDOR,
        targetId: row.targetId,
        createdAt: row.createdAt,
        title: vendor.displayName,
        subtitle: vendor.pickupLocation,
        href: discoverVendorPath(vendor),
        imageUrl: vendor.profileImageUrl,
      });
      continue;
    }
    if (row.targetType === FAVORITE_TARGET_TYPE.DIRECTORY) {
      const directory = directoryById.get(row.targetId);
      if (!directory) continue;
      const location = [directory.city, directory.state].filter(Boolean).join(", ");
      items.push({
        id: row.id,
        targetType: FAVORITE_TARGET_TYPE.DIRECTORY,
        targetId: row.targetId,
        createdAt: row.createdAt,
        title: directory.name,
        subtitle: location || null,
        href: discoverDirectoryPath(directory.id),
        imageUrl: null,
      });
    }
  }

  return items;
}

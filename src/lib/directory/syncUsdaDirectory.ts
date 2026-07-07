import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { DIRECTORY_CLAIM_STATUS, DIRECTORY_LISTING_STATUS, DIRECTORY_SOURCE } from "@/lib/roles";

import { fetchUsdaListingsNearZip } from "./usdaClient";
import type { NormalizedDirectoryListing } from "./types";

export type SyncUsdaOptions = {
  zip: string;
  radiusMiles: number;
  apiKey?: string | null;
  dryRun?: boolean;
};

export type SyncUsdaResult = {
  fetched: number;
  upserted: number;
  skipped: number;
};

function toPrismaData(
  row: NormalizedDirectoryListing,
  syncedAt: Date,
): Prisma.DirectoryListingCreateInput {
  return {
    name: row.name,
    description: row.description,
    directoryType: row.directoryType,
    addressLine1: row.addressLine1,
    city: row.city,
    state: row.state,
    zip: row.zip,
    latitude: row.latitude,
    longitude: row.longitude,
    phone: row.phone,
    email: row.email,
    website: row.website,
    source: DIRECTORY_SOURCE.USDA,
    externalId: row.externalId,
    externalUrl: row.externalUrl,
    rawSourceJson: row.rawSourceJson as Prisma.InputJsonValue,
    lastSyncedAt: syncedAt,
    status: DIRECTORY_LISTING_STATUS.ACTIVE,
  };
}

export async function syncUsdaDirectoryListings(
  options: SyncUsdaOptions,
): Promise<SyncUsdaResult> {
  const rows = await fetchUsdaListingsNearZip(
    options.zip,
    options.radiusMiles,
    options.apiKey,
  );

  if (options.dryRun) {
    return { fetched: rows.length, upserted: 0, skipped: 0 };
  }

  const syncedAt = new Date();
  let upserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const data = toPrismaData(row, syncedAt);
    try {
      await prisma.directoryListing.upsert({
        where: {
          source_externalId: {
            source: DIRECTORY_SOURCE.USDA,
            externalId: row.externalId,
          },
        },
        create: data,
        update: {
          name: data.name,
          description: data.description,
          directoryType: data.directoryType,
          addressLine1: data.addressLine1,
          city: data.city,
          state: data.state,
          zip: data.zip,
          latitude: data.latitude,
          longitude: data.longitude,
          phone: data.phone,
          email: data.email,
          website: data.website,
          externalUrl: data.externalUrl,
          rawSourceJson: data.rawSourceJson,
          lastSyncedAt: syncedAt,
          status: DIRECTORY_LISTING_STATUS.ACTIVE,
        },
      });
      upserted += 1;
    } catch {
      skipped += 1;
    }
  }

  return { fetched: rows.length, upserted, skipped };
}

export const publicDirectoryWhere = {
  status: DIRECTORY_LISTING_STATUS.ACTIVE,
  claimStatus: {
    in: [DIRECTORY_CLAIM_STATUS.UNCLAIMED, DIRECTORY_CLAIM_STATUS.PENDING],
  },
};

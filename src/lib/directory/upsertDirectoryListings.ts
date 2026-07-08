import type { Prisma, PrismaClient } from "@prisma/client";

import { withPrismaRetry } from "@/lib/prisma";
import { DIRECTORY_LISTING_STATUS, DIRECTORY_SOURCE } from "@/lib/roles";

import type { NormalizedDirectoryListing } from "./types";

const UPSERT_CHUNK_SIZE = 25;

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

async function upsertChunk(
  client: PrismaClient,
  rows: NormalizedDirectoryListing[],
  syncedAt: Date,
): Promise<{ upserted: number; skipped: number }> {
  let upserted = 0;
  let skipped = 0;

  await client.$transaction(async (tx) => {
    for (const row of rows) {
      const data = toPrismaData(row, syncedAt);
      try {
        await tx.directoryListing.upsert({
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
  });

  return { upserted, skipped };
}

/** Batch upsert USDA rows — reconnects if Neon closed the pool during a long upstream fetch. */
export async function upsertNormalizedDirectoryListings(
  rows: NormalizedDirectoryListing[],
): Promise<{ upserted: number; skipped: number }> {
  if (rows.length === 0) return { upserted: 0, skipped: 0 };

  const syncedAt = new Date();
  let upserted = 0;
  let skipped = 0;

  await withPrismaRetry(async (client) => {
    const totalChunks = Math.ceil(rows.length / UPSERT_CHUNK_SIZE);
    for (let i = 0; i < rows.length; i += UPSERT_CHUNK_SIZE) {
      const chunkIndex = Math.floor(i / UPSERT_CHUNK_SIZE) + 1;
      const chunk = rows.slice(i, i + UPSERT_CHUNK_SIZE);
      const chunkStarted = Date.now();
      const result = await upsertChunk(client, chunk, syncedAt);
      upserted += result.upserted;
      skipped += result.skipped;

      if (process.env.NODE_ENV === "development") {
        console.info(
          `[directory] upsert batch ${chunkIndex}/${totalChunks} — ${Math.min(i + UPSERT_CHUNK_SIZE, rows.length)}/${rows.length} rows (${Date.now() - chunkStarted}ms)`,
        );
      }
    }
  });

  return { upserted, skipped };
}

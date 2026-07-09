import type { Prisma } from "@prisma/client";

import { isDiscoverStateRadiusAnywhere, type DiscoverStateRadius } from "@/config/discoverLocation";
import { withPrismaRetry } from "@/lib/prisma";
import { DIRECTORY_SOURCE } from "@/lib/roles";

import { DIRECTORY_DB_FRESH_MS } from "./directorySearchConfig";
import { publicDirectoryWhere } from "./syncUsdaDirectory";

export type StateDirectorySyncMeta = {
  count: number;
  latestSyncedAt: Date | null;
};

export async function getStateDirectorySyncMeta(
  stateAbbrev: string,
): Promise<StateDirectorySyncMeta> {
  return withPrismaRetry(async (client) => {
    const where: Prisma.DirectoryListingWhereInput = {
      ...publicDirectoryWhere,
      source: DIRECTORY_SOURCE.USDA,
      state: stateAbbrev,
    };
    const [count, aggregate] = await Promise.all([
      client.directoryListing.count({ where }),
      client.directoryListing.aggregate({
        where,
        _max: { lastSyncedAt: true },
      }),
    ]);
    return {
      count,
      latestSyncedAt: aggregate._max.lastSyncedAt,
    };
  });
}

export function isDirectoryDbFresh(meta: StateDirectorySyncMeta): boolean {
  if (meta.count === 0 || !meta.latestSyncedAt) return false;
  return Date.now() - meta.latestSyncedAt.getTime() <= DIRECTORY_DB_FRESH_MS;
}

export function stateAbbrevForDirectorySearch(params: {
  stateAbbrev: string | null;
  stateRadius: DiscoverStateRadius | null;
}): string | null {
  if (!params.stateAbbrev || !params.stateRadius) return null;
  if (isDiscoverStateRadiusAnywhere(params.stateRadius)) return params.stateAbbrev;
  return params.stateAbbrev;
}

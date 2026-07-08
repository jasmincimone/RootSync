import { DIRECTORY_CLAIM_STATUS, DIRECTORY_LISTING_STATUS } from "@/lib/roles";
import { normalizeUsState } from "@/lib/usStates";

import { fetchUsdaListings, usdaSearchLocationFromState } from "./usdaClient";
import { upsertNormalizedDirectoryListings } from "./upsertDirectoryListings";

export type SyncUsdaOptions = {
  /** Search by state (abbrev or name). Mutually exclusive with zip. */
  state?: string;
  zip?: string;
  radiusMiles: number;
  apiKey?: string | null;
  dryRun?: boolean;
};

export type SyncUsdaResult = {
  fetched: number;
  upserted: number;
  skipped: number;
};

export async function syncUsdaDirectoryListings(
  options: SyncUsdaOptions,
): Promise<SyncUsdaResult> {
  const stateAbbrev = options.state ? normalizeUsState(options.state) : null;
  const zip = options.zip?.trim() ?? "";

  let location: string;
  if (stateAbbrev) {
    location = usdaSearchLocationFromState(stateAbbrev) ?? stateAbbrev;
  } else if (/^\d{5}$/.test(zip)) {
    location = zip;
  } else {
    throw new Error("Provide --state=GA or both --zip=31216 and --radius=20.");
  }

  const rows = await fetchUsdaListings(location, options.radiusMiles, options.apiKey);

  if (options.dryRun) {
    return { fetched: rows.length, upserted: 0, skipped: 0 };
  }

  const { upserted, skipped } = await upsertNormalizedDirectoryListings(rows);
  return { fetched: rows.length, upserted, skipped };
}

export const publicDirectoryWhere = {
  status: DIRECTORY_LISTING_STATUS.ACTIVE,
  claimStatus: {
    in: [DIRECTORY_CLAIM_STATUS.UNCLAIMED, DIRECTORY_CLAIM_STATUS.PENDING],
  },
};

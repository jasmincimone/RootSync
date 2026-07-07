/**
 * Sync USDA Local Food Directory listings into DirectoryListing.
 *
 * Usage:
 *   npm run directory:sync
 *   npm run directory:sync -- --state=GA
 *   npm run directory:sync -- --zip=31216 --radius=20
 *   npm run directory:sync -- --dry-run
 */
import { PrismaClient } from "@prisma/client";

import { syncUsdaDirectoryListings } from "@/lib/directory/syncUsdaDirectory";
import { normalizeUsState } from "@/lib/usStates";

const prisma = new PrismaClient();

function arg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

async function main() {
  const stateArg = arg("state", "");
  const zip = arg("zip", "31216");
  const radiusMiles = Number(arg("radius", "20"));
  const dryRun = process.argv.includes("--dry-run");
  const apiKey = process.env.USDA_LOCAL_FOOD_API_KEY ?? null;

  const state = stateArg.trim() || null;
  const useState = state ? normalizeUsState(state) : null;
  const useZip = !useState && /^\d{5}$/.test(zip.trim());

  if (useState) {
    console.log(`Syncing USDA directory for state ${useState} (${radiusMiles} mi USDA radius bucket)…`);
  } else if (useZip) {
    console.log(`Syncing USDA directory near zip ${zip} (${radiusMiles} mi requested)…`);
  } else {
    throw new Error("Provide --state=GA or a valid 5-digit --zip= with --radius=.");
  }

  const result = await syncUsdaDirectoryListings({
    state: useState ?? undefined,
    zip: useZip ? zip : undefined,
    radiusMiles,
    apiKey,
    dryRun,
  });

  console.log(
    dryRun
      ? `Dry run: ${result.fetched} listings fetched (not written).`
      : `Done: ${result.fetched} fetched, ${result.upserted} upserted, ${result.skipped} skipped.`,
  );

  if (result.fetched === 0) {
    console.warn(
      "No listings returned. Try a different state or zip/radius, or check https://www.usdalocalfoodportal.com",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

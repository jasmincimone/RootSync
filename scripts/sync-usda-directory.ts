/**
 * Sync USDA Local Food Directory listings into DirectoryListing.
 *
 * Usage:
 *   npm run directory:sync
 *   npm run directory:sync -- --zip=31216 --radius=20
 *   npm run directory:sync -- --dry-run
 */
import { PrismaClient } from "@prisma/client";

import { syncUsdaDirectoryListings } from "@/lib/directory/syncUsdaDirectory";

const prisma = new PrismaClient();

function arg(name: string, fallback: string): string {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

async function main() {
  const zip = arg("zip", "31216");
  const radiusMiles = Number(arg("radius", "20"));
  const dryRun = process.argv.includes("--dry-run");
  const apiKey = process.env.USDA_LOCAL_FOOD_API_KEY ?? null;

  console.log(`Syncing USDA directory near zip ${zip} (${radiusMiles} mi requested)…`);
  const result = await syncUsdaDirectoryListings({
    zip,
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
      "No listings returned. USDA may block datacenter IPs — run this command on your local machine, or check USDA_LOCAL_FOOD_API_KEY.",
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

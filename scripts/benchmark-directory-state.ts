import { DEFAULT_DISCOVER_PAGE_SIZE } from "@/config/discoverPagination";
import { searchDirectoryListings } from "../src/lib/directory/searchDirectoryListings";
import { normalizeUsState } from "../src/lib/usStates";

async function main() {
  const state = process.argv[2] ?? "CT";
  const city = process.argv[3] ?? "Hartford";
  const abbrev = normalizeUsState(state);
  if (!abbrev) throw new Error(`Unknown state: ${state}`);

  console.log(`\n=== ${city}, ${abbrev} — 25 mi ===\n`);

  const searchStarted = Date.now();
  const result = await searchDirectoryListings({
    state: abbrev,
    city,
    stateRadius: 25,
    page: 1,
    pageSize: DEFAULT_DISCOVER_PAGE_SIZE,
    refresh: true,
  });
  const searchMs = Date.now() - searchStarted;
  console.log(
    `Page 1 searchDirectoryListings: ${result.total} total, ${result.items.length} returned — ${(searchMs / 1000).toFixed(1)}s (page size ${result.pageSize})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

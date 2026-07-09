/** Serve directory results from Postgres when state data was synced within this window. */
export const DIRECTORY_DB_FRESH_MS = 6 * 60 * 60 * 1000;

/** Also upsert the next page of USDA rows so page 2 is ready in the database. */
export const DIRECTORY_PREFETCH_NEXT_PAGE = true;

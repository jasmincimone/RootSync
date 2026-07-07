import { NextRequest, NextResponse } from "next/server";

import { parseDiscoverPageSize } from "@/config/discoverPagination";
import { searchDirectoryListings } from "@/lib/directory/searchDirectoryListings";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const data = body as Record<string, unknown>;
  const state = typeof data.state === "string" ? data.state : undefined;
  const zip = typeof data.zip === "string" ? data.zip : undefined;
  const radiusMiles =
    typeof data.radiusMiles === "number"
      ? data.radiusMiles
      : typeof data.radiusMiles === "string"
        ? Number(data.radiusMiles)
        : undefined;
  const query = typeof data.query === "string" ? data.query : undefined;
  const page =
    typeof data.page === "number" ? data.page : typeof data.page === "string" ? Number(data.page) : 1;
  const pageSize = parseDiscoverPageSize(data.pageSize);

  const stateAbbrev = state?.trim();
  const zipTrimmed = zip?.trim();

  if (stateAbbrev && zipTrimmed) {
    return NextResponse.json(
      { error: "Search by state or by ZIP and radius — not both." },
      { status: 400 },
    );
  }

  if (zipTrimmed && (!/^\d{5}$/.test(zipTrimmed) || !radiusMiles || radiusMiles <= 0)) {
    return NextResponse.json(
      { error: "ZIP search requires a valid 5-digit ZIP and radius in miles." },
      { status: 400 },
    );
  }

  try {
    const result = await searchDirectoryListings({
      state: stateAbbrev || undefined,
      zip: zipTrimmed || undefined,
      radiusMiles,
      query,
      page: Number.isFinite(page) ? Math.max(1, page) : 1,
      pageSize,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Directory search failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

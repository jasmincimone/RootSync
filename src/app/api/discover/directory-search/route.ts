import { NextRequest, NextResponse } from "next/server";

import { parseDiscoverStateRadiusFromUnknown } from "@/config/discoverLocation";
import { parseDiscoverPageSize } from "@/config/discoverPagination";
import { searchDirectoryListings } from "@/lib/directory/searchDirectoryListings";
import { normalizeUsState } from "@/lib/usStates";

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
  const city = typeof data.city === "string" ? data.city : undefined;
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
  const refresh = data.refresh === true;
  const centerRaw = data.locationCenter ?? data.zipCenter;
  const locationCenter =
    centerRaw &&
    typeof centerRaw === "object" &&
    typeof (centerRaw as { latitude?: unknown }).latitude === "number" &&
    typeof (centerRaw as { longitude?: unknown }).longitude === "number"
      ? {
          latitude: (centerRaw as { latitude: number }).latitude,
          longitude: (centerRaw as { longitude: number }).longitude,
        }
      : null;

  const stateAbbrev = state?.trim() ? normalizeUsState(state.trim()) : null;
  const cityTrimmed = city?.trim() ?? "";
  const zipTrimmed = zip?.trim() ?? "";
  const stateRadius =
    parseDiscoverStateRadiusFromUnknown(data.stateRadius) ??
    (stateAbbrev ? parseDiscoverStateRadiusFromUnknown(data.radiusMiles) : null);

  if (stateAbbrev && zipTrimmed) {
    return NextResponse.json(
      { error: "Search by state and city or by ZIP and radius — not both." },
      { status: 400 },
    );
  }

  if (stateAbbrev) {
    if (!cityTrimmed) {
      return NextResponse.json({ error: "City is required for state search." }, { status: 400 });
    }
    if (!stateRadius) {
      return NextResponse.json(
        { error: "Choose a distance preset (5 mi through Anywhere)." },
        { status: 400 },
      );
    }
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
      city: cityTrimmed || undefined,
      stateRadius,
      zip: zipTrimmed || undefined,
      radiusMiles,
      locationCenter,
      query,
      page: Number.isFinite(page) ? Math.max(1, page) : 1,
      pageSize,
      refresh,
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Directory search failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

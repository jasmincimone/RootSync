import { NextRequest, NextResponse } from "next/server";

import { normalizeUsState } from "@/lib/usStates";

export const runtime = "nodejs";

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";

async function geocodeQuery(
  params: URLSearchParams,
  userAgent: string,
): Promise<{ latitude: number; longitude: number; label: string } | null> {
  const url = new URL(NOMINATIM_SEARCH);
  for (const [key, value] of params.entries()) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": userAgent,
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
  const first = data[0];
  if (!first) return null;

  const latitude = parseFloat(first.lat);
  const longitude = parseFloat(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    label: first.display_name ?? "",
  };
}

/**
 * Geocode a US ZIP or city + state (public, for Discover filters).
 */
export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip")?.trim() ?? "";
  const city = request.nextUrl.searchParams.get("city")?.trim() ?? "";
  const state = request.nextUrl.searchParams.get("state")?.trim() ?? "";

  const userAgent =
    process.env.GEOCODE_USER_AGENT?.trim() ||
    "TheFixCollective/1.0 (https://github.com; set GEOCODE_USER_AGENT for production)";

  let result: { latitude: number; longitude: number; label: string } | null = null;

  try {
    if (/^\d{5}$/.test(zip)) {
      const params = new URLSearchParams();
      params.set("postalcode", zip);
      params.set("country", "US");
      result = await geocodeQuery(params, userAgent);
      if (!result) {
        return NextResponse.json({ error: "No location found for that ZIP code." }, { status: 404 });
      }
      return NextResponse.json({
        latitude: result.latitude,
        longitude: result.longitude,
        label: result.label || zip,
      });
    }

    if (city && state) {
      const abbrev = normalizeUsState(state);
      if (!abbrev) {
        return NextResponse.json({ error: "Enter a valid US state." }, { status: 400 });
      }
      const params = new URLSearchParams();
      params.set("city", city);
      params.set("state", abbrev);
      params.set("country", "US");
      result = await geocodeQuery(params, userAgent);
      if (!result) {
        return NextResponse.json(
          { error: `No location found for ${city}, ${abbrev}.` },
          { status: 404 },
        );
      }
      return NextResponse.json({
        latitude: result.latitude,
        longitude: result.longitude,
        label: result.label || `${city}, ${abbrev}`,
      });
    }

    return NextResponse.json(
      { error: "Provide zip=##### or both city= and state=." },
      { status: 400 },
    );
  } catch {
    return NextResponse.json({ error: "Geocoding service unavailable." }, { status: 502 });
  }
}

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";

/**
 * Geocode a US ZIP code to approximate center coordinates (public, for Discover filters).
 */
export async function GET(request: NextRequest) {
  const zip = request.nextUrl.searchParams.get("zip")?.trim() ?? "";
  if (!/^\d{5}$/.test(zip)) {
    return NextResponse.json({ error: "Enter a valid 5-digit US ZIP code." }, { status: 400 });
  }

  const url = new URL(NOMINATIM_SEARCH);
  url.searchParams.set("postalcode", zip);
  url.searchParams.set("country", "US");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const userAgent =
    process.env.GEOCODE_USER_AGENT?.trim() ||
    "TheFixCollective/1.0 (https://github.com; set GEOCODE_USER_AGENT for production)";

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent,
      },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "Geocoding service unavailable." }, { status: 502 });
  }

  if (!res.ok) {
    return NextResponse.json({ error: "Geocoding request failed." }, { status: 502 });
  }

  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
  const first = data[0];
  if (!first) {
    return NextResponse.json(
      { error: "No location found for that ZIP code." },
      { status: 404 },
    );
  }

  const latitude = parseFloat(first.lat);
  const longitude = parseFloat(first.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: "Invalid response from geocoder." }, { status: 502 });
  }

  return NextResponse.json({
    latitude,
    longitude,
    label: first.display_name ?? zip,
  });
}

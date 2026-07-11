import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

const NOMINATIM_SEARCH = "https://nominatim.openstreetmap.org/search";

/**
 * Geocode US city + state to WGS84 coordinates (approximate city/region center).
 * Uses Nominatim — set GEOCODE_USER_AGENT in .env to identify your app (required by OSM policy).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = rateLimitResponse(request, "geocode", {
    userId: session.user.id,
    message: "Too many location lookups. Try again shortly.",
  });
  if (limited) return limited;

  const profile = await prisma.vendorProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ error: "No vendor profile" }, { status: 404 });
  }

  const body = await request.json();
  const city = typeof body.city === "string" ? body.city.trim() : "";
  const state = typeof body.state === "string" ? body.state.trim() : "";

  if (!city || !state) {
    return NextResponse.json(
      { error: "Enter both city and state to look up coordinates." },
      { status: 400 }
    );
  }

  const query = `${city}, ${state}, USA`;
  const url = new URL(NOMINATIM_SEARCH);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

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
      { error: "No location found for that city and state. Try a different spelling." },
      { status: 404 }
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
    label: first.display_name ?? query,
  });
}

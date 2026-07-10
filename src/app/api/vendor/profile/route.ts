import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { normalizeWebsiteUrl } from "@/lib/paymentUrl";
import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";
import { validateVendorPublicSlug } from "@/lib/vendorPublicSlug";

export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.vendorProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!profile) {
    return NextResponse.json({ error: "No vendor profile" }, { status: 404 });
  }

  const editable =
    profile.status === VENDOR_STATUS.PENDING ||
    profile.status === VENDOR_STATUS.APPROVED ||
    session.user.role === ROLES.ADMIN;
  if (!editable) {
    return NextResponse.json({ error: "Profile is not editable in current status" }, { status: 403 });
  }

  const body = await request.json();
  const raw = body as Record<string, unknown>;
  const { displayName, bio, contactEmail, pickupLocation } = raw as Record<
    string,
    string | undefined
  >;

  let websiteUpdate: string | null | undefined;
  if (raw.website !== undefined) {
    try {
      websiteUpdate = normalizeWebsiteUrl(raw.website);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid website";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  function parseCoordValue(
    value: unknown,
    range: "lat" | "lng"
  ): { ok: true; value: number | null } | { ok: false; error: string } {
    if (value === null || value === "") return { ok: true, value: null };
    const n = typeof value === "number" ? value : parseFloat(String(value).trim());
    if (!Number.isFinite(n)) {
      return { ok: false, error: `Invalid ${range === "lat" ? "latitude" : "longitude"}` };
    }
    if (range === "lat" && (n < -90 || n > 90)) {
      return { ok: false, error: "Latitude must be between -90 and 90" };
    }
    if (range === "lng" && (n < -180 || n > 180)) {
      return { ok: false, error: "Longitude must be between -180 and 180" };
    }
    return { ok: true, value: n };
  }

  const latInBody = raw.latitude !== undefined;
  const lngInBody = raw.longitude !== undefined;
  let latitudeUpdate: number | null | undefined;
  let longitudeUpdate: number | null | undefined;

  if (latInBody) {
    const latParsed = parseCoordValue(raw.latitude, "lat");
    if (!latParsed.ok) {
      return NextResponse.json({ error: latParsed.error }, { status: 400 });
    }
    latitudeUpdate = latParsed.value;
  }
  if (lngInBody) {
    const lngParsed = parseCoordValue(raw.longitude, "lng");
    if (!lngParsed.ok) {
      return NextResponse.json({ error: lngParsed.error }, { status: 400 });
    }
    longitudeUpdate = lngParsed.value;
  }

  if (latInBody || lngInBody) {
    const nextLat = latInBody ? latitudeUpdate! : profile.latitude;
    const nextLng = lngInBody ? longitudeUpdate! : profile.longitude;
    const pinComplete = nextLat != null && nextLng != null;
    const pinEmpty = nextLat == null && nextLng == null;
    if (!pinComplete && !pinEmpty) {
      return NextResponse.json(
        { error: "Set both latitude and longitude, or clear both, for the map pin." },
        { status: 400 }
      );
    }
  }

  let publicSlugUpdate: string | null | undefined;
  if (raw.publicSlug !== undefined) {
    const parsed =
      typeof raw.publicSlug === "string"
        ? validateVendorPublicSlug(raw.publicSlug)
        : { ok: false as const, error: "Invalid profile URL." };
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    publicSlugUpdate = parsed.slug;
  }

  try {
    await prisma.vendorProfile.update({
      where: { userId: session.user.id },
      data: {
        ...(displayName != null && { displayName: displayName.trim() }),
        ...(bio !== undefined && { bio: bio?.trim() || null }),
        ...(contactEmail !== undefined && { contactEmail: contactEmail?.trim() || null }),
        ...(pickupLocation !== undefined && { pickupLocation: pickupLocation?.trim() || null }),
        ...(latInBody && { latitude: latitudeUpdate }),
        ...(lngInBody && { longitude: longitudeUpdate }),
        ...(raw.website !== undefined && { website: websiteUpdate }),
        ...(raw.publicSlug !== undefined && { publicSlug: publicSlugUpdate }),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "That profile URL is already taken. Choose another." },
        { status: 409 },
      );
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}

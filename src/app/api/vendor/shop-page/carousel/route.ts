import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { discoverVendorPath } from "@/config/discoverPaths";
import { authOptions } from "@/lib/authOptions";
import {
  canEditShopLandingAsVendor,
  getVendorProfileForUser,
} from "@/lib/shopPageAccess";
import {
  loadVendorCarousel,
  saveVendorCarousel,
  validateCarouselItems,
} from "@/lib/vendorCarousel";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getVendorProfileForUser(session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "No vendor profile" }, { status: 404 });
    }

    const canEdit = canEditShopLandingAsVendor(session, profile.status);
    const mediaCarousel = await loadVendorCarousel(profile.id);

    return NextResponse.json({
      canEdit,
      vendorProfileId: profile.id,
      shopName: profile.displayName,
      publicUrl: discoverVendorPath(profile),
      mediaCarousel,
    });
  } catch (e) {
    console.error("[vendor carousel GET]", e);
    const message = e instanceof Error ? e.message : "Failed to load carousel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getVendorProfileForUser(session.user.id);
    if (!profile) {
      return NextResponse.json({ error: "No vendor profile" }, { status: 404 });
    }

    if (!canEditShopLandingAsVendor(session, profile.status)) {
      return NextResponse.json(
        { error: "Carousel editing is available for approved vendors." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { mediaCarousel } = body as { mediaCarousel?: unknown };
    const parsed = validateCarouselItems(mediaCarousel);
    if (parsed === null) {
      return NextResponse.json(
        { error: "Invalid carousel. Each slide needs id, type (image|video), and url." },
        { status: 400 },
      );
    }

    await saveVendorCarousel(profile.id, parsed);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[vendor carousel PATCH]", e);
    const message = e instanceof Error ? e.message : "Failed to save carousel";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

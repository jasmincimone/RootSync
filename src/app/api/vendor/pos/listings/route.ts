import { NextRequest, NextResponse } from "next/server";

import { rateLimitResponse } from "@/lib/rateLimit";
import { requirePosRequestUserId } from "@/lib/posRequestAuth";
import { listVendorPosSellableListings, requireVendorPosContext } from "@/lib/vendorPos";

export const runtime = "nodejs";

/** Active vendor listings/variants for Terminal POS (live from Postgres). */
export async function GET(request: NextRequest) {
  try {
    const userId = await requirePosRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimitResponse(request, "geocode", {
      userId,
      scope: "vendor-pos-listings",
      message: "Too many listing refreshes. Try again shortly.",
    });
    if (limited) return limited;

    const gate = await requireVendorPosContext(userId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const listings = await listVendorPosSellableListings(gate.ctx);
    return NextResponse.json({
      ok: true,
      listings,
      count: listings.length,
      hint:
        listings.length === 0
          ? "Terminal sells RootSync ACTIVE listings (Postgres), not Stripe Products directly. Sync from Stripe or open Vendor → Listings and set items to ACTIVE, then Refresh."
          : undefined,
    });
  } catch (e) {
    console.error("[vendor/pos/listings]", e);
    const message = e instanceof Error ? e.message : "Could not load POS listings.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

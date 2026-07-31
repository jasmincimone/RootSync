import { NextRequest, NextResponse } from "next/server";

import { rateLimitResponse } from "@/lib/rateLimit";
import { requirePosRequestUserId } from "@/lib/posRequestAuth";
import { syncConnectedAccountProductsToOfferings } from "@/lib/importStripeProduct";
import { requireVendorPosContext } from "@/lib/vendorPos";

export const runtime = "nodejs";

/**
 * Pull Stripe Connect products → RootSync offerings (same as Payment Hub sync),
 * so Terminal can charge ACTIVE listings that were created only in Stripe.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await requirePosRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimitResponse(request, "upload", {
      userId,
      scope: "vendor-pos-sync-stripe",
      message: "Too many Stripe syncs. Try again shortly.",
    });
    if (limited) return limited;

    const gate = await requireVendorPosContext(userId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const summary = await syncConnectedAccountProductsToOfferings({
      connectAccountId: gate.ctx.connectAccountId,
      includeInactive: false,
    });

    return NextResponse.json({
      ok: true,
      ...summary,
      message: `Synced from Stripe: ${summary.imported} new, ${summary.updated} updated, ${summary.skipped} skipped.`,
    });
  } catch (e) {
    console.error("[vendor/pos/sync-from-stripe]", e);
    const message = e instanceof Error ? e.message : "Could not sync from Stripe.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

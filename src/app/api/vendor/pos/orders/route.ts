import { NextRequest, NextResponse } from "next/server";

import { rateLimitResponse } from "@/lib/rateLimit";
import { requirePosRequestUserId } from "@/lib/posRequestAuth";
import { listVendorPosOrders, requireVendorPosContext } from "@/lib/vendorPos";

export const runtime = "nodejs";

/** Recent in-person / Terminal orders for the signed-in vendor. */
export async function GET(request: NextRequest) {
  try {
    const userId = await requirePosRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimitResponse(request, "geocode", {
      userId,
      scope: "vendor-pos-orders",
      message: "Too many order list requests. Try again shortly.",
    });
    if (limited) return limited;

    const gate = await requireVendorPosContext(userId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const url = new URL(request.url);
    const limitRaw = Number(url.searchParams.get("limit") || "25");
    const orders = await listVendorPosOrders(gate.ctx, limitRaw);

    return NextResponse.json({
      ok: true,
      orders,
      lastOrderId: orders[0]?.id ?? null,
    });
  } catch (e) {
    console.error("[vendor/pos/orders]", e);
    const message = e instanceof Error ? e.message : "Could not load orders.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { rateLimitResponse } from "@/lib/rateLimit";
import { requirePosRequestUserId } from "@/lib/posRequestAuth";
import { requireVendorPosContext, sendVendorPosOrderReceiptEmail } from "@/lib/vendorPos";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/** Email a receipt for an in-person / Terminal order. */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const userId = await requirePosRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimitResponse(request, "otpSend", {
      userId,
      scope: "vendor-pos-receipt-email",
      message: "Too many receipt emails. Try again shortly.",
    });
    if (limited) return limited;

    const gate = await requireVendorPosContext(userId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const { id: orderId } = await context.params;
    if (!orderId?.trim()) {
      return NextResponse.json({ error: "Order id required." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const email = typeof body.email === "string" ? body.email : "";
    const result = await sendVendorPosOrderReceiptEmail({
      ctx: gate.ctx,
      orderId: orderId.trim(),
      toEmail: email,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: `Receipt sent to ${email.trim().toLowerCase()}.` });
  } catch (e) {
    console.error("[vendor/pos/orders/receipt]", e);
    const message = e instanceof Error ? e.message : "Could not send receipt.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";

import { rateLimitResponse } from "@/lib/rateLimit";
import { requirePosRequestUserId } from "@/lib/posRequestAuth";
import { createVendorTerminalPaymentIntent, requireVendorPosContext } from "@/lib/vendorPos";

export const runtime = "nodejs";

/** Create a card_present PaymentIntent for Terminal SDK collection. */
export async function POST(request: NextRequest) {
  try {
    const userId = await requirePosRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimitResponse(request, "checkout", {
      userId,
      scope: "vendor-pos-terminal-intent",
      message: "Too many Terminal charges. Try again shortly.",
    });
    if (limited) return limited;

    const gate = await requireVendorPosContext(userId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const result = await createVendorTerminalPaymentIntent({
      ctx: gate.ctx,
      amountCents: body.amountCents,
      description: body.description,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      connectAccountId: gate.ctx.connectAccountId,
      displayName: gate.ctx.displayName,
    });
  } catch (e) {
    console.error("[vendor/pos/terminal-intent]", e);
    const message = e instanceof Error ? e.message : "Could not create Terminal PaymentIntent.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

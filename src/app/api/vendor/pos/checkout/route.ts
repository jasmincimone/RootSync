import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { rateLimitResponse } from "@/lib/rateLimit";
import { createVendorPosCheckout, requireVendorPosContext } from "@/lib/vendorPos";

export const runtime = "nodejs";

/** Create an in-person Checkout Session (phone/tablet) — destination charge to Connect. */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimitResponse(request, "checkout", {
      userId: session.user.id,
      scope: "vendor-pos-checkout",
      message: "Too many POS checkouts. Try again shortly.",
    });
    if (limited) return limited;

    const gate = await requireVendorPosContext(session.user.id);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const origin = request.headers.get("origin") || undefined;
    const result = await createVendorPosCheckout({
      ctx: gate.ctx,
      amountCents: body.amountCents,
      description: body.description,
      origin,
    });

    return NextResponse.json({
      ok: true,
      ...result,
      connectAccountId: gate.ctx.connectAccountId,
    });
  } catch (e) {
    console.error("[vendor/pos/checkout]", e);
    const message = e instanceof Error ? e.message : "Could not start in-person checkout.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

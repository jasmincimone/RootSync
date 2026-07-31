import { NextRequest, NextResponse } from "next/server";

import { rateLimitResponse } from "@/lib/rateLimit";
import { requirePosRequestUserId } from "@/lib/posRequestAuth";
import {
  createTerminalConnectionToken,
  ensurePlatformTerminalLocation,
  requireVendorPosContext,
} from "@/lib/vendorPos";

export const runtime = "nodejs";

/** Stripe Terminal connection token (platform-owned; destination charges). */
export async function POST(request: NextRequest) {
  try {
    const userId = await requirePosRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = rateLimitResponse(request, "terminalConnectionToken", {
      userId,
      scope: "vendor-pos-terminal-token",
      message: "Too many Terminal token requests. Try again shortly.",
    });
    if (limited) return limited;

    const gate = await requireVendorPosContext(userId);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const locationId = await ensurePlatformTerminalLocation(
      `RootSync · ${gate.ctx.displayName}`,
    );
    const secret = await createTerminalConnectionToken(locationId);

    return NextResponse.json({
      ok: true,
      secret,
      locationId,
      connectAccountId: gate.ctx.connectAccountId,
      displayName: gate.ctx.displayName,
    });
  } catch (e) {
    console.error("[vendor/pos/connection-token]", e);
    const message = e instanceof Error ? e.message : "Could not create Terminal connection token.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

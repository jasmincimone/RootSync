import { NextResponse } from "next/server";

import { requirePosRequestUserId } from "@/lib/posRequestAuth";
import { getVendorPosReadiness } from "@/lib/vendorPosReadiness";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";

/** Live POS onboarding readiness for the signed-in vendor (web session or POS Bearer). */
export async function GET(request: NextRequest) {
  try {
    const userId = await requirePosRequestUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const readiness = await getVendorPosReadiness(userId);
    if (!readiness) {
      return NextResponse.json({ error: "Vendor profile required." }, { status: 403 });
    }

    const terminalAppUrl = process.env.NEXT_PUBLIC_TERMINAL_APP_URL?.trim() || null;

    return NextResponse.json({
      ok: true,
      ...readiness,
      terminalAppUrl,
    });
  } catch (e) {
    console.error("[vendor/pos/readiness]", e);
    const message = e instanceof Error ? e.message : "Could not load POS readiness.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

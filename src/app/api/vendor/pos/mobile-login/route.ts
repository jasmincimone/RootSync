import { NextRequest, NextResponse } from "next/server";

import { loginApprovedVendorForPos } from "@/lib/posMobileAuth";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

/** Email/password login for the RootSync Terminal (M2) companion app. */
export async function POST(request: NextRequest) {
  try {
    const limited = rateLimitResponse(request, "loginPrepare", {
      scope: "pos-mobile-login",
      message: "Too many login attempts. Try again shortly.",
    });
    if (limited) return limited;

    const body = (await request.json().catch(() => ({}))) as {
      email?: unknown;
      password?: unknown;
    };
    const email = typeof body.email === "string" ? body.email : "";
    const password = typeof body.password === "string" ? body.password : "";

    const result = await loginApprovedVendorForPos(email, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ok: true,
      token: result.token,
      expiresAt: result.expiresAt,
      email: result.email,
      displayName: result.displayName,
      connectAccountId: result.connectAccountId,
    });
  } catch (e) {
    console.error("[vendor/pos/mobile-login]", e);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}

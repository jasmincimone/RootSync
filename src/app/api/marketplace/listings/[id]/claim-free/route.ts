import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { claimFreeResourceListing } from "@/lib/freeResourceClaim";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/** POST — signed-in Member claims a $0 Resource (no Stripe). */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const limited = rateLimitResponse(request, "checkout", {
      message: "Too many download claims. Try again shortly.",
    });
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Sign in to download this free Resource.", code: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }

    const email = session.user.email?.trim();
    if (!email) {
      return NextResponse.json(
        { error: "Your account needs an email address to claim free Resources." },
        { status: 400 },
      );
    }

    const { id: listingId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const rawVariantId = body.variantId;
    const variantId = typeof rawVariantId === "string" ? rawVariantId.trim() : "";

    const result = await claimFreeResourceListing({
      listingId,
      userId: session.user.id,
      email,
      variantId: variantId || null,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[marketplace claim-free]", e);
    const message = e instanceof Error ? e.message : "Could not claim Resource.";
    if (message.includes("not free") || message.includes("not found") || message.includes("no downloadable")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

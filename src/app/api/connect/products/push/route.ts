import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { pushVendorOfferingsToStripe } from "@/lib/offeringStripeProduct";
import { prisma } from "@/lib/prisma";
import { VENDOR_STATUS } from "@/lib/roles";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * Push RootSync offerings to the vendor's Stripe connected-account Product catalog.
 * Opposite of /api/connect/products/sync (which pulls Stripe → RootSync).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const limited = rateLimitResponse(request, "upload", {
      userId,
      scope: "vendor-stripe-push",
      message: "Too many Stripe push requests. Try again shortly.",
    });
    if (limited) return limited;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeConnectAccountId: true,
        vendorProfile: { select: { id: true, status: true } },
      },
    });

    if (!user?.vendorProfile || user.vendorProfile.status !== VENDOR_STATUS.APPROVED) {
      return NextResponse.json({ error: "Approved vendor profile required." }, { status: 403 });
    }

    if (!user.stripeConnectAccountId) {
      return NextResponse.json(
        { error: "No Stripe Connect account linked. Connect Stripe in Payment Hub first." },
        { status: 400 },
      );
    }

    const summary = await pushVendorOfferingsToStripe(user.vendorProfile.id);

    const parts = [
      `${summary.pushed} created`,
      `${summary.updated} updated`,
      `${summary.skipped} skipped`,
    ];
    if (summary.failed > 0) {
      parts.push(`${summary.failed} failed`);
    }

    return NextResponse.json({
      ok: summary.failed === 0,
      accountId: user.stripeConnectAccountId,
      ...summary,
      message: `Pushed to Stripe (${user.stripeConnectAccountId}): ${parts.join(", ")}.`,
      ...(summary.errors.length > 0 ? { errors: summary.errors.slice(0, 5) } : {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to push listings to Stripe.";
    console.error("[connect/products/push]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { syncConnectedAccountProductsToOfferings } from "@/lib/importStripeProduct";
import { prisma } from "@/lib/prisma";
import { VENDOR_STATUS } from "@/lib/roles";

export const runtime = "nodejs";

/**
 * Pull products from the vendor's Stripe connected account into RootSync offerings.
 * Use after creating products in the Stripe Dashboard, or to catch up if webhooks were missed.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stripeConnectAccountId: true,
        vendorProfile: { select: { status: true } },
      },
    });

    if (!user?.vendorProfile || user.vendorProfile.status !== VENDOR_STATUS.APPROVED) {
      return NextResponse.json({ error: "Approved vendor profile required." }, { status: 403 });
    }

    const accountId = user.stripeConnectAccountId;
    if (!accountId) {
      return NextResponse.json(
        { error: "No Stripe Connect account linked. Connect Stripe in Payment Hub first." },
        { status: 400 },
      );
    }

    const summary = await syncConnectedAccountProductsToOfferings({
      connectAccountId: accountId,
      includeInactive: true,
    });

    return NextResponse.json({
      ok: true,
      ...summary,
      message: `Synced from Stripe: ${summary.imported} new, ${summary.updated} updated, ${summary.skipped} skipped.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to sync Stripe products.";
    console.error("[connect/products/sync]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

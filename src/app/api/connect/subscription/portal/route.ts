import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { appBaseUrl, getConnectStripeClient } from "@/lib/stripeConnectDemo";

export const runtime = "nodejs";

/**
 * Creates a Billing Portal session so the connected account can manage their
 * platform subscription (upgrade / cancel / payment methods).
 *
 * Uses `customer_account` = connected account id (`acct_…`) for V2 accounts.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { stripeConnectAccountId: true },
    });
    const accountId = user?.stripeConnectAccountId;
    if (!accountId) {
      return NextResponse.json({ error: "No connected account mapped for this user." }, { status: 400 });
    }

    const baseUrl = appBaseUrl(request.nextUrl.origin);
    const stripeClient = getConnectStripeClient();
    const portal = await stripeClient.billingPortal.sessions.create({
      customer_account: accountId,
      return_url: `${baseUrl}/account/vendor/payments`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create billing portal session.";
    console.error("[connect/subscription/portal]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { appBaseUrl, getConnectStripeClient, requireEnv } from "@/lib/stripeConnectDemo";

export const runtime = "nodejs";

/**
 * Starts a hosted Checkout subscription session for the connected account.
 *
 * V2 tip: use `customer_account` with the connected account id (`acct_…`) —
 * do not invent a separate Customer id for this flow.
 *
 * PLACEHOLDER: set `PRICE_ID` in `.env.local` to a real recurring Price from your
 * Stripe Dashboard (Products → Price). Example: PRICE_ID=price_1ABC...
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

    // PLACEHOLDER — replace `price_...` in env with a real recurring price id.
    const priceId = requireEnv("PRICE_ID");
    if (!priceId.startsWith("price_") || priceId.includes("...")) {
      return NextResponse.json(
        {
          error:
            "PRICE_ID is missing or still a placeholder. Create a recurring Price in Stripe Dashboard, set PRICE_ID=price_… in .env.local, and restart the server.",
        },
        { status: 503 },
      );
    }

    const baseUrl = appBaseUrl(request.nextUrl.origin);
    const stripeClient = getConnectStripeClient();

    const checkout = await stripeClient.checkout.sessions.create({
      customer_account: accountId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/account/vendor/payments?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/account/vendor/payments?subscription=cancelled`,
    });

    return NextResponse.json({ url: checkout.url, id: checkout.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start subscription checkout.";
    console.error("[connect/subscription/checkout]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

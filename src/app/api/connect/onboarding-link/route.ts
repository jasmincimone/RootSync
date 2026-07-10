import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { appBaseUrl, getConnectStripeClient, stripeConnectErrorMessage } from "@/lib/stripeConnectDemo";

export const runtime = "nodejs";

/**
 * Creates a v2 Account Link for hosted onboarding.
 *
 * UI: Payment Hub "Onboard to collect payments" → this endpoint → Stripe hosted flow → return to Payment Hub.
 * Status after return is re-fetched via GET /api/connect/account (live from Stripe).
 */
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeConnectAccountId: true },
  });
  const accountId = user?.stripeConnectAccountId;
  if (!accountId) {
    return NextResponse.json(
      { error: "No connected account mapping found. Create a connected account first." },
      { status: 400 }
    );
  }

  const baseUrl = appBaseUrl(request.nextUrl.origin);
  let returnPath = "/account/vendor/payments";
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body?.returnPath === "string" && body.returnPath.startsWith("/account")) {
      returnPath = body.returnPath;
    }
  } catch {
    /* use default */
  }

  const stripeClient = getConnectStripeClient();
  try {
    // V2 accountLinks — account_onboarding for merchant + customer configurations.
    const accountLink = await stripeClient.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["merchant", "customer"],
          refresh_url: `${baseUrl}${returnPath}`,
          return_url: `${baseUrl}${returnPath}?stripe=return&accountId=${encodeURIComponent(accountId)}`,
        },
      },
    });

    const url =
      typeof accountLink.url === "string"
        ? accountLink.url
        : (accountLink as unknown as { URL?: string }).URL;
    if (!url) {
      return NextResponse.json(
        {
          error: "Stripe returned an account link without a URL. Check the API response in server logs.",
        },
        { status: 502 }
      );
    }
    return NextResponse.json({ url });
  } catch (err) {
    const msg = stripeConnectErrorMessage(err);
    const hint =
      err instanceof Stripe.errors.StripeError
        ? "If this persists, confirm STRIPE_SECRET_KEY is test/live to match the account, and that return URLs use the same host/port you are browsing (localhost:3001 vs NEXTAUTH_URL)."
        : undefined;
    const status =
      err instanceof Stripe.errors.StripeError &&
      typeof err.statusCode === "number" &&
      err.statusCode >= 400 &&
      err.statusCode < 600
        ? err.statusCode
        : 502;
    return NextResponse.json({ error: msg, hint }, { status });
  }
}

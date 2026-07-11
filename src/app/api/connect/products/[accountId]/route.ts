import { NextRequest, NextResponse } from "next/server";

import { getConnectStripeClient } from "@/lib/stripeConnectDemo";

export const runtime = "nodejs";

function connectDemoEnabled(): boolean {
  if (process.env.ENABLE_CONNECT_DEMO === "1") return true;
  return process.env.NODE_ENV === "development";
}

/**
 * Demo: list active products for a connected account.
 * Disabled in production unless ENABLE_CONNECT_DEMO=1.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
  if (!connectDemoEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { accountId: rawAccountId } = await params;
  const accountId = rawAccountId?.trim();
  if (!accountId?.startsWith("acct_")) {
    return NextResponse.json({ error: "Invalid connected account id." }, { status: 400 });
  }

  const stripeClient = getConnectStripeClient();
  const products = await stripeClient.products.list(
    {
      limit: 20,
      active: true,
      expand: ["data.default_price"],
    },
    {
      stripeAccount: accountId,
    },
  );

  return NextResponse.json({ accountId, products: products.data });
}

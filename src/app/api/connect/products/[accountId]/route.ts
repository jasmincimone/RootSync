import { NextRequest, NextResponse } from "next/server";

import { getConnectStripeClient } from "@/lib/stripeConnectDemo";

export const runtime = "nodejs";

/**
 * Public storefront endpoint: list active products for a connected account.
 *
 * NOTE: This demo uses raw `accountId` in URL. In production, map a stable
 * public slug/handle to account IDs so you do not expose internal identifiers.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> },
) {
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
    }
  );

  return NextResponse.json({ accountId, products: products.data });
}

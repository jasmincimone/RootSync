import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { isAdmin } from "@/lib/permissions";
import {
  appBaseUrl,
  getApplicationFeeCents,
  getConnectStripeClient,
} from "@/lib/stripeConnectDemo";
import { platformApplicationFeeCents } from "@/lib/platformFee";

export const runtime = "nodejs";

function connectDemoEnabled(): boolean {
  if (process.env.ENABLE_CONNECT_DEMO === "1") return true;
  return process.env.NODE_ENV === "development";
}

/**
 * Direct-charge Checkout Session on a connected account (demo / sample only).
 * Disabled in production unless ENABLE_CONNECT_DEMO=1. Prefer marketplace listing checkout.
 */
export async function POST(request: NextRequest) {
  if (!connectDemoEnabled()) {
    return NextResponse.json(
      { error: "Connect demo checkout is disabled in this environment." },
      { status: 404 },
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdmin(session)) {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const accountId = typeof body?.accountId === "string" ? body.accountId.trim() : "";
    const productId = typeof body?.productId === "string" ? body.productId.trim() : "";
    const quantity =
      typeof body?.quantity === "number"
        ? body.quantity
        : typeof body?.quantity === "string"
          ? Number.parseInt(body.quantity, 10)
          : 1;

    if (!accountId.startsWith("acct_")) {
      return NextResponse.json({ error: "Valid accountId is required." }, { status: 400 });
    }
    if (!productId) {
      return NextResponse.json({ error: "productId is required." }, { status: 400 });
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
      return NextResponse.json({ error: "quantity must be >= 1." }, { status: 400 });
    }

    const stripeClient = getConnectStripeClient();

    const product = await stripeClient.products.retrieve(
      productId,
      { expand: ["default_price"] },
      { stripeAccount: accountId },
    );

    const defaultPrice = product.default_price;
    if (!defaultPrice || typeof defaultPrice === "string") {
      return NextResponse.json(
        { error: "Product does not have an expanded default price. Set a default price first." },
        { status: 400 },
      );
    }
    if (!defaultPrice.unit_amount || !defaultPrice.currency) {
      return NextResponse.json(
        { error: "Default price is missing amount/currency." },
        { status: 400 },
      );
    }

    const lineTotal = defaultPrice.unit_amount * quantity;
    const applicationFeeAmount =
      body?.applicationFeeAmount != null
        ? getApplicationFeeCents(body.applicationFeeAmount)
        : platformApplicationFeeCents(lineTotal);

    const baseUrl = appBaseUrl(request.nextUrl.origin);

    const checkoutSession = await stripeClient.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: defaultPrice.currency,
              unit_amount: defaultPrice.unit_amount,
              product_data: {
                name: product.name,
                description: product.description || undefined,
              },
            },
            quantity,
          },
        ],
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
        },
        success_url: `${baseUrl}/connect-store/${accountId}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/connect-store/${accountId}`,
      },
      {
        stripeAccount: accountId,
      },
    );

    return NextResponse.json({ url: checkoutSession.url, id: checkoutSession.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session.";
    console.error("[connect/checkout]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

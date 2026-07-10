import { NextRequest, NextResponse } from "next/server";

import {
  appBaseUrl,
  getApplicationFeeCents,
  getConnectStripeClient,
} from "@/lib/stripeConnectDemo";

export const runtime = "nodejs";

/**
 * Direct-charge Checkout Session on a connected account.
 *
 * Flow:
 * 1. Retrieve product (+ default_price) with `{ stripeAccount }`.
 * 2. Create Checkout Session on that account with `payment_intent_data.application_fee_amount`
 *    so the platform monetizes the sale.
 * 3. Return the hosted Checkout URL.
 *
 * PLACEHOLDER: `STRIPE_SECRET_KEY` must be set. Optional body.applicationFeeAmount (cents);
 * defaults to 123¢ for the sample.
 */
export async function POST(request: NextRequest) {
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
    const applicationFeeAmount = getApplicationFeeCents(body?.applicationFeeAmount);

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

    // Load product from the connected account (Stripe-Account header).
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

    const baseUrl = appBaseUrl(request.nextUrl.origin);

    // Direct charge: session is created ON the connected account.
    const session = await stripeClient.checkout.sessions.create(
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
          // Platform application fee (sample default 123¢ unless overridden).
          application_fee_amount: applicationFeeAmount,
        },
        success_url: `${baseUrl}/connect-store/${accountId}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/connect-store/${accountId}`,
      },
      {
        stripeAccount: accountId,
      },
    );

    return NextResponse.json({ url: session.url, id: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session.";
    console.error("[connect/checkout]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

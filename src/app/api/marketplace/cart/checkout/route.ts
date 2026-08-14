import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import {
  createMarketplaceCartCheckout,
  type MarketplaceCartCheckoutItem,
} from "@/lib/marketplaceCheckout";
import { parseCheckoutFulfillmentMode } from "@/lib/checkoutFulfillment";
import { rateLimitResponse } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimitResponse(request, "checkout", {
      message: "Too many checkout attempts. Try again shortly.",
    });
    if (limited) return limited;

    const session = await getServerSession(authOptions);
    const body = await request.json().catch(() => ({}));
    const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
    const email = rawEmail || session?.user?.email?.trim() || "";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required for checkout. Sign in or enter your email." },
        { status: 400 },
      );
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items: MarketplaceCartCheckoutItem[] = rawItems.map((row: unknown) => {
      const item = (row && typeof row === "object" ? row : {}) as Record<string, unknown>;
      const quantity =
        typeof item.quantity === "number"
          ? item.quantity
          : typeof item.quantity === "string"
            ? Number.parseInt(item.quantity, 10)
            : 1;
      return {
        listingId: typeof item.listingId === "string" ? item.listingId.trim() : "",
        quantity,
        variantId: typeof item.variantId === "string" ? item.variantId.trim() : null,
        unitSelections: item.unitSelections,
      };
    });

    const result = await createMarketplaceCartCheckout({
      items,
      email,
      userId: session?.user?.id,
      origin: request.nextUrl.origin,
      fulfillmentMode: parseCheckoutFulfillmentMode(body.fulfillmentMode),
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[marketplace cart checkout]", e);
    const message = e instanceof Error ? e.message : "Checkout failed";
    if (message.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json(
        { error: "Payments are not configured on this server." },
        { status: 503 },
      );
    }
    if (
      /empty|invalid|available|vendor|quantity|option|deal|cart|book or buy|sold out|stock|pickup|ship|deliver|choose/i.test(
        message,
      )
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message.includes("not ready to accept card payments")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

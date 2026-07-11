import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import {
  createMarketplaceListingCheckout,
  loadListingForCheckout,
} from "@/lib/marketplaceCheckout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id: listingId } = await context.params;
    const session = await getServerSession(authOptions);

    const body = await request.json().catch(() => ({}));
    const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
    const email = rawEmail || session?.user?.email?.trim() || "";
    const quantity =
      typeof body.quantity === "number"
        ? body.quantity
        : typeof body.quantity === "string"
          ? Number.parseInt(body.quantity, 10)
          : 1;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required for checkout. Sign in or enter your email." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 99) {
      return NextResponse.json({ error: "Quantity must be between 1 and 99." }, { status: 400 });
    }

    const rawVariantId = body.variantId;
    const variantId = typeof rawVariantId === "string" ? rawVariantId.trim() : "";

    const listing = await loadListingForCheckout(listingId);
    if (!listing) {
      return NextResponse.json({ error: "Listing not found or not available." }, { status: 404 });
    }

    const result = await createMarketplaceListingCheckout({
      listing,
      quantity,
      email,
      userId: session?.user?.id,
      origin: request.nextUrl.origin,
      variantId: variantId || null,
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[marketplace listing checkout]", e);
    const message = e instanceof Error ? e.message : "Checkout failed";
    if (message.includes("STRIPE_SECRET_KEY")) {
      return NextResponse.json(
        { error: "Payments are not configured on this server." },
        { status: 503 },
      );
    }
    if (message.includes("not ready to accept card payments")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

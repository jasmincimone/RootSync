import { NextRequest, NextResponse } from "next/server";
import { getMergedProductForCheckout } from "@/lib/shopCatalog";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

const SHIPPING_CENTS = 599;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, shippingAddress, items } = body as {
      email: string;
      shippingAddress?: {
        name: string;
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
      };
      items: Array<{ productId: string; quantity: number; selections?: Record<string, string> }>;
    };

    if (!email?.trim() || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Missing email or items" }, { status: 400 });
    }

    const lineItems: Array<{
      product: NonNullable<Awaited<ReturnType<typeof getMergedProductForCheckout>>>;
      quantity: number;
      selections?: Record<string, string>;
      displayName: string;
    }> = [];

    for (const { productId, quantity, selections } of items) {
      const product = await getMergedProductForCheckout(productId);
      if (!product || quantity < 1) continue;
      const selectionLabels =
        product.options?.map((opt) => {
          const choiceId = selections?.[opt.id];
          if (!choiceId) return null;
          const choice = opt.choices.find((c) => c.id === choiceId);
          if (!choice) return null;
          return `${opt.label}: ${choice.label}`;
        }) ?? [];
      const selectionSuffix = selectionLabels.filter(Boolean).join(" • ");
      const displayName = selectionSuffix ? `${product.name} — ${selectionSuffix}` : product.name;
      lineItems.push({ product, quantity, selections, displayName });
    }

    if (lineItems.length === 0) {
      return NextResponse.json({ error: "No valid items" }, { status: 400 });
    }

    const hasPhysical = lineItems.some((l) => l.product?.type === "physical");
    if (hasPhysical && !shippingAddress?.line1) {
      return NextResponse.json({ error: "Shipping address required for physical items" }, { status: 400 });
    }

    const subtotalCents = lineItems.reduce((s, l) => s + (l.product?.price ?? 0) * l.quantity, 0);
    const shippingCents = hasPhysical ? SHIPPING_CENTS : 0;
    const totalCents = subtotalCents + shippingCents;

    const order = await prisma.order.create({
      data: {
        email: email.trim(),
        status: "pending",
        subtotalCents,
        shippingCents,
        totalCents,
        ...(hasPhysical &&
          shippingAddress && {
            shippingName: shippingAddress.name,
            shippingLine1: shippingAddress.line1,
            shippingLine2: shippingAddress.line2 ?? null,
            shippingCity: shippingAddress.city,
            shippingState: shippingAddress.state,
            shippingPostal: shippingAddress.postalCode,
            shippingCountry: shippingAddress.country,
          }),
        items: {
          create: lineItems.map((l) => ({
            productId: l.product!.id,
            name: l.displayName,
            quantity: l.quantity,
            priceCents: l.product!.price,
            type: l.product!.type,
            format: l.product!.format ?? null,
          })),
        },
      },
      include: { items: true },
    });

    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email.trim(),
      metadata: { orderId: order.id },
      line_items: lineItems.map((l) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: l.displayName,
            description: l.product!.summary || undefined,
            images: l.product!.image ? [new URL(l.product!.image, baseUrl).href] : undefined,
          },
          unit_amount: l.product!.price,
        },
        quantity: l.quantity,
      })),
      ...(hasPhysical && {
        shipping_address_collection: { allowed_countries: ["US", "CA"] },
      }),
      success_url: `${baseUrl}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cart`,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url, orderId: order.id });
  } catch (err) {
    console.error("Checkout session error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

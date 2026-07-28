import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { getConnectStripeClient } from "@/lib/stripeConnectDemo";
import { requireVendorPosContext } from "@/lib/vendorPos";

export const runtime = "nodejs";

/** Confirm a POS order is paid (Checkout session or PaymentIntent). */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gate = await requireVendorPosContext(session.user.id);
    if (!gate.ok) {
      return NextResponse.json({ error: gate.error }, { status: gate.status });
    }

    const orderId = request.nextUrl.searchParams.get("orderId")?.trim();
    const sessionId = request.nextUrl.searchParams.get("session_id")?.trim();
    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    let order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: session.user.id,
      },
      select: {
        id: true,
        status: true,
        totalCents: true,
        stripeSessionId: true,
        stripePaymentIntent: true,
      },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "paid" && (sessionId || order.stripeSessionId || order.stripePaymentIntent)) {
      const stripe = getConnectStripeClient();
      if (sessionId || order.stripeSessionId) {
        const cs = await stripe.checkout.sessions.retrieve(sessionId || order.stripeSessionId!);
        if (cs.payment_status === "paid") {
          const pi =
            typeof cs.payment_intent === "string"
              ? cs.payment_intent
              : cs.payment_intent?.id ?? null;
          order = await prisma.order.update({
            where: { id: order.id },
            data: {
              status: "paid",
              stripeSessionId: cs.id,
              ...(pi ? { stripePaymentIntent: pi } : {}),
            },
            select: {
              id: true,
              status: true,
              totalCents: true,
              stripeSessionId: true,
              stripePaymentIntent: true,
            },
          });
        }
      } else if (order.stripePaymentIntent) {
        const pi = await stripe.paymentIntents.retrieve(order.stripePaymentIntent);
        if (pi.status === "succeeded") {
          order = await prisma.order.update({
            where: { id: order.id },
            data: { status: "paid", stripePaymentIntent: pi.id },
            select: {
              id: true,
              status: true,
              totalCents: true,
              stripeSessionId: true,
              stripePaymentIntent: true,
            },
          });
        }
      }
    }

    return NextResponse.json({ ok: true, order });
  } catch (e) {
    console.error("[vendor/pos/status]", e);
    return NextResponse.json({ error: "Could not load POS status." }, { status: 500 });
  }
}

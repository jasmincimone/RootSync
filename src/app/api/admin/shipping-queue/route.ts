import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { isAdmin } from "@/lib/permissions";
import { formatPrice } from "@/lib/format";
import {
  listRecentlyShippedOrders,
  listShippableOrders,
} from "@/lib/shippingFulfillment";

function serializeOrder(
  order: Awaited<ReturnType<typeof listShippableOrders>>[number],
) {
  const vendorName =
    order.items.map((i) => i.listing?.vendorProfile.displayName).find(Boolean) ?? null;
  return {
    id: order.id,
    email: order.email,
    status: order.status,
    totalCents: order.totalCents,
    shippingCents: order.shippingCents,
    totalLabel: formatPrice(order.totalCents),
    shippingLabel: formatPrice(order.shippingCents),
    shippingName: order.shippingName,
    shippingLine1: order.shippingLine1,
    shippingLine2: order.shippingLine2,
    shippingCity: order.shippingCity,
    shippingState: order.shippingState,
    shippingPostal: order.shippingPostal,
    shippingCountry: order.shippingCountry,
    createdAt: order.createdAt.toISOString(),
    shippedAt: order.shippedAt?.toISOString() ?? null,
    vendorName,
    items: order.items.map((i) => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
    })),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [queue, shipped] = await Promise.all([
    listShippableOrders(),
    listRecentlyShippedOrders(),
  ]);

  return NextResponse.json({
    queue: queue.map(serializeOrder),
    shipped: shipped.map(serializeOrder),
  });
}

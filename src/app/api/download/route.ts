import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { resolveResourceDelivery } from "@/lib/resourceDelivery";
import { isResourceOrderItem } from "@/lib/roles";

/**
 * GET /api/download?orderId=...&itemId=...
 * Requires a signed-in Member who owns the paid order, then streams the file.
 */
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId");
  const itemId = request.nextUrl.searchParams.get("itemId");
  if (!orderId || !itemId) {
    return NextResponse.json({ error: "Missing orderId or itemId" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Sign in to download this resource.", code: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId },
    include: {
      items: {
        include: {
          listing: {
            include: {
              offering: { include: { resourceDetails: true } },
            },
          },
        },
      },
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (order.status !== "paid") {
    return NextResponse.json({ error: "Order not paid" }, { status: 403 });
  }

  const ownsOrder =
    order.userId === session.user.id ||
    (!!session.user.email &&
      !!order.email &&
      order.email.toLowerCase() === session.user.email.toLowerCase());
  if (!ownsOrder) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const item = order.items.find((i) => i.id === itemId);
  if (!item || !isResourceOrderItem(item.type)) {
    return NextResponse.json({ error: "Item not found or not a resource" }, { status: 404 });
  }

  const fileRef = item.listing?.offering.resourceDetails?.fileUrl?.trim();
  if (!fileRef) {
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const orderPageUrl = new URL(`/account/orders/${orderId}`, baseUrl);
    orderPageUrl.searchParams.set("resource", "pending");
    return NextResponse.redirect(orderPageUrl);
  }

  const delivery = await resolveResourceDelivery(fileRef);
  if ("error" in delivery) {
    if (delivery.error === "external" && /^https?:\/\//i.test(fileRef)) {
      return NextResponse.redirect(fileRef);
    }

    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const orderPageUrl = new URL(`/account/orders/${orderId}`, baseUrl);
    orderPageUrl.searchParams.set("resource", "unavailable");
    return NextResponse.redirect(orderPageUrl);
  }

  const body =
    delivery.body instanceof ReadableStream
      ? delivery.body
      : new Blob([delivery.body], { type: delivery.contentType });

  return new NextResponse(body, {
    headers: {
      "Content-Type": delivery.contentType,
      "Content-Disposition": `attachment; filename="${delivery.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

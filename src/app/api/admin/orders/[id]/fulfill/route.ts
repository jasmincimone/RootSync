import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { isAdmin } from "@/lib/permissions";
import { markOrderShipped } from "@/lib/shippingFulfillment";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  }

  const ok = await markOrderShipped(id.trim());
  if (!ok) {
    return NextResponse.json(
      { error: "Order not found, already shipped, or not paid." },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}

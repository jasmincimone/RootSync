import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import { createGrowthFunnel, listGrowthFunnels } from "@/lib/growth/funnels";

export async function GET() {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const funnels = await listGrowthFunnels(auth.ctx.vendorProfileId, auth.ctx.isPlatformScope);
  return NextResponse.json({ funnels });
}

export async function POST(request: NextRequest) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const funnel = await createGrowthFunnel({
    vendorProfileId: auth.ctx.vendorProfileId,
    name,
    description: typeof body?.description === "string" ? body.description : null,
    objective: typeof body?.objective === "string" ? body.objective : null,
  });

  return NextResponse.json({ funnel }, { status: 201 });
}

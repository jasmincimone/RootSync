import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import {
  deleteGrowthFunnel,
  getGrowthFunnelForWorkspace,
  updateGrowthFunnel,
} from "@/lib/growth/funnels";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const funnel = await getGrowthFunnelForWorkspace(
    id,
    auth.ctx.vendorProfileId,
    auth.ctx.isPlatformScope,
  );
  if (!funnel) {
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
  }
  return NextResponse.json({ funnel });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const funnel = await updateGrowthFunnel(id, auth.ctx.vendorProfileId, auth.ctx.isPlatformScope, {
    name: typeof body?.name === "string" ? body.name : undefined,
    description:
      body?.description === null || typeof body?.description === "string"
        ? body.description
        : undefined,
    objective:
      body?.objective === null || typeof body?.objective === "string" ? body.objective : undefined,
    isActive: typeof body?.isActive === "boolean" ? body.isActive : undefined,
  });

  if (!funnel) {
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
  }
  return NextResponse.json({ funnel });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = await deleteGrowthFunnel(id, auth.ctx.vendorProfileId, auth.ctx.isPlatformScope);
  if (!ok) {
    return NextResponse.json({ error: "Funnel not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

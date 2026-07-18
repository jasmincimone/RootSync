import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import {
  deleteGrowthCampaign,
  getGrowthCampaignForWorkspace,
  sendGrowthCampaign,
  updateGrowthCampaign,
} from "@/lib/growth/campaigns";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const campaign = await getGrowthCampaignForWorkspace(
    id,
    auth.ctx.vendorProfileId,
    auth.ctx.isPlatformScope,
  );
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  return NextResponse.json({ campaign });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (body?.action === "send") {
    const result = await sendGrowthCampaign(
      id,
      auth.ctx.vendorProfileId,
      auth.ctx.isPlatformScope,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ sentCount: result.sentCount });
  }

  const updated = await updateGrowthCampaign(
    id,
    auth.ctx.vendorProfileId,
    auth.ctx.isPlatformScope,
    {
      name: typeof body?.name === "string" ? body.name : undefined,
      subject:
        body?.subject === null || typeof body?.subject === "string" ? body.subject : undefined,
      bodyHtml:
        body?.bodyHtml === null || typeof body?.bodyHtml === "string" ? body.bodyHtml : undefined,
    },
  );

  if (!updated) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if ("error" in updated) {
    return NextResponse.json({ error: updated.error }, { status: 400 });
  }
  return NextResponse.json({ campaign: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = await deleteGrowthCampaign(id, auth.ctx.vendorProfileId, auth.ctx.isPlatformScope);
  if (!ok) {
    return NextResponse.json({ error: "Campaign not found or already sent" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import { createGrowthCampaign, listGrowthCampaigns } from "@/lib/growth/campaigns";

export async function GET() {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const campaigns = await listGrowthCampaigns(auth.ctx.vendorProfileId, auth.ctx.isPlatformScope);
  return NextResponse.json({ campaigns });
}

export async function POST(request: NextRequest) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const campaign = await createGrowthCampaign({
    vendorProfileId: auth.ctx.vendorProfileId,
    name,
    subject: typeof body?.subject === "string" ? body.subject : null,
    bodyHtml: typeof body?.bodyHtml === "string" ? body.bodyHtml : null,
  });

  return NextResponse.json({ campaign }, { status: 201 });
}

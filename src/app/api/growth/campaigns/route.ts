import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import { createGrowthCampaign, listGrowthCampaigns } from "@/lib/growth/campaigns";
import { isCampaignObjective } from "@/lib/growth/campaignTypes";

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
  const objective = isCampaignObjective(body?.objective) ? body.objective : null;
  if (!name && !objective) {
    return NextResponse.json({ error: "Choose an objective or enter a name." }, { status: 400 });
  }

  const campaign = await createGrowthCampaign({
    vendorProfileId: auth.ctx.vendorProfileId,
    name: name || undefined,
    objective,
  });

  return NextResponse.json({ campaign }, { status: 201 });
}

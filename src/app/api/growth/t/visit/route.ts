import { NextRequest, NextResponse } from "next/server";

import { isCampaignTrackingToken, recordCampaignVisit } from "@/lib/growth/campaignTracking";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body?.token === "string" ? body.token.trim() : "";
  const funnelId = typeof body?.funnelId === "string" ? body.funnelId : null;
  if (!isCampaignTrackingToken(token)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  await recordCampaignVisit(token, funnelId);
  return NextResponse.json({ ok: true });
}

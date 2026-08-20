import { NextRequest, NextResponse } from "next/server";

import { sendDueScheduledCampaigns } from "@/lib/growth/campaigns";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await sendDueScheduledCampaigns();
  return NextResponse.json({ ok: true, ...result });
}

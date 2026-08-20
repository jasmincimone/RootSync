import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { getGrowthApiContext } from "@/lib/growth/apiContext";
import { sendCampaignTestEmail } from "@/lib/growth/campaigns";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const toEmail =
    (typeof body?.toEmail === "string" && body.toEmail.trim()) ||
    session?.user?.email?.trim() ||
    "";

  const result = await sendCampaignTestEmail({
    campaignId: id,
    vendorProfileId: auth.ctx.vendorProfileId,
    isPlatformScope: auth.ctx.isPlatformScope,
    toEmail,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, toEmail });
}

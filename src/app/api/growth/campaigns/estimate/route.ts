import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import { estimateCampaignAudience } from "@/lib/growth/campaigns";
import { isCampaignAudienceType } from "@/lib/growth/campaignTypes";
import { GROWTH_CAMPAIGN_AUDIENCE } from "@/lib/growth/roles";

export async function POST(request: NextRequest) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const audienceType = isCampaignAudienceType(body?.audienceType)
    ? body.audienceType
    : GROWTH_CAMPAIGN_AUDIENCE.ALL;
  const result = await estimateCampaignAudience(
    auth.ctx.vendorProfileId,
    auth.ctx.isPlatformScope,
    audienceType,
    body?.audienceJson,
  );
  return NextResponse.json({
    estimatedRecipients: result.contacts.length,
    skippedUnsubscribed: result.skippedUnsubscribed,
    skippedInvalid: result.skippedInvalid,
    skippedNoMarketingOptIn: result.skippedNoMarketingOptIn,
  });
}

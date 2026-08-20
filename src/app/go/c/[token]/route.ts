import { NextRequest, NextResponse } from "next/server";

import { campaignCookieOptions } from "@/lib/growth/campaignAttribution";
import { recordCampaignClick } from "@/lib/growth/campaignTracking";
import { CAMPAIGN_COOKIE, isHttpUrl, withCampaignQuery } from "@/lib/growth/campaignTypes";

type Params = { params: Promise<{ token: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { token } = await params;
  const result = await recordCampaignClick(token);
  const fallback = new URL("/", request.nextUrl.origin);
  if (!result?.destinationUrl) {
    return NextResponse.redirect(fallback);
  }

  const destination = isHttpUrl(result.destinationUrl)
    ? result.destinationUrl
    : new URL(result.destinationUrl, request.nextUrl.origin).toString();
  const tracked = withCampaignQuery(destination, token);
  const response = NextResponse.redirect(tracked);
  response.cookies.set(CAMPAIGN_COOKIE, token, campaignCookieOptions());
  response.headers.set("Cache-Control", "no-store");
  return response;
}

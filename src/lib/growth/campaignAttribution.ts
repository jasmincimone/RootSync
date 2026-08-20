import type { NextRequest } from "next/server";

import { CAMPAIGN_COOKIE, CAMPAIGN_QUERY } from "@/lib/growth/campaignTypes";
import { isCampaignTrackingToken, recordCampaignCheckoutStart } from "@/lib/growth/campaignTracking";

export function campaignTokenFromRequest(request: NextRequest): string | null {
  const query = request.nextUrl.searchParams.get(CAMPAIGN_QUERY)?.trim() ?? "";
  if (isCampaignTrackingToken(query)) return query;
  const cookie = request.cookies.get(CAMPAIGN_COOKIE)?.value?.trim() ?? "";
  if (isCampaignTrackingToken(cookie)) return cookie;
  return null;
}

export function campaignCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function campaignCheckoutMetadata(token: string | null | undefined): Promise<Record<string, string>> {
  if (!isCampaignTrackingToken(token)) return {};
  await recordCampaignCheckoutStart(token).catch(() => undefined);
  return { campaignToken: token };
}

import { NextRequest, NextResponse } from "next/server";

import { recordCampaignOpen } from "@/lib/growth/campaignTracking";

type Params = { params: Promise<{ token: string }> };

const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",
  "base64",
);

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;
  await recordCampaignOpen(token).catch(() => false);
  return new NextResponse(PIXEL, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, private",
      "Content-Length": String(PIXEL.length),
    },
  });
}

import { NextRequest, NextResponse } from "next/server";

import { publishDueScheduledOfferings } from "@/lib/publishScheduledOfferings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Vercel Cron: publishes offerings where status=SCHEDULED and scheduledPublishAt <= now */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await publishDueScheduledOfferings(prisma);
  return NextResponse.json({ ok: true, ...result });
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { loadPulseEarnedSince } from "@/lib/pulse/earnedEvents";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sinceParam = req.nextUrl.searchParams.get("since");
  const exclude = req.nextUrl.searchParams.get("exclude")?.split(",").filter(Boolean) ?? [];

  const since = sinceParam ? new Date(sinceParam) : new Date(Date.now() - 30_000);
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json({ error: "Invalid since" }, { status: 400 });
  }

  const events = await loadPulseEarnedSince(session.user.id, since, exclude);
  return NextResponse.json({ events });
}

import { NextRequest, NextResponse } from "next/server";

import { requireSessionUserId, togglePulseReaction } from "@/lib/pulse/reactions";

export async function POST(request: NextRequest) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to give a Pulse" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const postId = typeof body?.postId === "string" ? body.postId.trim() : "";
  if (!postId) {
    return NextResponse.json({ error: "postId is required" }, { status: 400 });
  }

  const result = await togglePulseReaction(postId, userId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ given: result.given, count: result.count });
}

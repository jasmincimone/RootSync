import { NextRequest, NextResponse } from "next/server";

import {
  isFavoriteTargetType,
  listSavedFavorites,
  requireSessionUserId,
  toggleFavorite,
} from "@/lib/favorites";
import { clientIpFromRequest, rateLimit } from "@/lib/rateLimit";

export async function GET() {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to view your favorites" }, { status: 401 });
  }

  const favorites = await listSavedFavorites(userId);
  return NextResponse.json({ favorites });
}

export async function POST(request: NextRequest) {
  const userId = await requireSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to add favorites" }, { status: 401 });
  }

  const limited = rateLimit({
    key: `favorites:${userId}:${clientIpFromRequest(request)}`,
    limit: 60,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const body = await request.json().catch(() => ({}));
  const targetTypeRaw = typeof body?.targetType === "string" ? body.targetType.trim() : "";
  const targetId = typeof body?.targetId === "string" ? body.targetId.trim() : "";

  if (!isFavoriteTargetType(targetTypeRaw)) {
    return NextResponse.json(
      { error: "targetType must be LISTING, VENDOR, or DIRECTORY" },
      { status: 400 },
    );
  }
  if (!targetId) {
    return NextResponse.json({ error: "targetId is required" }, { status: 400 });
  }

  const result = await toggleFavorite(userId, targetTypeRaw, targetId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ saved: result.saved });
}

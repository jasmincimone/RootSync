import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import { searchGrowthWorkspace } from "@/lib/growth/workspaceSearch";

export async function GET(request: NextRequest) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 1) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchGrowthWorkspace({
    vendorProfileId: auth.ctx.vendorProfileId,
    isPlatformScope: auth.ctx.isPlatformScope,
    query: q,
  });

  return NextResponse.json({ results });
}

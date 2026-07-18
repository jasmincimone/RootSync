import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/authOptions";
import {
  requireGrowthWorkspace,
  type GrowthWorkspaceContext,
} from "@/lib/growthAccess";

export async function getGrowthApiContext(): Promise<
  | { ok: true; ctx: GrowthWorkspaceContext }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) {
    return {
      ok: false,
      response: NextResponse.json({ error: ctx.error }, { status: 403 }),
    };
  }
  return { ok: true, ctx };
}

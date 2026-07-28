import { getServerSession } from "next-auth";
import type { NextRequest } from "next/server";

import { authOptions } from "@/lib/authOptions";
import { resolvePosUserId } from "@/lib/posMobileAuth";

/** Cookie session (web) or Bearer POS token (M2 companion app). */
export async function requirePosRequestUserId(request: NextRequest): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return resolvePosUserId({
    sessionUserId: session?.user?.id,
    authorizationHeader: request.headers.get("authorization"),
  });
}

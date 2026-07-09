import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * After adding Prisma models, the dev server can still hold an old PrismaClient in memory
 * until you run `npx prisma generate` and restart `npm run dev`. This detects a missing delegate.
 */
export function rootSyncPrismaReady():
  | { ok: true }
  | { ok: false; response: NextResponse } {
  const delegate = (prisma as unknown as { rootSyncConversation?: { create: unknown } })
    .rootSyncConversation;
  if (!delegate || typeof delegate.create !== "function") {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "RootSync storage is not ready. Run `npx prisma generate`, then fully restart the dev server (stop and start `npm run dev`). If you haven't migrated yet, run `npx prisma migrate dev`.",
        },
        { status: 503 }
      ),
    };
  }
  return { ok: true };
}

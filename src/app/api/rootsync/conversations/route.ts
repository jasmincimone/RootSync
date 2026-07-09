import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { rootSyncPrismaReady } from "@/lib/ensureRootSyncPrisma";
import { withPrismaRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ready = rootSyncPrismaReady();
  if (!ready.ok) return ready.response;

  try {
    const conversations = await withPrismaRetry((client) =>
      client.rootSyncConversation.findMany({
        where: { userId: session.user.id },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, updatedAt: true },
      })
    );

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        ...c,
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    console.error("RootSense conversations list error:", e);
    return NextResponse.json(
      { error: "Could not load conversations. Try again in a moment." },
      { status: 503 }
    );
  }
}

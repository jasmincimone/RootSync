import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { rootSyncPrismaReady } from "@/lib/ensureRootSyncPrisma";
import { withPrismaRetry } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ready = rootSyncPrismaReady();
  if (!ready.ok) return ready.response;

  const { id } = await context.params;

  try {
    const conv = await withPrismaRetry((client) =>
      client.rootSyncConversation.findFirst({
        where: { id, userId: session.user.id },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: { role: true, content: true },
          },
        },
      })
    );

    if (!conv) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      conversation: {
        id: conv.id,
        title: conv.title,
        updatedAt: conv.updatedAt.toISOString(),
      },
      messages: conv.messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });
  } catch (e) {
    console.error("RootSense conversation load error:", e);
    return NextResponse.json(
      { error: "Could not load conversation. Try again in a moment." },
      { status: 503 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ready = rootSyncPrismaReady();
  if (!ready.ok) return ready.response;

  const { id } = await context.params;

  try {
    const result = await withPrismaRetry((client) =>
      client.rootSyncConversation.deleteMany({
        where: { id, userId: session.user.id },
      })
    );

    if (result.count === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("RootSense conversation delete error:", e);
    return NextResponse.json(
      { error: "Could not delete conversation. Try again in a moment." },
      { status: 503 }
    );
  }
}

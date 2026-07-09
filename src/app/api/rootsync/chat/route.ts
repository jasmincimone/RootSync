import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { rootSyncPrismaReady } from "@/lib/ensureRootSyncPrisma";
import { withPrismaRetry } from "@/lib/prisma";
import { formatAssistantError } from "@/lib/rootsenseChatErrors";
import { ROOTSENSE_SYSTEM_PROMPT } from "@/lib/rootsenseSystemPrompt";

const MAX_MESSAGES = 24;
const MAX_CONTENT = 8000;

type ChatRole = "user" | "assistant";

function deriveTitle(firstUserMessage: string): string {
  const t = firstUserMessage.trim().replace(/\s+/g, " ");
  if (!t) return "New chat";
  if (t.length <= 72) return t;
  return `${t.slice(0, 72)}…`;
}

async function completeChat(
  apiKey: string,
  messages: { role: ChatRole; content: string }[]
): Promise<string> {
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const openai = new OpenAI({ apiKey });
  if (typeof openai.chat?.completions?.create !== "function") {
    throw new Error(
      "OpenAI client is incomplete (missing chat.completions). Try reinstalling: npm install openai"
    );
  }
  const completion = await openai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: ROOTSENSE_SYSTEM_PROMPT },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    max_tokens: 2048,
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("No response from the model.");
  }
  return text;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return NextResponse.json(
      {
        error: "RootSense AI is not configured yet. Add OPENAI_API_KEY to your environment.",
        hint:
          "Local: put OPENAI_API_KEY in .env.local at the project root, then restart the dev server (env is read at startup). Production: add OPENAI_API_KEY in your host's environment (e.g. Vercel → Project → Settings → Environment Variables) and redeploy. Use the exact name OPENAI_API_KEY (server-only; do not use NEXT_PUBLIC_).",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "RootSense AI is for RootSync members. Sign up or sign in to chat with Rootie.",
      },
      { status: 401 }
    );
  }

  if (typeof (body as { message?: unknown }).message !== "string") {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  const ready = rootSyncPrismaReady();
  if (!ready.ok) return ready.response;

  const userId = session.user.id;
  const userMessage = (body as { message: string }).message.trim();
  const rawConvId = (body as { conversationId?: unknown }).conversationId;
  const conversationId =
    typeof rawConvId === "string" && rawConvId.trim() !== "" ? rawConvId.trim() : null;

  if (!userMessage) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }
  if (userMessage.length > MAX_CONTENT) {
    return NextResponse.json({ error: "Message too long." }, { status: 400 });
  }

  try {
    let convId: string;
    let priorForModel: { role: ChatRole; content: string }[] = [];

    if (conversationId) {
      const existing = await withPrismaRetry((client) =>
        client.rootSyncConversation.findFirst({
          where: { id: conversationId, userId },
          include: {
            messages: { orderBy: { createdAt: "asc" }, select: { role: true, content: true } },
          },
        })
      );
      if (!existing) {
        return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
      }
      convId = existing.id;
      priorForModel = existing.messages.map((m) => ({
        role: m.role as ChatRole,
        content: m.content,
      }));
    } else {
      const created = await withPrismaRetry((client) =>
        client.rootSyncConversation.create({
          data: {
            userId,
            title: deriveTitle(userMessage),
          },
        })
      );
      convId = created.id;
    }

    const maxPrior = Math.max(0, MAX_MESSAGES - 1);
    if (priorForModel.length > maxPrior) {
      priorForModel = priorForModel.slice(-maxPrior);
    }
    const messagesForOpenAI: { role: ChatRole; content: string }[] = [
      ...priorForModel,
      { role: "user", content: userMessage },
    ];

    await withPrismaRetry((client) =>
      client.rootSyncMessage.create({
        data: {
          conversationId: convId,
          role: "user",
          content: userMessage,
        },
      })
    );

    const assistantText = await completeChat(apiKey, messagesForOpenAI);

    await withPrismaRetry((client) =>
      client.rootSyncMessage.create({
        data: {
          conversationId: convId,
          role: "assistant",
          content: assistantText,
        },
      })
    );

    await withPrismaRetry((client) =>
      client.rootSyncConversation.update({
        where: { id: convId },
        data: { updatedAt: new Date() },
      })
    );

    return NextResponse.json({
      message: assistantText,
      conversationId: convId,
    });
  } catch (e) {
    console.error("RootSense persist chat error:", e);
    return NextResponse.json({ error: formatAssistantError(e) }, { status: 502 });
  }
}

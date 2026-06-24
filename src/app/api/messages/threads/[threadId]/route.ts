import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

const MAX_BODY = 8000;

const peerSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  vendorProfile: { select: { displayName: true, status: true } },
} as const;

function peerDisplayName(peer: {
  name: string | null;
  email: string | null;
  vendorProfile: { displayName: string } | null;
}): string {
  return (
    peer.vendorProfile?.displayName ??
    peer.name ??
    peer.email?.split("@")[0] ??
    "Member"
  );
}

function peerSubtitle(peer: {
  role: string;
  vendorProfile: { status: string } | null;
}): string {
  if (peer.role === ROLES.ADMIN) return "Admin";
  const st = peer.vendorProfile?.status;
  if (st === VENDOR_STATUS.APPROVED) return "Marketplace vendor";
  return "Community member";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;
  const { threadId } = await params;

  let thread;
  try {
    thread = await prisma.directThread.findFirst({
      where: {
        id: threadId,
        OR: [{ participantLowId: uid }, { participantHighId: uid }],
      },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 300,
          select: {
            id: true,
            senderId: true,
            body: true,
            createdAt: true,
          },
        },
        participantLow: { select: peerSelect },
        participantHigh: { select: peerSelect },
      },
    });
  } catch (e) {
    console.error("[messages/thread GET]", e);
    return NextResponse.json({ error: "Could not load conversation." }, { status: 500 });
  }

  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isViewerLow = thread.participantLowId === uid;
  const peer = isViewerLow ? thread.participantHigh : thread.participantLow;
  const readNow = new Date();
  try {
    await prisma.directThread.update({
      where: { id: threadId },
      data: isViewerLow
        ? { participantLowLastReadAt: readNow }
        : { participantHighLastReadAt: readNow },
    });
  } catch (e) {
    console.error("[messages/thread GET mark read]", e);
  }

  return NextResponse.json(
    {
      thread: {
        id: thread.id,
        participantLowId: thread.participantLowId,
        participantHighId: thread.participantHighId,
        peerDisplayName: peerDisplayName(peer),
        peerSubtitle: peerSubtitle(peer),
        viewerIsParticipantLow: isViewerLow,
      },
      messages: thread.messages.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store, must-revalidate" } }
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;
  const { threadId } = await params;

  let body: { body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.body?.trim() ?? "";
  if (!text) {
    return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
  }
  if (text.length > MAX_BODY) {
    return NextResponse.json(
      { error: `Message too long (max ${MAX_BODY} characters)` },
      { status: 400 }
    );
  }

  let thread;
  try {
    thread = await prisma.directThread.findFirst({
      where: {
        id: threadId,
        OR: [{ participantLowId: uid }, { participantHighId: uid }],
      },
    });
  } catch (e) {
    console.error("[messages/thread POST find]", e);
    return NextResponse.json({ error: "Could not send message." }, { status: 500 });
  }

  if (!thread) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const now = new Date();
  let msg;
  try {
    msg = await prisma.directMessage.create({
      data: {
        threadId,
        senderId: uid,
        body: text,
      },
    });

    const isSenderLow = uid === thread.participantLowId;
    await prisma.directThread.update({
      where: { id: threadId },
      data: {
        lastMessageAt: now,
        ...(isSenderLow
          ? { participantLowLastReadAt: now }
          : { participantHighLastReadAt: now }),
      },
    });
  } catch (e) {
    console.error("[messages/thread POST create]", e);
    return NextResponse.json({ error: "Could not send message." }, { status: 500 });
  }

  return NextResponse.json({
    message: {
      id: msg.id,
      senderId: msg.senderId,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
    },
  });
}

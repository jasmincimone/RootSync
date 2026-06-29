import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/authOptions";
import { isThreadUnreadForViewer } from "@/lib/directMessageUnread";
import { orderedParticipantIds } from "@/lib/participantPair";
import { prisma } from "@/lib/prisma";
import { VENDOR_STATUS } from "@/lib/roles";
import {
  messengerPeerSelect,
  peerSubtitle,
  publicProfileHref,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
  type UserProfilePeer,
} from "@/lib/userProfileDisplay";

const messageSenderSelect = messengerPeerSelect;

function serializePeer(peer: UserProfilePeer) {
  return {
    id: peer.id,
    displayName: resolveUserDisplayName(peer),
    subtitle: peerSubtitle(peer),
    avatarUrl: resolveUserAvatarUrl(peer),
    profileHref: publicProfileHref(peer),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const uid = session.user.id;

  const viewer = await prisma.user.findUnique({
    where: { id: uid },
    select: messengerPeerSelect,
  });

  let threads;
  try {
    threads = await prisma.directThread.findMany({
      where: {
        OR: [{ participantLowId: uid }, { participantHighId: uid }],
      },
      include: {
        participantLow: { select: messengerPeerSelect },
        participantHigh: { select: messengerPeerSelect },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            body: true,
            createdAt: true,
            senderId: true,
            sender: { select: messageSenderSelect },
          },
        },
      },
    });
  } catch (e) {
    console.error("[messages/threads GET]", e);
    return NextResponse.json(
      {
        error:
          "Could not load messages. If you just pulled this repo, run `npx prisma migrate dev` and restart the dev server.",
      },
      { status: 500 },
    );
  }

  const sorted = [...threads].sort((a, b) => {
    const ta = a.lastMessageAt?.getTime() ?? a.updatedAt.getTime();
    const tb = b.lastMessageAt?.getTime() ?? b.updatedAt.getTime();
    return tb - ta;
  });

  const items = sorted.map((t) => {
    const isViewerLow = t.participantLowId === uid;
    const peer = isViewerLow ? t.participantHigh : t.participantLow;
    const last = t.messages[0];
    const unread = isThreadUnreadForViewer(uid, {
      participantLowId: t.participantLowId,
      participantLowLastReadAt: t.participantLowLastReadAt,
      participantHighLastReadAt: t.participantHighLastReadAt,
      messages: last ? [{ senderId: last.senderId, createdAt: last.createdAt }] : [],
    });

    const lastSender =
      last?.senderId === uid && viewer
        ? viewer
        : last?.sender ?? (last?.senderId === peer.id ? peer : peer);

    return {
      id: t.id,
      peerDisplayName: resolveUserDisplayName(peer),
      peerSubtitle: peerSubtitle(peer),
      peerAvatarUrl: resolveUserAvatarUrl(peer),
      peerProfileHref: publicProfileHref(peer),
      lastMessagePreview: last?.body.slice(0, 120) ?? "",
      lastMessageAt:
        last?.createdAt?.toISOString() ??
        t.lastMessageAt?.toISOString() ??
        t.createdAt.toISOString(),
      lastMessageSenderId: last?.senderId ?? null,
      lastMessageSenderAvatarUrl: last ? resolveUserAvatarUrl(lastSender) : null,
      lastMessageSenderIsViewer: last?.senderId === uid,
      unread,
    };
  });

  return NextResponse.json(
    { threads: items },
    { headers: { "Cache-Control": "no-store, must-revalidate" } },
  );
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { vendorProfileId?: string; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const vendorProfileId = body.vendorProfileId?.trim();
  const targetUserIdRaw = body.userId?.trim();

  const hasVendor = !!vendorProfileId;
  const hasUser = !!targetUserIdRaw;
  if (hasVendor === hasUser) {
    return NextResponse.json(
      { error: "Send exactly one of: vendorProfileId, userId" },
      { status: 400 },
    );
  }

  let targetUserId: string;
  if (hasVendor) {
    const profile = await prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId! },
    });
    if (!profile || profile.status !== VENDOR_STATUS.APPROVED) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }
    targetUserId = profile.userId;
  } else {
    const target = await prisma.user.findUnique({
      where: { id: targetUserIdRaw! },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    targetUserId = target.id;
  }

  const selfId = session.user.id;
  if (selfId === targetUserId) {
    return NextResponse.json({ error: "You cannot message yourself" }, { status: 400 });
  }

  const { low, high } = orderedParticipantIds(selfId, targetUserId);

  let thread;
  try {
    thread = await prisma.directThread.upsert({
      where: {
        participantLowId_participantHighId: {
          participantLowId: low,
          participantHighId: high,
        },
      },
      create: { participantLowId: low, participantHighId: high },
      update: {},
    });
  } catch (e) {
    console.error("[messages/threads POST]", e);
    return NextResponse.json(
      {
        error:
          "Could not create conversation. Run `npx prisma migrate dev` if the database is out of date.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    thread: {
      id: thread.id,
      participantLowId: thread.participantLowId,
      participantHighId: thread.participantHighId,
    },
  });
}

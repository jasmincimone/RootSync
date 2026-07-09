import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";

import { authOptions } from "@/lib/authOptions";
import { PULSE_EVENT_TYPES } from "@/lib/pulse/eventTypes";
import { recordPulseEvent } from "@/lib/pulse/recordEvent";
import { toPulseEarnedPayload } from "@/lib/pulse/toastMessages";
import {
  pulsePostErrorFromUnknown,
  validatePulsePostForDraft,
  validatePulsePostForPublish,
  type PulsePostApiError,
} from "@/lib/pulsePostValidation";
import { prisma } from "@/lib/prisma";
import { PULSE_POST_STATUS } from "@/lib/roles";

function jsonError(payload: PulsePostApiError, status: number) {
  return NextResponse.json(payload, { status });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return jsonError({ error: "Sign in required", hint: "Sign in and try again." }, 401);
  }

  const { postId } = await params;

  let body: { content?: unknown; draft?: unknown; publish?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError({ error: "Invalid request body", hint: "Refresh the page and try again." }, 400);
  }

  const rawContent = typeof body?.content === "string" ? body.content : "";
  const publish = body?.publish === true;
  const saveAsDraft = body?.draft === true;

  const existing = await prisma.communityPost.findUnique({
    where: { id: postId },
  });
  if (!existing) {
    return jsonError({ error: "This Pulse was not found.", hint: "It may have been deleted." }, 404);
  }
  if (existing.authorId !== session.user.id) {
    return jsonError({ error: "You can only edit your own Pulses." }, 403);
  }

  const isPublishing =
    publish ||
    existing.status === PULSE_POST_STATUS.PUBLISHED ||
    (existing.status === PULSE_POST_STATUS.DRAFT && !saveAsDraft && publish !== false);

  const nextStatus = isPublishing ? PULSE_POST_STATUS.PUBLISHED : PULSE_POST_STATUS.DRAFT;

  const validation = isPublishing
    ? validatePulsePostForPublish(rawContent)
    : validatePulsePostForDraft(rawContent);

  if (!validation.ok) {
    return jsonError(validation, 400);
  }

  const { content, media } = validation;

  try {
    const now = new Date();
    const wasDraft = existing.status === PULSE_POST_STATUS.DRAFT;
    const isFirstPublish = wasDraft && nextStatus === PULSE_POST_STATUS.PUBLISHED;

    const post = await prisma.communityPost.update({
      where: { id: postId },
      data: {
        content,
        status: nextStatus,
        editedAt:
          existing.status === PULSE_POST_STATUS.PUBLISHED && nextStatus === PULSE_POST_STATUS.PUBLISHED
            ? now
            : existing.editedAt,
        mediaJson: media.length > 0 ? (media as Prisma.InputJsonValue) : Prisma.DbNull,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    let pulseEarned = null;
    if (isFirstPublish) {
      try {
        const event = await recordPulseEvent({
          userId: session.user.id,
          eventType: PULSE_EVENT_TYPES.PULSE_CREATED,
          relatedEntityType: "community_post",
          relatedEntityId: post.id,
          metadata: media.length > 0 ? { mediaCount: media.length } : undefined,
        });
        pulseEarned = toPulseEarnedPayload(event);
      } catch (e) {
        console.warn("[pulse] Failed to record PULSE_CREATED on publish:", e);
      }
    }

    return NextResponse.json({
      post,
      pulseEarned,
      savedAs: nextStatus === PULSE_POST_STATUS.DRAFT ? "draft" : "published",
    });
  } catch (e) {
    console.error("[pulse post patch] error:", e);
    return jsonError(pulsePostErrorFromUnknown(e), 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { postId } = await params;
  const existing = await prisma.communityPost.findUnique({
    where: { id: postId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (existing.authorId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.communityPost.delete({ where: { id: postId } });
  return NextResponse.json({ ok: true });
}

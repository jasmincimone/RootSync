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
import { PULSE_POST_STATUS, ROLES, VENDOR_STATUS } from "@/lib/roles";

function jsonError(payload: PulsePostApiError, status: number) {
  return NextResponse.json(payload, { status });
}

export async function GET() {
  const posts = await prisma.communityPost.findMany({
    where: { status: PULSE_POST_STATUS.PUBLISHED },
    include: {
      author: { select: { id: true, name: true, email: true, role: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return jsonError(
      {
        error: "Sign in to post",
        code: "EMPTY",
        hint: "Open Sign in and return to Pulse to publish.",
      },
      401,
    );
  }

  let body: { content?: unknown; draft?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError(
      {
        error: "Invalid request body",
        hint: "Refresh the page and try again.",
      },
      400,
    );
  }

  const rawContent = typeof body?.content === "string" ? body.content : "";
  const asDraft = body?.draft === true;

  const validation = asDraft
    ? validatePulsePostForDraft(rawContent)
    : validatePulsePostForPublish(rawContent);
  if (!validation.ok) {
    return jsonError(validation, 400);
  }

  const { content, media } = validation;

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { vendorProfile: true },
    });
    if (!user) {
      return jsonError({ error: "Your account could not be found.", hint: "Sign out and sign in again." }, 404);
    }

    const role = user.role;
    const roleAtPost =
      role === ROLES.ADMIN ? "ADMIN" : role === ROLES.VENDOR ? "VENDOR" : "CUSTOMER";
    const showVendorBadge =
      role === ROLES.VENDOR && user.vendorProfile?.status === VENDOR_STATUS.APPROVED;

    const post = await prisma.communityPost.create({
      data: {
        authorId: user.id,
        content,
        roleAtPost,
        showVendorBadge,
        status: asDraft ? PULSE_POST_STATUS.DRAFT : PULSE_POST_STATUS.PUBLISHED,
        mediaJson: media.length > 0 ? (media as Prisma.InputJsonValue) : Prisma.DbNull,
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    let pulseEarned = null;
    if (!asDraft) {
      try {
        const event = await recordPulseEvent({
          userId: user.id,
          eventType: PULSE_EVENT_TYPES.PULSE_CREATED,
          relatedEntityType: "community_post",
          relatedEntityId: post.id,
          metadata: media.length > 0 ? { mediaCount: media.length } : undefined,
        });
        pulseEarned = toPulseEarnedPayload(event);
      } catch (e) {
        console.warn("[pulse] Failed to record PULSE_CREATED:", e);
      }
    }

    return NextResponse.json({ post, pulseEarned, savedAs: asDraft ? "draft" : "published" });
  } catch (e) {
    console.error("[pulse post create] error:", e);
    return jsonError(pulsePostErrorFromUnknown(e), 500);
  }
}

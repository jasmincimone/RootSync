import { getServerSession } from "next-auth";

import { PULSE_EVENT_TYPES } from "@/lib/pulse/eventTypes";
import { ensurePulseConfig } from "@/lib/pulse/ensureConfig";
import { recordPulseEventOnce } from "@/lib/pulse/recordEvent";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export type TogglePulseReactionResult =
  | { ok: true; given: boolean; count: number }
  | { ok: false; error: string; status: number };

export async function togglePulseReaction(
  postId: string,
  giverUserId: string,
): Promise<TogglePulseReactionResult> {
  await ensurePulseConfig();

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true },
  });
  if (!post) return { ok: false, error: "Pulse not found", status: 404 };
  if (post.authorId === giverUserId) {
    return { ok: false, error: "You cannot give a Pulse to your own post", status: 400 };
  }

  const existing = await prisma.pulseReaction.findUnique({
    where: { postId_giverUserId: { postId, giverUserId } },
  });

  if (existing) {
    await prisma.pulseReaction.delete({ where: { id: existing.id } });
    const count = await prisma.pulseReaction.count({ where: { postId } });
    return { ok: true, given: false, count };
  }

  const reaction = await prisma.pulseReaction.create({
    data: { postId, giverUserId },
    select: { id: true },
  });

  try {
    await recordPulseEventOnce({
      userId: post.authorId,
      eventType: PULSE_EVENT_TYPES.PULSE_RECEIVED,
      relatedEntityType: "pulse_reaction",
      relatedEntityId: reaction.id,
      metadata: { giverUserId, postId },
    });
  } catch (e) {
    console.warn("[pulse] PULSE_RECEIVED event failed:", e);
  }

  const count = await prisma.pulseReaction.count({ where: { postId } });
  return { ok: true, given: true, count };
}

export async function requireSessionUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

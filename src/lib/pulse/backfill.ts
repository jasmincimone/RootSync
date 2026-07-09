import type { Prisma } from "@prisma/client";

import { PULSE_EVENT_TYPES } from "@/lib/pulse/eventTypes";
import type { PulseEventType } from "@/lib/pulse/eventTypes";
import { EVENT_TYPE_CATEGORY } from "@/lib/pulse/categories";
import { ensurePulseConfig } from "@/lib/pulse/ensureConfig";
import { getPulseWeight, recalculatePulseScore } from "@/lib/pulse/score";
import { prisma } from "@/lib/prisma";
import {
  BOOKING_STATUS,
  LISTING_STATUS,
  LISTING_VISIBILITY,
  OFFERING_STATUS,
} from "@/lib/roles";

type PendingPulseEvent = {
  eventType: (typeof PULSE_EVENT_TYPES)[keyof typeof PULSE_EVENT_TYPES];
  relatedEntityType: string;
  relatedEntityId: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
};

function pulseEventKey(
  eventType: string,
  relatedEntityType: string | null | undefined,
  relatedEntityId: string | null | undefined,
): string {
  return `${eventType}|${relatedEntityType ?? ""}|${relatedEntityId ?? ""}`;
}

function isPublishedOfferingStatus(status: string): boolean {
  return status === OFFERING_STATUS.ACTIVE || status === LISTING_STATUS.PUBLISHED;
}

/**
 * Credit historical platform activity that predates live Pulse hooks.
 * Idempotent — safe to run on every account load.
 */
export async function backfillMemberPulseHistory(userId: string): Promise<number> {
  try {
    await ensurePulseConfig();

    const [existingEvents, user, vendorProfile] = await Promise.all([
      prisma.pulseEvent.findMany({
        where: { userId },
        select: { eventType: true, relatedEntityType: true, relatedEntityId: true },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, updatedAt: true },
      }),
      prisma.vendorProfile.findUnique({
        where: { userId },
        select: { id: true },
      }),
    ]);

    const seen = new Set(
      existingEvents.map((e) => pulseEventKey(e.eventType, e.relatedEntityType, e.relatedEntityId)),
    );

    const pending: PendingPulseEvent[] = [];

    if (user?.name?.trim()) {
      const key = pulseEventKey(
        PULSE_EVENT_TYPES.PROFILE_COMPLETED,
        "user",
        userId,
      );
      if (!seen.has(key)) {
        pending.push({
          eventType: PULSE_EVENT_TYPES.PROFILE_COMPLETED,
          relatedEntityType: "user",
          relatedEntityId: userId,
          createdAt: user.updatedAt,
        });
      }
    }

    const posts = await prisma.communityPost.findMany({
      where: { authorId: userId },
      select: { id: true, createdAt: true },
    });
    for (const post of posts) {
      const key = pulseEventKey(PULSE_EVENT_TYPES.PULSE_CREATED, "community_post", post.id);
      if (!seen.has(key)) {
        pending.push({
          eventType: PULSE_EVENT_TYPES.PULSE_CREATED,
          relatedEntityType: "community_post",
          relatedEntityId: post.id,
          createdAt: post.createdAt,
        });
      }
    }

    const reactionsReceived = await prisma.pulseReaction.findMany({
      where: { post: { authorId: userId } },
      select: { id: true, postId: true, giverUserId: true, createdAt: true },
    });
    for (const reaction of reactionsReceived) {
      const key = pulseEventKey(PULSE_EVENT_TYPES.PULSE_RECEIVED, "pulse_reaction", reaction.id);
      if (!seen.has(key)) {
        pending.push({
          eventType: PULSE_EVENT_TYPES.PULSE_RECEIVED,
          relatedEntityType: "pulse_reaction",
          relatedEntityId: reaction.id,
          createdAt: reaction.createdAt,
          metadata: { giverUserId: reaction.giverUserId, postId: reaction.postId },
        });
      }
    }

    if (vendorProfile) {
      const listings = await prisma.listing.findMany({
        where: {
          vendorProfileId: vendorProfile.id,
          OR: [
            { visibility: LISTING_VISIBILITY.PUBLIC },
            { offering: { status: { in: [OFFERING_STATUS.ACTIVE, LISTING_STATUS.PUBLISHED] } } },
          ],
        },
        select: {
          id: true,
          publishedAt: true,
          updatedAt: true,
          offering: { select: { status: true, updatedAt: true } },
        },
      });

      for (const listing of listings) {
        if (!isPublishedOfferingStatus(listing.offering.status) && !listing.publishedAt) continue;
        const key = pulseEventKey(PULSE_EVENT_TYPES.LISTING_PUBLISHED, "listing", listing.id);
        if (!seen.has(key)) {
          pending.push({
            eventType: PULSE_EVENT_TYPES.LISTING_PUBLISHED,
            relatedEntityType: "listing",
            relatedEntityId: listing.id,
            createdAt: listing.publishedAt ?? listing.offering.updatedAt ?? listing.updatedAt,
          });
        }
      }
    }

    const orderWhere: Prisma.OrderWhereInput = user?.email
      ? { status: "paid", OR: [{ userId }, { email: user.email }] }
      : { status: "paid", userId };

    const orders = await prisma.order.findMany({
      where: orderWhere,
      select: { id: true, createdAt: true },
    });
    for (const order of orders) {
      const key = pulseEventKey(PULSE_EVENT_TYPES.ORDER_VERIFIED, "order", order.id);
      if (!seen.has(key)) {
        pending.push({
          eventType: PULSE_EVENT_TYPES.ORDER_VERIFIED,
          relatedEntityType: "order",
          relatedEntityId: order.id,
          createdAt: order.createdAt,
        });
      }
    }

    const memberBookings = await prisma.booking.findMany({
      where: { memberUserId: userId, status: BOOKING_STATUS.COMPLETED },
      select: { id: true, updatedAt: true },
    });
    for (const booking of memberBookings) {
      const key = pulseEventKey(PULSE_EVENT_TYPES.BOOKING_COMPLETED, "booking", booking.id);
      if (!seen.has(key)) {
        pending.push({
          eventType: PULSE_EVENT_TYPES.BOOKING_COMPLETED,
          relatedEntityType: "booking",
          relatedEntityId: booking.id,
          createdAt: booking.updatedAt,
          metadata: { role: "member" },
        });
      }
    }

    if (vendorProfile) {
      const vendorBookings = await prisma.booking.findMany({
        where: { vendorProfileId: vendorProfile.id, status: BOOKING_STATUS.COMPLETED },
        select: { id: true, updatedAt: true },
      });
      for (const booking of vendorBookings) {
        const key = pulseEventKey(PULSE_EVENT_TYPES.BOOKING_COMPLETED, "booking", booking.id);
        if (!seen.has(key)) {
          pending.push({
            eventType: PULSE_EVENT_TYPES.BOOKING_COMPLETED,
            relatedEntityType: "booking",
            relatedEntityId: booking.id,
            createdAt: booking.updatedAt,
            metadata: { role: "vendor" },
          });
        }
      }
    }

    const threads = await prisma.directThread.findMany({
      where: { OR: [{ participantLowId: userId }, { participantHighId: userId }] },
      select: {
        id: true,
        messages: {
          where: { senderId: userId },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { id: true, createdAt: true },
        },
      },
    });
    for (const thread of threads) {
      const first = thread.messages[0];
      if (!first) continue;
      const key = pulseEventKey(PULSE_EVENT_TYPES.MESSAGE_SENT, "direct_thread", thread.id);
      if (!seen.has(key)) {
        pending.push({
          eventType: PULSE_EVENT_TYPES.MESSAGE_SENT,
          relatedEntityType: "direct_thread",
          relatedEntityId: thread.id,
          createdAt: first.createdAt,
          metadata: { messageId: first.id },
        });
      }
    }

    if (pending.length === 0) return 0;

    const categories = await prisma.pulseCategory.findMany({
      select: { id: true, key: true },
    });
    const categoryIdByKey = new Map(categories.map((c) => [c.key, c.id]));

    const weightByType = new Map<string, number>();
    for (const event of pending) {
      if (!weightByType.has(event.eventType)) {
        weightByType.set(event.eventType, await getPulseWeight(event.eventType as PulseEventType));
      }
    }

    await prisma.pulseEvent.createMany({
      data: pending.map((event) => {
        const categoryKey = EVENT_TYPE_CATEGORY[event.eventType];
        return {
          userId,
          eventType: event.eventType,
          categoryId: categoryIdByKey.get(categoryKey) ?? null,
          pulseValue: weightByType.get(event.eventType) ?? 1,
          relatedEntityType: event.relatedEntityType,
          relatedEntityId: event.relatedEntityId,
          metadataJson: event.metadata as Prisma.InputJsonValue | undefined,
          createdAt: event.createdAt,
        };
      }),
    });

    await recalculatePulseScore(userId);
    return pending.length;
  } catch (e) {
    console.error("[pulse] backfill failed for", userId, e);
    return 0;
  }
}

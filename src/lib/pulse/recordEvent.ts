import type { Prisma } from "@prisma/client";

import type { PulseEventType } from "@/lib/pulse/eventTypes";
import { ensurePulseConfig, resolveCategoryIdForEventType } from "@/lib/pulse/ensureConfig";
import { prisma } from "@/lib/prisma";
import { getPulseWeight, recalculatePulseScore } from "@/lib/pulse/score";

type RecordPulseEventInput = {
  userId: string;
  eventType: PulseEventType;
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
  pulseValue?: number;
};

export type RecordedPulseEvent = {
  id: string;
  pulseValue: number;
  eventType: PulseEventType;
};

/** Append a Pulse Event and refresh the member's Pulse Score. */
export async function recordPulseEvent(input: RecordPulseEventInput): Promise<RecordedPulseEvent> {
  await ensurePulseConfig();
  const [pulseValue, categoryId] = await Promise.all([
    input.pulseValue ?? getPulseWeight(input.eventType),
    resolveCategoryIdForEventType(input.eventType),
  ]);

  const event = await prisma.pulseEvent.create({
    data: {
      userId: input.userId,
      eventType: input.eventType,
      categoryId,
      pulseValue,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
      metadataJson: input.metadata as Prisma.InputJsonValue | undefined,
    },
    select: { id: true },
  });

  await recalculatePulseScore(input.userId);

  return { id: event.id, pulseValue, eventType: input.eventType };
}

export type RecordPulseEventOnceResult = {
  recorded: boolean;
  event?: RecordedPulseEvent;
};

/**
 * Record a Pulse Event only if this user has not already earned the same event
 * for the same related entity (or event type + entity pair).
 */
export async function recordPulseEventOnce(
  input: RecordPulseEventInput,
): Promise<RecordPulseEventOnceResult> {
  const existing = await prisma.pulseEvent.findFirst({
    where: {
      userId: input.userId,
      eventType: input.eventType,
      relatedEntityType: input.relatedEntityType,
      relatedEntityId: input.relatedEntityId,
    },
    select: { id: true },
  });
  if (existing) return { recorded: false };

  const event = await recordPulseEvent(input);
  return { recorded: true, event };
}

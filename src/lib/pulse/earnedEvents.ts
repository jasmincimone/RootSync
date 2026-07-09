import { toPulseEarnedPayload, type PulseEarnedPayload } from "@/lib/pulse/toastMessages";
import { prisma } from "@/lib/prisma";

/** Load Pulse events earned by a member since a timestamp (for toast polling). */
export async function loadPulseEarnedSince(
  userId: string,
  since: Date,
  excludeIds: string[] = [],
): Promise<PulseEarnedPayload[]> {
  try {
    const events = await prisma.pulseEvent.findMany({
      where: {
        userId,
        createdAt: { gte: since },
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      },
      orderBy: { createdAt: "asc" },
      take: 8,
      select: {
        id: true,
        pulseValue: true,
        eventType: true,
        metadataJson: true,
      },
    });

    return events.map((e) =>
      toPulseEarnedPayload(
        { id: e.id, pulseValue: e.pulseValue, eventType: e.eventType },
        (e.metadataJson as Record<string, unknown> | null) ?? null,
      ),
    );
  } catch {
    return [];
  }
}

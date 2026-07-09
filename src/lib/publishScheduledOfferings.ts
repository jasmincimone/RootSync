import type { Prisma, PrismaClient } from "@prisma/client";

import { isPrismaUnavailableError } from "@/lib/prisma";
import { updateOfferingAndSyncListing } from "@/lib/offeringListing";
import { hookOfferingPublishedIfActive } from "@/lib/pulse/hooks";
import { OFFERING_STATUS } from "@/lib/roles";

/** If a scheduled offering is due, promote it to ACTIVE. Returns true when published. */
export async function publishOfferingIfDue(
  tx: Prisma.TransactionClient,
  offeringId: string,
): Promise<boolean> {
  const offering = await tx.offering.findUnique({
    where: { id: offeringId },
    select: { id: true, status: true, scheduledPublishAt: true },
  });
  if (!offering) return false;
  if (offering.status !== OFFERING_STATUS.SCHEDULED) return false;
  if (!offering.scheduledPublishAt || offering.scheduledPublishAt > new Date()) return false;

  await updateOfferingAndSyncListing(tx, offering.id, {
    status: OFFERING_STATUS.ACTIVE,
    scheduledPublishAt: null,
  });
  return true;
}

export async function publishDueScheduledOfferings(prisma: PrismaClient) {
  const now = new Date();
  const due = await prisma.offering.findMany({
    where: {
      status: OFFERING_STATUS.SCHEDULED,
      scheduledPublishAt: { lte: now },
    },
    select: { id: true },
    orderBy: { scheduledPublishAt: "asc" },
    take: 100,
  });

  let published = 0;
  for (const row of due) {
    const did = await prisma.$transaction((tx) => publishOfferingIfDue(tx, row.id));
    if (did) {
      published += 1;
      await hookOfferingPublishedIfActive(row.id, OFFERING_STATUS.SCHEDULED);
    }
  }

  return { published, checked: due.length, checkedAt: now.toISOString() };
}

/** Page/cron helper — skip scheduled publish when the DB is temporarily unreachable (Neon wake-up, etc.). */
export async function publishDueScheduledOfferingsBestEffort(
  prisma: PrismaClient,
): Promise<{ published: number }> {
  try {
    const result = await publishDueScheduledOfferings(prisma);
    return { published: result.published };
  } catch (error) {
    if (isPrismaUnavailableError(error)) {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[publishDueScheduledOfferings] Database unreachable — skipping scheduled publish. " +
            "If using Neon free tier, open the Neon console to wake the database or retry in a few seconds.",
        );
      }
      return { published: 0 };
    }
    throw error;
  }
}

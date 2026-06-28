import type { Prisma, PrismaClient } from "@prisma/client";

import { updateOfferingAndSyncListing } from "@/lib/offeringListing";
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
    if (did) published += 1;
  }

  return { published, checked: due.length, checkedAt: now.toISOString() };
}

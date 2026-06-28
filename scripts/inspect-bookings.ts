import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      status: true,
      scheduledStartAt: true,
      scheduledEndAt: true,
      timeZone: true,
      variantId: true,
      variant: { select: { title: true, durationMinutes: true } },
      listing: { select: { title: true } },
    },
  });

  for (const b of bookings) {
    const dur = (b.scheduledEndAt.getTime() - b.scheduledStartAt.getTime()) / 60_000;
    const fmt = (d: Date) =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: b.timeZone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(d);
    console.log({
      listing: b.listing.title,
      variant: b.variant?.title,
      variantDur: b.variant?.durationMinutes,
      status: b.status,
      tz: b.timeZone,
      start: fmt(b.scheduledStartAt),
      end: fmt(b.scheduledEndAt),
      storedDurMin: dur,
      startIso: b.scheduledStartAt.toISOString(),
      endIso: b.scheduledEndAt.toISOString(),
    });
  }
}

main()
  .finally(() => prisma.$disconnect());

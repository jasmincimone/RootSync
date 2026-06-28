import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/** Snap mistaken durations (e.g. 56 from old slot bugs) to standard session lengths. */
const DURATION_CORRECTIONS: Record<number, number> = {
  56: 60,
  59: 60,
  61: 60,
};

async function main() {
  const variants = await prisma.offeringVariant.findMany({
    where: { durationMinutes: { not: null } },
    select: { id: true, title: true, durationMinutes: true },
  });

  for (const v of variants) {
    const current = v.durationMinutes!;
    const corrected = DURATION_CORRECTIONS[current];
    if (corrected && corrected !== current) {
      await prisma.offeringVariant.update({
        where: { id: v.id },
        data: { durationMinutes: corrected },
      });
      console.log(`Updated "${v.title}": ${current} → ${corrected} min`);
    }
  }
}

main().finally(() => prisma.$disconnect());

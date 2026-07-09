import { ensurePulseConfig } from "@/lib/pulse/ensureConfig";
import { prisma } from "@/lib/prisma";

export type AdminPulseConfig = {
  eventWeights: {
    id: string;
    eventType: string;
    pulseValue: number;
    enabled: boolean;
    description: string | null;
    categoryLabel: string | null;
  }[];
  categories: {
    id: string;
    key: string;
    label: string;
    sortOrder: number;
    enabled: boolean;
  }[];
  thresholds: {
    id: string;
    status: string;
    minScore: number;
    label: string;
    emoji: string | null;
    sortOrder: number;
  }[];
  platformWeights: {
    id: string;
    metricKey: string;
    weight: number;
    enabled: boolean;
    description: string | null;
  }[];
  platformThresholds: {
    id: string;
    status: string;
    minValue: number;
    label: string;
    emoji: string | null;
    sortOrder: number;
  }[];
  announcements: {
    id: string;
    title: string;
    body: string | null;
    href: string | null;
    enabled: boolean;
    sortOrder: number;
    startsAt: string | null;
    endsAt: string | null;
  }[];
};

export async function loadAdminPulseConfig(): Promise<AdminPulseConfig> {
  await ensurePulseConfig();

  const [eventWeights, categories, thresholds, platformWeights, platformThresholds, announcements] =
    await Promise.all([
      prisma.pulseScoreWeight.findMany({
        orderBy: { eventType: "asc" },
        select: {
          id: true,
          eventType: true,
          pulseValue: true,
          enabled: true,
          description: true,
          category: { select: { label: true } },
        },
      }),
      prisma.pulseCategory.findMany({
        orderBy: { sortOrder: "asc" },
        select: { id: true, key: true, label: true, sortOrder: true, enabled: true },
      }),
      prisma.pulseThreshold.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          status: true,
          minScore: true,
          label: true,
          emoji: true,
          sortOrder: true,
        },
      }),
      prisma.platformPulseWeight.findMany({
        orderBy: { metricKey: "asc" },
        select: {
          id: true,
          metricKey: true,
          weight: true,
          enabled: true,
          description: true,
        },
      }),
      prisma.platformPulseThreshold.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          status: true,
          minValue: true,
          label: true,
          emoji: true,
          sortOrder: true,
        },
      }),
      prisma.publicDashboardAnnouncement.findMany({
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          title: true,
          body: true,
          href: true,
          enabled: true,
          sortOrder: true,
          startsAt: true,
          endsAt: true,
        },
      }),
    ]);

  return {
    eventWeights: eventWeights.map((w) => ({
      id: w.id,
      eventType: w.eventType,
      pulseValue: w.pulseValue,
      enabled: w.enabled,
      description: w.description,
      categoryLabel: w.category?.label ?? null,
    })),
    categories,
    thresholds,
    platformWeights,
    platformThresholds,
    announcements: announcements.map((a) => ({
      id: a.id,
      title: a.title,
      body: a.body,
      href: a.href,
      enabled: a.enabled,
      sortOrder: a.sortOrder,
      startsAt: a.startsAt?.toISOString() ?? null,
      endsAt: a.endsAt?.toISOString() ?? null,
    })),
  };
}

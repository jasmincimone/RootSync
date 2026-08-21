import { prisma } from "@/lib/prisma";
import { formatPercent, formatRevenue } from "@/lib/growth/campaignFormat";
import type { CampaignAnalytics } from "@/lib/growth/campaignAnalyticsTypes";
import { GROWTH_CAMPAIGN_RECIPIENT_STATUS, GROWTH_MARKETING_EVENT_TYPE } from "@/lib/growth/roles";

export type { CampaignAnalytics } from "@/lib/growth/campaignAnalyticsTypes";
export { formatPercent, formatRevenue } from "@/lib/growth/campaignFormat";

export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
  const [recipients, events] = await Promise.all([
    prisma.growthCampaignRecipient.findMany({
      where: { campaignId },
      select: {
        status: true,
        openedAt: true,
        clickedAt: true,
        convertedAt: true,
        attributedRevenueCents: true,
      },
    }),
    prisma.growthMarketingEvent.groupBy({
      by: ["eventType"],
      where: { campaignId },
      _count: { _all: true },
    }),
  ]);

  const eventCount = (type: string) =>
    events.find((row) => row.eventType === type)?._count._all ?? 0;

  const delivered = recipients.filter((row) => row.status === GROWTH_CAMPAIGN_RECIPIENT_STATUS.SENT).length;
  const failed = recipients.filter((row) => row.status === GROWTH_CAMPAIGN_RECIPIENT_STATUS.FAILED).length;
  const skipped = recipients.filter((row) => row.status === GROWTH_CAMPAIGN_RECIPIENT_STATUS.SKIPPED).length;
  const uniqueOpens = recipients.filter((row) => row.openedAt).length;
  const uniqueClicks = recipients.filter((row) => row.clickedAt).length;
  const conversions = recipients.filter((row) => row.convertedAt).length;
  const revenueCents = recipients.reduce((sum, row) => sum + row.attributedRevenueCents, 0);
  const opens = Math.max(eventCount(GROWTH_MARKETING_EVENT_TYPE.EMAIL_OPEN), uniqueOpens);
  const clicks = Math.max(eventCount(GROWTH_MARKETING_EVENT_TYPE.EMAIL_CLICK), uniqueClicks);
  const destinationVisits = eventCount(GROWTH_MARKETING_EVENT_TYPE.DESTINATION_VISIT);
  const leads = eventCount(GROWTH_MARKETING_EVENT_TYPE.SIGNUP);
  const checkoutStarts = eventCount(GROWTH_MARKETING_EVENT_TYPE.CHECKOUT_STARTED);

  return {
    recipients: recipients.length,
    delivered,
    failed,
    skipped,
    opens,
    uniqueOpens,
    clicks,
    uniqueClicks,
    destinationVisits,
    leads,
    checkoutStarts,
    conversions,
    conversionRate: delivered ? conversions / delivered : 0,
    revenueCents,
    openRate: delivered ? uniqueOpens / delivered : 0,
    clickRate: delivered ? uniqueClicks / delivered : 0,
  };
}

export async function listCampaignActivity(campaignId: string) {
  return prisma.growthMarketingEvent.findMany({
    where: { campaignId },
    orderBy: { occurredAt: "desc" },
    take: 40,
    select: {
      id: true,
      eventType: true,
      occurredAt: true,
      metadataJson: true,
      contact: { select: { id: true, name: true } },
      campaign: { select: { name: true } },
    },
  });
}

export async function getCampaignTimeSeries(campaignId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);
  const events = await prisma.growthMarketingEvent.findMany({
    where: {
      campaignId,
      eventType: {
        in: [
          GROWTH_MARKETING_EVENT_TYPE.EMAIL_CLICK,
          GROWTH_MARKETING_EVENT_TYPE.CONVERSION,
        ],
      },
      occurredAt: { gte: since },
    },
    select: { eventType: true, occurredAt: true },
  });

  const days: Array<{ date: string; clicks: number; conversions: number }> = [];
  for (let i = 0; i < 14; i += 1) {
    const day = new Date(since);
    day.setDate(since.getDate() + i);
    const key = day.toISOString().slice(0, 10);
    days.push({ date: key, clicks: 0, conversions: 0 });
  }
  const byDate = new Map(days.map((row) => [row.date, row]));
  for (const event of events) {
    const key = event.occurredAt.toISOString().slice(0, 10);
    const row = byDate.get(key);
    if (!row) continue;
    if (event.eventType === GROWTH_MARKETING_EVENT_TYPE.EMAIL_CLICK) row.clicks += 1;
    if (event.eventType === GROWTH_MARKETING_EVENT_TYPE.CONVERSION) row.conversions += 1;
  }
  return days;
}

export async function listCampaignRecipients(campaignId: string) {
  return prisma.growthCampaignRecipient.findMany({
    where: { campaignId },
    orderBy: [{ sentAt: "desc" }, { createdAt: "desc" }],
    take: 500,
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      sentAt: true,
      openedAt: true,
      clickedAt: true,
      convertedAt: true,
      attributedRevenueCents: true,
      contactId: true,
      contact: {
        select: {
          id: true,
          marketingOptIn: true,
          unsubscribedAt: true,
        },
      },
    },
  });
}

export async function listContactCampaignHistory(contactId: string) {
  const recipients = await prisma.growthCampaignRecipient.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      sentAt: true,
      openedAt: true,
      clickedAt: true,
      convertedAt: true,
      attributedRevenueCents: true,
      campaign: { select: { id: true, name: true, status: true } },
    },
  });
  const events = await prisma.growthMarketingEvent.findMany({
    where: { contactId, campaignId: { not: null } },
    orderBy: { occurredAt: "desc" },
    take: 40,
    select: {
      id: true,
      eventType: true,
      occurredAt: true,
      campaign: { select: { id: true, name: true } },
    },
  });
  return { recipients, events };
}

import { randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";
import {
  GROWTH_CAMPAIGN_RECIPIENT_STATUS,
  GROWTH_MARKETING_EVENT_TYPE,
} from "@/lib/growth/roles";

export function newCampaignTrackingToken(): string {
  return randomBytes(16).toString("hex");
}

export async function recordCampaignOpen(token: string): Promise<boolean> {
  const recipient = await prisma.growthCampaignRecipient.findUnique({
    where: { trackingToken: token },
    select: {
      id: true,
      campaignId: true,
      contactId: true,
      openedAt: true,
      campaign: { select: { vendorProfileId: true } },
    },
  });
  if (!recipient) return false;
  if (!recipient.openedAt) {
    await prisma.growthCampaignRecipient.update({
      where: { id: recipient.id },
      data: { openedAt: new Date() },
    });
    await prisma.growthEmailCampaign.update({
      where: { id: recipient.campaignId },
      data: { openCount: { increment: 1 } },
    });
  }
  await prisma.growthMarketingEvent.create({
    data: {
      vendorProfileId: recipient.campaign.vendorProfileId,
      eventType: GROWTH_MARKETING_EVENT_TYPE.EMAIL_OPEN,
      campaignId: recipient.campaignId,
      recipientId: recipient.id,
      contactId: recipient.contactId,
    },
  });
  return true;
}

export async function recordCampaignClick(token: string): Promise<{
  destinationUrl: string | null;
  recipientId: string;
  campaignId: string;
} | null> {
  const recipient = await prisma.growthCampaignRecipient.findUnique({
    where: { trackingToken: token },
    select: {
      id: true,
      campaignId: true,
      contactId: true,
      clickedAt: true,
      campaign: {
        select: {
          vendorProfileId: true,
          destinationUrl: true,
          ctaUrl: true,
        },
      },
    },
  });
  if (!recipient) return null;
  if (!recipient.clickedAt) {
    await prisma.growthCampaignRecipient.update({
      where: { id: recipient.id },
      data: { clickedAt: new Date() },
    });
    await prisma.growthEmailCampaign.update({
      where: { id: recipient.campaignId },
      data: { clickCount: { increment: 1 } },
    });
  }
  await prisma.growthMarketingEvent.create({
    data: {
      vendorProfileId: recipient.campaign.vendorProfileId,
      eventType: GROWTH_MARKETING_EVENT_TYPE.EMAIL_CLICK,
      campaignId: recipient.campaignId,
      recipientId: recipient.id,
      contactId: recipient.contactId,
    },
  });
  return {
    destinationUrl: recipient.campaign.ctaUrl || recipient.campaign.destinationUrl,
    recipientId: recipient.id,
    campaignId: recipient.campaignId,
  };
}

export function isCampaignTrackingToken(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[a-f0-9]{32}$/i.test(value.trim());
}

export async function recordCampaignVisit(token: string, funnelId?: string | null): Promise<void> {
  const recipient = await prisma.growthCampaignRecipient.findUnique({
    where: { trackingToken: token },
    select: {
      id: true,
      campaignId: true,
      contactId: true,
      campaign: { select: { vendorProfileId: true, destinationId: true, destinationType: true } },
    },
  });
  if (!recipient) return;
  await prisma.growthMarketingEvent.create({
    data: {
      vendorProfileId: recipient.campaign.vendorProfileId,
      eventType: GROWTH_MARKETING_EVENT_TYPE.DESTINATION_VISIT,
      campaignId: recipient.campaignId,
      recipientId: recipient.id,
      contactId: recipient.contactId,
      funnelId:
        funnelId ||
        (recipient.campaign.destinationType === "FUNNEL" ? recipient.campaign.destinationId : null),
    },
  });
}

export async function recordCampaignCheckoutStart(token: string): Promise<void> {
  if (!isCampaignTrackingToken(token)) return;
  const recipient = await prisma.growthCampaignRecipient.findUnique({
    where: { trackingToken: token },
    select: {
      id: true,
      campaignId: true,
      contactId: true,
      campaign: { select: { vendorProfileId: true } },
    },
  });
  if (!recipient) return;
  await prisma.growthMarketingEvent.create({
    data: {
      vendorProfileId: recipient.campaign.vendorProfileId,
      eventType: GROWTH_MARKETING_EVENT_TYPE.CHECKOUT_STARTED,
      campaignId: recipient.campaignId,
      recipientId: recipient.id,
      contactId: recipient.contactId,
    },
  });
}

export async function unsubscribeCampaignRecipient(token: string): Promise<{
  email: string;
  campaignName: string;
} | null> {
  const recipient = await prisma.growthCampaignRecipient.findUnique({
    where: { trackingToken: token },
    select: {
      id: true,
      email: true,
      contactId: true,
      campaignId: true,
      campaign: { select: { vendorProfileId: true, name: true } },
    },
  });
  if (!recipient) return null;
  if (recipient.contactId) {
    await prisma.growthContact.update({
      where: { id: recipient.contactId },
      data: { unsubscribedAt: new Date() },
    });
  }
  await prisma.growthEmailCampaign.update({
    where: { id: recipient.campaignId },
    data: { unsubscribeCount: { increment: 1 } },
  });
  await prisma.growthMarketingEvent.create({
    data: {
      vendorProfileId: recipient.campaign.vendorProfileId,
      eventType: GROWTH_MARKETING_EVENT_TYPE.UNSUBSCRIBED,
      campaignId: recipient.campaignId,
      recipientId: recipient.id,
      contactId: recipient.contactId,
    },
  });
  return { email: recipient.email, campaignName: recipient.campaign.name };
}

export async function attributeCampaignConversion(args: {
  token?: string | null;
  email?: string | null;
  vendorProfileId: string;
  revenueCents: number;
  orderId: string;
  funnelId?: string | null;
}): Promise<void> {
  const token = args.token?.trim();
  let recipient = token
    ? await prisma.growthCampaignRecipient.findUnique({
        where: { trackingToken: token },
        select: {
          id: true,
          campaignId: true,
          contactId: true,
          convertedAt: true,
          campaign: { select: { vendorProfileId: true } },
        },
      })
    : null;

  if (!recipient && args.email) {
    recipient = await prisma.growthCampaignRecipient.findFirst({
      where: {
        email: args.email.trim().toLowerCase(),
        campaign: { vendorProfileId: args.vendorProfileId },
        status: GROWTH_CAMPAIGN_RECIPIENT_STATUS.SENT,
        clickedAt: { not: null },
      },
      orderBy: { clickedAt: "desc" },
      select: {
        id: true,
        campaignId: true,
        contactId: true,
        convertedAt: true,
        campaign: { select: { vendorProfileId: true } },
      },
    });
  }
  if (!recipient || recipient.campaign.vendorProfileId !== args.vendorProfileId) return;

  await prisma.growthCampaignRecipient.update({
    where: { id: recipient.id },
    data: {
      convertedAt: recipient.convertedAt ?? new Date(),
      attributedRevenueCents: { increment: Math.max(0, args.revenueCents) },
    },
  });
  await prisma.growthMarketingEvent.create({
    data: {
      vendorProfileId: args.vendorProfileId,
      eventType: GROWTH_MARKETING_EVENT_TYPE.CONVERSION,
      campaignId: recipient.campaignId,
      recipientId: recipient.id,
      contactId: recipient.contactId,
      funnelId: args.funnelId,
      metadataJson: { orderId: args.orderId, revenueCents: args.revenueCents },
    },
  });
}

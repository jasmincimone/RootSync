import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { growthVendorWhere } from "@/lib/growthAccess";
import { defaultAudienceForObjective, listEligibleCampaignContacts } from "@/lib/growth/campaignAudience";
import {
  absoluteCampaignUrl,
  resolveCampaignDestinationUrl,
} from "@/lib/growth/campaignDestinations";
import { wrapCampaignEmail } from "@/lib/growth/campaignMessage";
import { newCampaignTrackingToken } from "@/lib/growth/campaignTracking";
import {
  isCampaignAudienceType,
  isCampaignDestinationType,
  isCampaignObjective,
  parseAudienceJson,
  type CampaignAudienceJson,
} from "@/lib/growth/campaignTypes";
import { getCampaignAnalytics } from "@/lib/growth/campaignAnalytics";
import {
  GROWTH_CAMPAIGN_AUDIENCE,
  GROWTH_CAMPAIGN_CHANNEL,
  GROWTH_CAMPAIGN_RECIPIENT_STATUS,
  GROWTH_CAMPAIGN_STATUS,
  GROWTH_MARKETING_EVENT_TYPE,
} from "@/lib/growth/roles";

function appOrigin(): string {
  return (process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "");
}

function campaignFromAddress(from: string, senderName?: string | null): string {
  const email = from.match(/<([^>]+)>/)?.[1]?.trim() || from.trim();
  if (senderName?.trim()) return `${senderName.trim()} <${email}>`;
  return from;
}

const campaignInclude = {
  recipients: { select: { id: true }, take: 1 },
  _count: { select: { recipients: true } },
  steps: { orderBy: { sortOrder: "asc" as const } },
} as const;

export async function listGrowthCampaigns(
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  const campaigns = await prisma.growthEmailCampaign.findMany({
    where: growthVendorWhere(vendorProfileId, isPlatformScope),
    orderBy: { updatedAt: "desc" },
    take: 100,
    include: {
      _count: { select: { recipients: true } },
    },
  });
  const ids = campaigns.map((campaign) => campaign.id);
  const revenue =
    ids.length === 0
      ? []
      : await prisma.growthCampaignRecipient.groupBy({
          by: ["campaignId"],
          where: { campaignId: { in: ids } },
          _sum: { attributedRevenueCents: true },
        });
  const conversions =
    ids.length === 0
      ? []
      : await prisma.growthCampaignRecipient.groupBy({
          by: ["campaignId"],
          where: { campaignId: { in: ids }, convertedAt: { not: null } },
          _count: { _all: true },
        });
  const visits =
    ids.length === 0
      ? []
      : await prisma.growthMarketingEvent.groupBy({
          by: ["campaignId"],
          where: { campaignId: { in: ids }, eventType: GROWTH_MARKETING_EVENT_TYPE.DESTINATION_VISIT },
          _count: { _all: true },
        });
  const revenueById = new Map(revenue.map((row) => [row.campaignId, row._sum.attributedRevenueCents ?? 0]));
  const conversionById = new Map(conversions.map((row) => [row.campaignId, row._count._all]));
  const visitById = new Map(visits.map((row) => [row.campaignId, row._count._all]));
  return campaigns.map((campaign) => ({
    ...campaign,
    recipientCount: campaign._count.recipients,
    conversionCount: conversionById.get(campaign.id) ?? 0,
    destinationVisitCount: visitById.get(campaign.id) ?? 0,
    revenueCents: revenueById.get(campaign.id) ?? 0,
  }));
}

export async function createGrowthCampaign(args: {
  vendorProfileId: string | null;
  name?: string;
  objective?: string | null;
}) {
  const objective = isCampaignObjective(args.objective) ? args.objective : null;
  const name = args.name?.trim() || (objective ? `New ${objective.toLowerCase()} campaign` : "New campaign");
  const audience = defaultAudienceForObjective(objective);
  return prisma.growthEmailCampaign.create({
    data: {
      vendorProfileId: args.vendorProfileId,
      name,
      objective,
      channel: GROWTH_CAMPAIGN_CHANNEL.EMAIL,
      status: GROWTH_CAMPAIGN_STATUS.DRAFT,
      audienceType: audience.audienceType,
      audienceJson: audience.audienceJson as Prisma.InputJsonValue,
    },
    include: campaignInclude,
  });
}

export async function getGrowthCampaignForWorkspace(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  return prisma.growthEmailCampaign.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
    include: campaignInclude,
  });
}

export type GrowthCampaignUpdate = {
  name?: string;
  description?: string | null;
  objective?: string | null;
  subject?: string | null;
  previewText?: string | null;
  headline?: string | null;
  bodyHtml?: string | null;
  heroImageUrl?: string | null;
  ctaLabel?: string | null;
  ctaUrl?: string | null;
  senderName?: string | null;
  replyTo?: string | null;
  destinationType?: string | null;
  destinationId?: string | null;
  destinationUrl?: string | null;
  audienceType?: string;
  audienceJson?: CampaignAudienceJson | null;
  scheduledAt?: Date | null;
  timezone?: string | null;
  status?: string;
  steps?: Array<{
    triggerType: string;
    delayHours: number;
    subject?: string | null;
    previewText?: string | null;
    bodyHtml?: string | null;
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    isEnabled?: boolean;
  }>;
};

function campaignIsLocked(status: string): boolean {
  return status === GROWTH_CAMPAIGN_STATUS.SENT || status === GROWTH_CAMPAIGN_STATUS.SENDING;
}

export async function updateGrowthCampaign(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
  data: GrowthCampaignUpdate,
) {
  const existing = await prisma.growthEmailCampaign.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
    select: { id: true, status: true, destinationType: true, destinationId: true, destinationUrl: true, ctaUrl: true },
  });
  if (!existing) return null;
  if (campaignIsLocked(existing.status) && !data.status) {
    return { error: "Sent campaigns cannot be edited" as const };
  }

  const destinationType = data.destinationType ?? existing.destinationType;
  const destinationId = data.destinationId !== undefined ? data.destinationId : existing.destinationId;
  const destinationUrl = data.destinationUrl !== undefined ? data.destinationUrl : existing.destinationUrl;
  let resolvedUrl = existing.ctaUrl;
  if (data.destinationType !== undefined || data.destinationId !== undefined || data.destinationUrl !== undefined) {
    if (destinationType) {
      const incomplete =
        destinationType === "EXTERNAL" ? !destinationUrl?.trim() : !destinationId;
      if (!incomplete) {
        const resolved = await resolveCampaignDestinationUrl({
          vendorProfileId,
          destinationType,
          destinationId,
          destinationUrl,
        });
        if (!resolved.ok) return { error: resolved.error };
        resolvedUrl = absoluteCampaignUrl(resolved.url, appOrigin());
      }
    }
  }

  const updated = await prisma.growthEmailCampaign.update({
    where: { id },
    data: {
      ...(data.name != null ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined ? { description: data.description?.trim() || null } : {}),
      ...(data.objective !== undefined
        ? { objective: isCampaignObjective(data.objective) ? data.objective : data.objective }
        : {}),
      ...(data.subject !== undefined ? { subject: data.subject?.trim() || null } : {}),
      ...(data.previewText !== undefined ? { previewText: data.previewText?.trim() || null } : {}),
      ...(data.headline !== undefined ? { headline: data.headline?.trim() || null } : {}),
      ...(data.bodyHtml !== undefined ? { bodyHtml: data.bodyHtml?.trim() || null } : {}),
      ...(data.heroImageUrl !== undefined ? { heroImageUrl: data.heroImageUrl?.trim() || null } : {}),
      ...(data.ctaLabel !== undefined ? { ctaLabel: data.ctaLabel?.trim() || null } : {}),
      ...(data.senderName !== undefined ? { senderName: data.senderName?.trim() || null } : {}),
      ...(data.replyTo !== undefined ? { replyTo: data.replyTo?.trim() || null } : {}),
      ...(data.destinationType !== undefined
        ? { destinationType: isCampaignDestinationType(data.destinationType) ? data.destinationType : null }
        : {}),
      ...(data.destinationId !== undefined ? { destinationId: data.destinationId } : {}),
      ...(data.destinationUrl !== undefined ? { destinationUrl: data.destinationUrl?.trim() || null } : {}),
      ...(resolvedUrl ? { ctaUrl: data.ctaUrl?.trim() || resolvedUrl } : data.ctaUrl !== undefined ? { ctaUrl: data.ctaUrl?.trim() || null } : {}),
      ...(data.audienceType !== undefined
        ? { audienceType: isCampaignAudienceType(data.audienceType) ? data.audienceType : GROWTH_CAMPAIGN_AUDIENCE.ALL }
        : {}),
      ...(data.audienceJson !== undefined
        ? { audienceJson: (data.audienceJson ?? Prisma.DbNull) as Prisma.InputJsonValue }
        : {}),
      ...(data.scheduledAt !== undefined ? { scheduledAt: data.scheduledAt } : {}),
      ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      ...(data.status != null ? { status: data.status } : {}),
      ...(data.status === GROWTH_CAMPAIGN_STATUS.PAUSED ? { pausedAt: new Date() } : {}),
      ...(data.status === GROWTH_CAMPAIGN_STATUS.SCHEDULED || data.status === GROWTH_CAMPAIGN_STATUS.DRAFT
        ? { pausedAt: null }
        : {}),
    },
    include: campaignInclude,
  });

  if (data.steps) {
    await prisma.growthCampaignStep.deleteMany({ where: { campaignId: id } });
    if (data.steps.length) {
      await prisma.growthCampaignStep.createMany({
        data: data.steps.map((step, index) => ({
          campaignId: id,
          sortOrder: index,
          triggerType: step.triggerType,
          delayHours: Math.min(24 * 30, Math.max(1, step.delayHours || 48)),
          subject: step.subject?.trim() || null,
          previewText: step.previewText?.trim() || null,
          bodyHtml: step.bodyHtml?.trim() || null,
          ctaLabel: step.ctaLabel?.trim() || null,
          ctaUrl: step.ctaUrl?.trim() || null,
          isEnabled: step.isEnabled === true,
        })),
      });
    }
  }

  return prisma.growthEmailCampaign.findFirst({
    where: { id: updated.id },
    include: campaignInclude,
  });
}

export async function deleteGrowthCampaign(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  const existing = await prisma.growthEmailCampaign.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
    select: { id: true, status: true },
  });
  if (!existing) return false;
  if (existing.status === GROWTH_CAMPAIGN_STATUS.SENT || existing.status === GROWTH_CAMPAIGN_STATUS.SENDING) {
    return false;
  }
  await prisma.growthEmailCampaign.delete({ where: { id } });
  return true;
}

export type SendCampaignResult =
  | { ok: true; sentCount: number; failedCount: number }
  | { ok: false; error: string };

async function prepareRecipients(campaignId: string, contacts: Array<{ id: string; name: string; email: string }>) {
  await prisma.growthCampaignRecipient.deleteMany({
    where: { campaignId, status: GROWTH_CAMPAIGN_RECIPIENT_STATUS.QUEUED },
  });
  if (contacts.length === 0) return [];
  await prisma.growthCampaignRecipient.createMany({
    data: contacts.map((contact) => ({
      campaignId,
      contactId: contact.id,
      email: contact.email,
      name: contact.name,
      trackingToken: newCampaignTrackingToken(),
      status: GROWTH_CAMPAIGN_RECIPIENT_STATUS.QUEUED,
    })),
  });
  return prisma.growthCampaignRecipient.findMany({
    where: { campaignId, status: GROWTH_CAMPAIGN_RECIPIENT_STATUS.QUEUED },
  });
}

export async function sendGrowthCampaign(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
  options?: { forceSchedule?: boolean },
): Promise<SendCampaignResult> {
  const campaign = await prisma.growthEmailCampaign.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
  });
  if (!campaign) return { ok: false, error: "Campaign not found" };
  if (campaign.status === GROWTH_CAMPAIGN_STATUS.SENT) {
    return { ok: false, error: "This campaign was already sent." };
  }
  if (campaign.status === GROWTH_CAMPAIGN_STATUS.SENDING) {
    return { ok: false, error: "This campaign is already sending." };
  }
  if (campaign.status === GROWTH_CAMPAIGN_STATUS.CANCELLED) {
    return { ok: false, error: "This campaign was cancelled." };
  }
  if (campaign.status === GROWTH_CAMPAIGN_STATUS.PAUSED) {
    return { ok: false, error: "This campaign is paused. Resume it before sending." };
  }
  if (
    !options?.forceSchedule &&
    campaign.status === GROWTH_CAMPAIGN_STATUS.SCHEDULED &&
    campaign.scheduledAt &&
    campaign.scheduledAt.getTime() > Date.now()
  ) {
    return { ok: false, error: "This campaign is scheduled for later." };
  }

  const subject = campaign.subject?.trim();
  const bodyHtml = campaign.bodyHtml?.trim();
  if (!subject || !bodyHtml) {
    return { ok: false, error: "Subject and message are required before sending." };
  }

  const destination = await resolveCampaignDestinationUrl({
    vendorProfileId: campaign.vendorProfileId,
    destinationType: campaign.destinationType,
    destinationId: campaign.destinationId,
    destinationUrl: campaign.destinationUrl,
  });
  if (!destination.ok) return { ok: false, error: destination.error };
  const destinationAbsolute = absoluteCampaignUrl(destination.url, appOrigin());

  const { contacts } = await listEligibleCampaignContacts({
    vendorProfileId,
    isPlatformScope,
    audienceType: campaign.audienceType,
    audienceJson: campaign.audienceJson,
  });
  if (contacts.length === 0) {
    return { ok: false, error: "No eligible contacts. Check audience, emails, and unsubscribes." };
  }

  await prisma.growthEmailCampaign.update({
    where: { id },
    data: {
      status: GROWTH_CAMPAIGN_STATUS.SENDING,
      ctaUrl: campaign.ctaUrl || destinationAbsolute,
      destinationUrl: destinationAbsolute,
    },
  });

  const recipients = await prepareRecipients(id, contacts);
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const origin = appOrigin();
  let sentCount = 0;
  let failedCount = 0;
  let lastMessageId: string | null = null;

  const sendOne = async (recipient: (typeof recipients)[number]) => {
    const clickUrl = `${origin}/go/c/${recipient.trackingToken}`;
    const html = wrapCampaignEmail({
      origin,
      trackingToken: recipient.trackingToken,
      subject,
      previewText: campaign.previewText,
      headline: campaign.headline,
      heroImageUrl: campaign.heroImageUrl,
      bodyHtml,
      ctaLabel: campaign.ctaLabel || "Continue",
      clickUrl,
      unsubscribeUrl: `${origin}/u/${recipient.trackingToken}`,
      openPixelUrl: `${origin}/api/growth/t/open/${recipient.trackingToken}`,
      senderName: campaign.senderName,
    });

    if (!key || !from) {
      if (process.env.NODE_ENV === "development") {
        await prisma.growthCampaignRecipient.update({
          where: { id: recipient.id },
          data: { status: GROWTH_CAMPAIGN_RECIPIENT_STATUS.SENT, sentAt: new Date() },
        });
        return { ok: true as const, id: "dev-bypass" };
      }
      return { ok: false as const, error: "Email is not configured." };
    }

    const resend = new Resend(key);
    const { data, error } = await resend.emails.send({
      from: campaignFromAddress(from, campaign.senderName),
      to: [recipient.email],
      subject,
      html,
      ...(campaign.replyTo?.includes("@") ? { reply_to: campaign.replyTo.trim() } : {}),
      headers: {
        "List-Unsubscribe": `<${origin}/u/${recipient.trackingToken}>`,
      },
    });
    if (error) return { ok: false as const, error: error.message };
    await prisma.growthCampaignRecipient.update({
      where: { id: recipient.id },
      data: { status: GROWTH_CAMPAIGN_RECIPIENT_STATUS.SENT, sentAt: new Date() },
    });
    await prisma.growthMarketingEvent.create({
      data: {
        vendorProfileId: campaign.vendorProfileId,
        eventType: GROWTH_MARKETING_EVENT_TYPE.EMAIL_SENT,
        campaignId: id,
        recipientId: recipient.id,
        contactId: recipient.contactId,
      },
    });
    return { ok: true as const, id: data?.id ?? null };
  };

  if (!key || !from) {
    if (process.env.NODE_ENV !== "development") {
      await prisma.growthEmailCampaign.update({
        where: { id },
        data: { status: GROWTH_CAMPAIGN_STATUS.DRAFT },
      });
      return { ok: false, error: "Email is not configured (RESEND_API_KEY / EMAIL_FROM)" };
    }
  }

  for (const recipient of recipients) {
    const result = await sendOne(recipient);
    if (result.ok) {
      sentCount += 1;
      lastMessageId = result.id ?? lastMessageId;
    } else {
      failedCount += 1;
      await prisma.growthCampaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: GROWTH_CAMPAIGN_RECIPIENT_STATUS.FAILED,
          failReason: result.error.slice(0, 200),
        },
      });
    }
  }

  if (sentCount === 0) {
    await prisma.growthEmailCampaign.update({
      where: { id },
      data: { status: GROWTH_CAMPAIGN_STATUS.DRAFT },
    });
    return { ok: false, error: "Could not send to any recipients." };
  }

  await prisma.growthEmailCampaign.update({
    where: { id },
    data: {
      status: GROWTH_CAMPAIGN_STATUS.SENT,
      sentAt: new Date(),
      providerMessageId: lastMessageId,
    },
  });

  return { ok: true, sentCount, failedCount };
}

export async function sendCampaignTestEmail(args: {
  campaignId: string;
  vendorProfileId: string | null;
  isPlatformScope: boolean;
  toEmail: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const campaign = await getGrowthCampaignForWorkspace(
    args.campaignId,
    args.vendorProfileId,
    args.isPlatformScope,
  );
  if (!campaign) return { ok: false, error: "Campaign not found" };
  const subject = campaign.subject?.trim();
  const bodyHtml = campaign.bodyHtml?.trim();
  if (!subject || !bodyHtml) return { ok: false, error: "Save a subject and message first." };
  const to = args.toEmail.trim().toLowerCase();
  if (!to.includes("@")) return { ok: false, error: "Enter a valid test email." };

  const destination = campaign.ctaUrl || campaign.destinationUrl || appOrigin();
  const origin = appOrigin();
  const html = wrapCampaignEmail({
    origin,
    trackingToken: "test",
    subject: `[Test] ${subject}`,
    previewText: campaign.previewText,
    headline: campaign.headline,
    heroImageUrl: campaign.heroImageUrl,
    bodyHtml,
    ctaLabel: campaign.ctaLabel || "Continue",
    clickUrl: destination,
    unsubscribeUrl: `${origin}/account/growth/campaigns`,
    openPixelUrl: `${origin}/images/brand/rootsync-platform-symbol.png`,
    senderName: campaign.senderName,
  });

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[growth/campaign] test email bypass", to);
      return { ok: true };
    }
    return { ok: false, error: "Email is not configured." };
  }
  const resend = new Resend(key);
  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: `[Test] ${subject}`,
    html,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function sendDueScheduledCampaigns(): Promise<{ sent: number; errors: string[] }> {
  const due = await prisma.growthEmailCampaign.findMany({
    where: {
      status: GROWTH_CAMPAIGN_STATUS.SCHEDULED,
      scheduledAt: { lte: new Date() },
    },
    take: 20,
    select: { id: true, vendorProfileId: true },
  });
  let sent = 0;
  const errors: string[] = [];
  for (const campaign of due) {
    const result = await sendGrowthCampaign(campaign.id, campaign.vendorProfileId, campaign.vendorProfileId == null, {
      forceSchedule: true,
    });
    if (result.ok) sent += 1;
    else errors.push(`${campaign.id}: ${result.error}`);
  }
  return { sent, errors };
}

export async function estimateCampaignAudience(
  vendorProfileId: string | null,
  isPlatformScope: boolean,
  audienceType: string,
  audienceJson: unknown,
) {
  return listEligibleCampaignContacts({
    vendorProfileId,
    isPlatformScope,
    audienceType,
    audienceJson: parseAudienceJson(audienceJson),
  });
}

export { getCampaignAnalytics };

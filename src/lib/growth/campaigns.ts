import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { growthVendorWhere } from "@/lib/growthAccess";
import { GROWTH_CAMPAIGN_STATUS } from "@/lib/growth/roles";

export async function listGrowthCampaigns(
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  return prisma.growthEmailCampaign.findMany({
    where: growthVendorWhere(vendorProfileId, isPlatformScope),
    orderBy: { updatedAt: "desc" },
    take: 100,
  });
}

export async function createGrowthCampaign(args: {
  vendorProfileId: string | null;
  name: string;
  subject?: string | null;
  bodyHtml?: string | null;
}) {
  return prisma.growthEmailCampaign.create({
    data: {
      vendorProfileId: args.vendorProfileId,
      name: args.name.trim(),
      subject: args.subject?.trim() || null,
      bodyHtml: args.bodyHtml?.trim() || null,
      status: GROWTH_CAMPAIGN_STATUS.DRAFT,
    },
  });
}

export async function getGrowthCampaignForWorkspace(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
) {
  return prisma.growthEmailCampaign.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
  });
}

export async function updateGrowthCampaign(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
  data: {
    name?: string;
    subject?: string | null;
    bodyHtml?: string | null;
    status?: string;
  },
) {
  const existing = await prisma.growthEmailCampaign.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
    select: { id: true, status: true },
  });
  if (!existing) return null;
  if (existing.status === GROWTH_CAMPAIGN_STATUS.SENT) {
    return { error: "Sent campaigns cannot be edited" as const };
  }

  return prisma.growthEmailCampaign.update({
    where: { id },
    data: {
      ...(data.name != null ? { name: data.name.trim() } : {}),
      ...(data.subject !== undefined ? { subject: data.subject?.trim() || null } : {}),
      ...(data.bodyHtml !== undefined
        ? { bodyHtml: data.bodyHtml?.trim() || null }
        : {}),
      ...(data.status != null ? { status: data.status } : {}),
    },
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
  if (existing.status === GROWTH_CAMPAIGN_STATUS.SENT) return false;
  await prisma.growthEmailCampaign.delete({ where: { id } });
  return true;
}

export type SendCampaignResult =
  | { ok: true; sentCount: number }
  | { ok: false; error: string };

/**
 * Send a draft campaign to all CRM contacts with emails for this growth scope.
 * Uses Resend; marks campaign SENT on success.
 */
export async function sendGrowthCampaign(
  id: string,
  vendorProfileId: string | null,
  isPlatformScope: boolean,
): Promise<SendCampaignResult> {
  const campaign = await prisma.growthEmailCampaign.findFirst({
    where: { id, ...growthVendorWhere(vendorProfileId, isPlatformScope) },
  });
  if (!campaign) return { ok: false, error: "Campaign not found" };
  if (campaign.status === GROWTH_CAMPAIGN_STATUS.SENT) {
    return { ok: false, error: "Campaign already sent" };
  }
  if (campaign.status === GROWTH_CAMPAIGN_STATUS.CANCELLED) {
    return { ok: false, error: "Campaign was cancelled" };
  }

  const subject = campaign.subject?.trim();
  const bodyHtml = campaign.bodyHtml?.trim();
  if (!subject || !bodyHtml) {
    return { ok: false, error: "Subject and body are required before sending" };
  }

  const contacts = await prisma.growthContact.findMany({
    where: growthVendorWhere(vendorProfileId, isPlatformScope),
    select: { email: true, name: true },
    take: 500,
  });
  const recipients = contacts
    .map((c) => c.email.trim().toLowerCase())
    .filter(Boolean);
  const unique = [...new Set(recipients)];
  if (unique.length === 0) {
    return { ok: false, error: "No CRM contacts with email addresses to send to" };
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[growth/campaign] RESEND/EMAIL_FROM missing; marking sent in development for",
        unique.length,
        "recipients",
      );
      await prisma.growthEmailCampaign.update({
        where: { id },
        data: {
          status: GROWTH_CAMPAIGN_STATUS.SENT,
          sentAt: new Date(),
          providerMessageId: "dev-bypass",
        },
      });
      return { ok: true, sentCount: unique.length };
    }
    return { ok: false, error: "Email is not configured (RESEND_API_KEY / EMAIL_FROM)" };
  }

  await prisma.growthEmailCampaign.update({
    where: { id },
    data: { status: GROWTH_CAMPAIGN_STATUS.SENDING },
  });

  const resend = new Resend(key);
  let sentCount = 0;
  let lastMessageId: string | null = null;
  let lastError: string | null = null;

  for (const to of unique) {
    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      html: bodyHtml,
    });
    if (error) {
      console.error("[growth/campaign] Resend error:", error);
      lastError = error.message;
      continue;
    }
    sentCount += 1;
    lastMessageId = data?.id ?? lastMessageId;
  }

  if (sentCount === 0) {
    await prisma.growthEmailCampaign.update({
      where: { id },
      data: { status: GROWTH_CAMPAIGN_STATUS.DRAFT },
    });
    return {
      ok: false,
      error: lastError ? `Could not send: ${lastError}` : "Could not send email",
    };
  }

  await prisma.growthEmailCampaign.update({
    where: { id },
    data: {
      status: GROWTH_CAMPAIGN_STATUS.SENT,
      sentAt: new Date(),
      providerMessageId: lastMessageId,
    },
  });

  if (lastError && sentCount < unique.length) {
    return {
      ok: false,
      error: `Partially sent (${sentCount}/${unique.length}). Last error: ${lastError}`,
    };
  }

  return { ok: true, sentCount };
}

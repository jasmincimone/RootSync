import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import {
  deleteGrowthCampaign,
  getGrowthCampaignForWorkspace,
  sendGrowthCampaign,
  updateGrowthCampaign,
} from "@/lib/growth/campaigns";
import { getCampaignAnalytics } from "@/lib/growth/campaignAnalytics";
import { parseAudienceJson } from "@/lib/growth/campaignTypes";
import { GROWTH_CAMPAIGN_STATUS } from "@/lib/growth/roles";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const campaign = await getGrowthCampaignForWorkspace(
    id,
    auth.ctx.vendorProfileId,
    auth.ctx.isPlatformScope,
  );
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  const analytics = await getCampaignAnalytics(id);
  return NextResponse.json({ campaign, analytics });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (body?.action === "send") {
    const result = await sendGrowthCampaign(
      id,
      auth.ctx.vendorProfileId,
      auth.ctx.isPlatformScope,
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ sentCount: result.sentCount, failedCount: result.failedCount });
  }

  if (body?.action === "schedule") {
    const when = typeof body.scheduledAt === "string" ? new Date(body.scheduledAt) : null;
    if (!when || Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) {
      return NextResponse.json({ error: "Choose a future date and time." }, { status: 400 });
    }
    const updated = await updateGrowthCampaign(id, auth.ctx.vendorProfileId, auth.ctx.isPlatformScope, {
      scheduledAt: when,
      timezone: typeof body.timezone === "string" ? body.timezone : null,
      status: GROWTH_CAMPAIGN_STATUS.SCHEDULED,
    });
    if (!updated || ("error" in updated && updated.error)) {
      return NextResponse.json(
        { error: !updated ? "Campaign not found" : updated.error },
        { status: !updated ? 404 : 400 },
      );
    }
    return NextResponse.json({ campaign: updated });
  }

  if (body?.action === "pause") {
    const existing = await getGrowthCampaignForWorkspace(
      id,
      auth.ctx.vendorProfileId,
      auth.ctx.isPlatformScope,
    );
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (
      existing.status !== GROWTH_CAMPAIGN_STATUS.SCHEDULED &&
      existing.status !== GROWTH_CAMPAIGN_STATUS.SENDING
    ) {
      return NextResponse.json(
        { error: "Only scheduled or sending campaigns can be paused." },
        { status: 400 },
      );
    }
    const updated = await updateGrowthCampaign(id, auth.ctx.vendorProfileId, auth.ctx.isPlatformScope, {
      status: GROWTH_CAMPAIGN_STATUS.PAUSED,
    });
    if (!updated || "error" in updated) {
      return NextResponse.json({ error: !updated ? "Campaign not found" : updated.error }, { status: 400 });
    }
    return NextResponse.json({ campaign: updated });
  }

  if (body?.action === "resume") {
    const existing = await getGrowthCampaignForWorkspace(
      id,
      auth.ctx.vendorProfileId,
      auth.ctx.isPlatformScope,
    );
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (existing.status !== GROWTH_CAMPAIGN_STATUS.PAUSED) {
      return NextResponse.json({ error: "Only paused campaigns can be resumed." }, { status: 400 });
    }
    const nextStatus = existing.scheduledAt
      ? GROWTH_CAMPAIGN_STATUS.SCHEDULED
      : GROWTH_CAMPAIGN_STATUS.DRAFT;
    const updated = await updateGrowthCampaign(id, auth.ctx.vendorProfileId, auth.ctx.isPlatformScope, {
      status: nextStatus,
    });
    if (!updated || "error" in updated) {
      return NextResponse.json({ error: !updated ? "Campaign not found" : updated.error }, { status: 400 });
    }
    return NextResponse.json({ campaign: updated });
  }

  if (body?.action === "cancel") {
    const existing = await getGrowthCampaignForWorkspace(
      id,
      auth.ctx.vendorProfileId,
      auth.ctx.isPlatformScope,
    );
    if (!existing) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }
    if (
      existing.status === GROWTH_CAMPAIGN_STATUS.SENT ||
      existing.status === GROWTH_CAMPAIGN_STATUS.CANCELLED
    ) {
      return NextResponse.json(
        { error: "This campaign already finished or was cancelled." },
        { status: 400 },
      );
    }
    const updated = await updateGrowthCampaign(id, auth.ctx.vendorProfileId, auth.ctx.isPlatformScope, {
      status: GROWTH_CAMPAIGN_STATUS.CANCELLED,
      scheduledAt: null,
    });
    if (!updated || "error" in updated) {
      return NextResponse.json({ error: !updated ? "Campaign not found" : updated.error }, { status: 400 });
    }
    return NextResponse.json({ campaign: updated });
  }

  const updated = await updateGrowthCampaign(
    id,
    auth.ctx.vendorProfileId,
    auth.ctx.isPlatformScope,
    {
      name: typeof body?.name === "string" ? body.name : undefined,
      description:
        body?.description === null || typeof body?.description === "string" ? body.description : undefined,
      objective: typeof body?.objective === "string" ? body.objective : undefined,
      subject:
        body?.subject === null || typeof body?.subject === "string" ? body.subject : undefined,
      previewText:
        body?.previewText === null || typeof body?.previewText === "string" ? body.previewText : undefined,
      headline:
        body?.headline === null || typeof body?.headline === "string" ? body.headline : undefined,
      bodyHtml:
        body?.bodyHtml === null || typeof body?.bodyHtml === "string" ? body.bodyHtml : undefined,
      heroImageUrl:
        body?.heroImageUrl === null || typeof body?.heroImageUrl === "string" ? body.heroImageUrl : undefined,
      ctaLabel:
        body?.ctaLabel === null || typeof body?.ctaLabel === "string" ? body.ctaLabel : undefined,
      ctaUrl: body?.ctaUrl === null || typeof body?.ctaUrl === "string" ? body.ctaUrl : undefined,
      senderName:
        body?.senderName === null || typeof body?.senderName === "string" ? body.senderName : undefined,
      replyTo: body?.replyTo === null || typeof body?.replyTo === "string" ? body.replyTo : undefined,
      destinationType:
        body?.destinationType === null || typeof body?.destinationType === "string"
          ? body.destinationType
          : undefined,
      destinationId:
        body?.destinationId === null || typeof body?.destinationId === "string"
          ? body.destinationId
          : undefined,
      destinationUrl:
        body?.destinationUrl === null || typeof body?.destinationUrl === "string"
          ? body.destinationUrl
          : undefined,
      audienceType: typeof body?.audienceType === "string" ? body.audienceType : undefined,
      audienceJson: body?.audienceJson !== undefined ? parseAudienceJson(body.audienceJson) : undefined,
      timezone: typeof body?.timezone === "string" ? body.timezone : undefined,
      steps: Array.isArray(body?.steps) ? body.steps : undefined,
    },
  );

  if (!updated) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }
  if ("error" in updated) {
    return NextResponse.json({ error: updated.error }, { status: 400 });
  }
  return NextResponse.json({ campaign: updated });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await getGrowthApiContext();
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const ok = await deleteGrowthCampaign(id, auth.ctx.vendorProfileId, auth.ctx.isPlatformScope);
  if (!ok) {
    return NextResponse.json({ error: "Campaign not found or already sent" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

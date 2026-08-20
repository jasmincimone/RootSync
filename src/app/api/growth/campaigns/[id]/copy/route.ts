import { NextRequest, NextResponse } from "next/server";

import { getGrowthApiContext } from "@/lib/growth/apiContext";
import { generateCampaignCopy } from "@/lib/growth/campaignCopy";
import { resolveCampaignDestinationUrl } from "@/lib/growth/campaignDestinations";
import { getGrowthCampaignForWorkspace } from "@/lib/growth/campaigns";
import { CAMPAIGN_OBJECTIVE_CARDS } from "@/lib/growth/campaignTypes";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
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

  const body = await request.json().catch(() => ({}));
  const vendor = auth.ctx.vendorProfileId
    ? await prisma.vendorProfile.findUnique({
        where: { id: auth.ctx.vendorProfileId },
        select: { displayName: true },
      })
    : null;

  let destinationLabel: string | null = campaign.destinationUrl;
  if (campaign.destinationType) {
    const resolved = await resolveCampaignDestinationUrl({
      vendorProfileId: campaign.vendorProfileId,
      destinationType: campaign.destinationType,
      destinationId: campaign.destinationId,
      destinationUrl: campaign.destinationUrl,
    });
    if (resolved.ok) destinationLabel = resolved.label;
  }

  const objectiveLabel =
    CAMPAIGN_OBJECTIVE_CARDS.find((card) => card.id === campaign.objective)?.title ?? "custom";

  try {
    const draft = await generateCampaignCopy({
      businessName: vendor?.displayName ?? "RootSync",
      objective: campaign.objective,
      destinationLabel,
      audienceSummary: `${campaign.audienceType} · ${objectiveLabel}`,
      emphasize: typeof body?.emphasize === "string" ? body.emphasize : null,
      tone: typeof body?.tone === "string" ? body.tone : null,
    });
    return NextResponse.json({ draft });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Rootie could not write copy.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

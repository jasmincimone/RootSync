import { prisma } from "@/lib/prisma";
import { growthVendorWhere } from "@/lib/growthAccess";
import {
  GROWTH_CAMPAIGN_AUDIENCE,
  GROWTH_CONTACT_STATUS,
} from "@/lib/growth/roles";
import {
  MAX_CAMPAIGN_RECIPIENTS,
  parseAudienceJson,
  type CampaignAudienceJson,
} from "@/lib/growth/campaignTypes";

export type EligibleCampaignContact = {
  id: string;
  name: string;
  email: string;
  status: string;
};

function hasEmail(email: string): boolean {
  return email.includes("@") && email.includes(".");
}

export async function listEligibleCampaignContacts(args: {
  vendorProfileId: string | null;
  isPlatformScope: boolean;
  audienceType: string;
  audienceJson?: unknown;
}): Promise<{
  contacts: EligibleCampaignContact[];
  skippedUnsubscribed: number;
  skippedInvalid: number;
}> {
  const where = growthVendorWhere(args.vendorProfileId, args.isPlatformScope);
  const parsed = parseAudienceJson(args.audienceJson);
  const extra = audienceWhere(args.audienceType, parsed);

  const rows = await prisma.growthContact.findMany({
    where: {
      ...where,
      ...extra,
      marketingOptIn: true,
      unsubscribedAt: null,
    },
    select: { id: true, name: true, email: true, status: true, unsubscribedAt: true },
    take: MAX_CAMPAIGN_RECIPIENTS * 2,
    orderBy: { lastActivityAt: "desc" },
  });

  const contacts: EligibleCampaignContact[] = [];
  let skippedUnsubscribed = 0;
  let skippedInvalid = 0;
  const seen = new Set<string>();

  for (const row of rows) {
    const email = row.email.trim().toLowerCase();
    if (seen.has(email)) continue;
    if (!hasEmail(email)) {
      skippedInvalid += 1;
      continue;
    }
    if (row.unsubscribedAt) {
      skippedUnsubscribed += 1;
      continue;
    }
    seen.add(email);
    contacts.push({ id: row.id, name: row.name, email, status: row.status });
    if (contacts.length >= MAX_CAMPAIGN_RECIPIENTS) break;
  }

  return { contacts, skippedUnsubscribed, skippedInvalid };
}

function audienceWhere(audienceType: string, parsed: CampaignAudienceJson) {
  if (audienceType === GROWTH_CAMPAIGN_AUDIENCE.STATUS && parsed.status) {
    return { status: parsed.status };
  }
  if (audienceType === GROWTH_CAMPAIGN_AUDIENCE.MANUAL && parsed.contactIds?.length) {
    return { id: { in: parsed.contactIds } };
  }
  return {};
}

export function defaultAudienceForObjective(objective: string | null | undefined): {
  audienceType: string;
  audienceJson: CampaignAudienceJson;
} {
  if (objective === "WINBACK") {
    return {
      audienceType: GROWTH_CAMPAIGN_AUDIENCE.STATUS,
      audienceJson: { status: GROWTH_CONTACT_STATUS.CUSTOMER },
    };
  }
  if (objective === "LEADS") {
    return {
      audienceType: GROWTH_CAMPAIGN_AUDIENCE.STATUS,
      audienceJson: { status: GROWTH_CONTACT_STATUS.NEW_LEAD },
    };
  }
  return { audienceType: GROWTH_CAMPAIGN_AUDIENCE.ALL, audienceJson: {} };
}

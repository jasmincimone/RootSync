import {
  GROWTH_CAMPAIGN_AUDIENCE,
  GROWTH_CAMPAIGN_DESTINATION,
  GROWTH_CAMPAIGN_OBJECTIVE,
  type GrowthCampaignDestinationType,
  type GrowthCampaignObjective,
} from "@/lib/growth/roles";

export const CAMPAIGN_COOKIE = "rs_c";
export const CAMPAIGN_QUERY = "rs_c";
export const MAX_CAMPAIGN_RECIPIENTS = 500;

export const CAMPAIGN_OBJECTIVE_CARDS: Array<{
  id: GrowthCampaignObjective;
  title: string;
  body: string;
}> = [
  {
    id: GROWTH_CAMPAIGN_OBJECTIVE.BOOKINGS,
    title: "Get more bookings",
    body: "Drive customers to consultations, appointments, or services.",
  },
  {
    id: GROWTH_CAMPAIGN_OBJECTIVE.SELL,
    title: "Sell something",
    body: "Promote a product, kit, digital product, or listing.",
  },
  {
    id: GROWTH_CAMPAIGN_OBJECTIVE.EVENT,
    title: "Promote an event",
    body: "Drive registrations or attendance.",
  },
  {
    id: GROWTH_CAMPAIGN_OBJECTIVE.LEADS,
    title: "Generate leads",
    body: "Capture contact information through a funnel.",
  },
  {
    id: GROWTH_CAMPAIGN_OBJECTIVE.WINBACK,
    title: "Bring customers back",
    body: "Reconnect with previous customers or inactive leads.",
  },
  {
    id: GROWTH_CAMPAIGN_OBJECTIVE.ANNOUNCEMENT,
    title: "Make an announcement",
    body: "Share news, updates, launches, or important information.",
  },
  {
    id: GROWTH_CAMPAIGN_OBJECTIVE.CUSTOM,
    title: "Start from scratch",
    body: "Build a completely custom campaign.",
  },
];

export type CampaignAudienceJson = {
  status?: string | null;
  contactIds?: string[];
};

export function isCampaignObjective(value: unknown): value is GrowthCampaignObjective {
  return (
    typeof value === "string" &&
    Object.values(GROWTH_CAMPAIGN_OBJECTIVE).includes(value as GrowthCampaignObjective)
  );
}

export function isCampaignDestinationType(value: unknown): value is GrowthCampaignDestinationType {
  return (
    typeof value === "string" &&
    Object.values(GROWTH_CAMPAIGN_DESTINATION).includes(value as GrowthCampaignDestinationType)
  );
}

export function isCampaignAudienceType(value: unknown): value is keyof typeof GROWTH_CAMPAIGN_AUDIENCE {
  return (
    typeof value === "string" &&
    Object.values(GROWTH_CAMPAIGN_AUDIENCE).includes(value as (typeof GROWTH_CAMPAIGN_AUDIENCE)[keyof typeof GROWTH_CAMPAIGN_AUDIENCE])
  );
}

export function parseAudienceJson(raw: unknown): CampaignAudienceJson {
  if (!raw || typeof raw !== "object") return {};
  const row = raw as Record<string, unknown>;
  const contactIds = Array.isArray(row.contactIds)
    ? row.contactIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  return {
    status: typeof row.status === "string" ? row.status : null,
    contactIds: [...new Set(contactIds)],
  };
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function withCampaignQuery(url: string, token: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set(CAMPAIGN_QUERY, token);
    return parsed.toString();
  } catch {
    const join = url.includes("?") ? "&" : "?";
    return `${url}${join}${CAMPAIGN_QUERY}=${encodeURIComponent(token)}`;
  }
}

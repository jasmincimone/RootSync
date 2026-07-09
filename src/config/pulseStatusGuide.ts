import {
  DEFAULT_PLATFORM_PULSE_THRESHOLDS,
  DEFAULT_PULSE_THRESHOLDS,
  type PlatformPulseStatus,
  type PulseStatus,
} from "@/lib/pulse/eventTypes";

export type PulseStatusGuideScope = "member" | "platform";

export type PulseStatusTierGuide = {
  status: string;
  emoji: string;
  label: string;
  rangeLabel: string;
  description: string;
};

const MEMBER_DESCRIPTIONS: Record<PulseStatus, string> = {
  EMERGING: "A new member beginning their journey with RootSync.",
  GROWING: "Actively contributing to the community through meaningful actions.",
  ROOTED: "A trusted, consistent contributor to the ecosystem.",
  FLOURISHING: "Creating measurable impact for yourself and others nearby.",
  CONNECTED: "Strengthening relationships across communities on the platform.",
  CANOPY: "Leadership, mentorship, and helping the wider ecosystem grow.",
};

const PLATFORM_DESCRIPTIONS: Record<PlatformPulseStatus, string> = {
  AWAKENING: "The ecosystem is waking up — early participation and first connections.",
  GROWING: "Activity is building across members, vendors, and community Pulse.",
  ROOTED: "Stable participation — commerce, conversation, and contribution taking hold.",
  FLOURISHING: "Strong marketplace and community health across the platform.",
  THRIVING: "The ecosystem is approaching full vitality as more members sync in.",
  FULLY_SYNCED: "Maximum platform health — the vision of one million members synced.",
};

function formatMemberRange(min: number, nextMin?: number): string {
  if (nextMin == null) return `${min.toLocaleString()}+ Pulse`;
  return `${min.toLocaleString()} – ${(nextMin - 1).toLocaleString()} Pulse`;
}

function formatPlatformRange(min: number, nextMin?: number): string {
  if (nextMin == null) return `${min.toLocaleString()}+`;
  return `${min.toLocaleString()} – ${(nextMin - 1).toLocaleString()}`;
}

export const MEMBER_PULSE_STATUS_GUIDE: PulseStatusTierGuide[] = DEFAULT_PULSE_THRESHOLDS.map(
  (tier, index, tiers) => ({
    status: tier.status,
    emoji: tier.emoji ?? "",
    label: tier.label,
    rangeLabel: formatMemberRange(tier.minScore, tiers[index + 1]?.minScore),
    description: MEMBER_DESCRIPTIONS[tier.status],
  }),
);

export const PLATFORM_PULSE_STATUS_GUIDE: PulseStatusTierGuide[] =
  DEFAULT_PLATFORM_PULSE_THRESHOLDS.map((tier, index, tiers) => ({
    status: tier.status,
    emoji: tier.emoji ?? "",
    label: tier.label,
    rangeLabel: formatPlatformRange(tier.minValue, tiers[index + 1]?.minValue),
    description: PLATFORM_DESCRIPTIONS[tier.status],
  }));

export function pulseStatusGuideTiers(scope: PulseStatusGuideScope): PulseStatusTierGuide[] {
  return scope === "member" ? MEMBER_PULSE_STATUS_GUIDE : PLATFORM_PULSE_STATUS_GUIDE;
}

export function pulseStatusGuideTitle(scope: PulseStatusGuideScope): string {
  return scope === "member" ? "Your Pulse statuses" : "Platform Pulse statuses";
}

export function pulseStatusGuideIntro(scope: PulseStatusGuideScope): string {
  return scope === "member"
    ? "Your lifetime Pulse score maps to a status tier. Every meaningful action strengthens you and the ecosystem."
    : "Platform Pulse is a living health index for the whole RootSync ecosystem — from awakening to fully synced.";
}

/** Match a display label like "🌱 Emerging" to a tier status key. */
export function matchPulseStatusFromLabel(
  scope: PulseStatusGuideScope,
  label: string,
): string | undefined {
  const normalized = label.trim().toLowerCase();
  const tiers = pulseStatusGuideTiers(scope);
  return tiers.find(
    (t) =>
      normalized.includes(t.label.toLowerCase()) ||
      (t.emoji && label.includes(t.emoji)),
  )?.status;
}

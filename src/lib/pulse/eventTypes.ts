/** Pulse event type constants — weights stored in `pulse_score_weights` table. */
export const PULSE_EVENT_TYPES = {
  PULSE_CREATED: "PULSE_CREATED",
  PULSE_RECEIVED: "PULSE_RECEIVED",
  PROFILE_COMPLETED: "PROFILE_COMPLETED",
  LISTING_PUBLISHED: "LISTING_PUBLISHED",
  ORDER_VERIFIED: "ORDER_VERIFIED",
  BOOKING_COMPLETED: "BOOKING_COMPLETED",
  MESSAGE_SENT: "MESSAGE_SENT",
  DAILY_ACTIVITY: "DAILY_ACTIVITY",
  AI_GROW_PLAN_COMPLETED: "AI_GROW_PLAN_COMPLETED",
  VENDOR_REVIEW_GIVEN: "VENDOR_REVIEW_GIVEN",
  VENDOR_PULSE_RECEIVED: "VENDOR_PULSE_RECEIVED",
} as const;

export type PulseEventType = (typeof PULSE_EVENT_TYPES)[keyof typeof PULSE_EVENT_TYPES];

/** Individual Pulse status tiers (v2). */
export const PULSE_STATUS = {
  EMERGING: "EMERGING",
  GROWING: "GROWING",
  ROOTED: "ROOTED",
  FLOURISHING: "FLOURISHING",
  CONNECTED: "CONNECTED",
  CANOPY: "CANOPY",
} as const;

export type PulseStatus = (typeof PULSE_STATUS)[keyof typeof PULSE_STATUS];

/** @deprecated v1 tiers — remapped on score recalculation */
export const LEGACY_PULSE_STATUS = {
  STEADY: "STEADY",
  STRONG: "STRONG",
} as const;

export const ACTIVITY_TREND = {
  INCREASING: "INCREASING",
  STABLE: "STABLE",
  QUIET: "QUIET",
  RETURNING: "RETURNING",
} as const;

export type ActivityTrend = (typeof ACTIVITY_TREND)[keyof typeof ACTIVITY_TREND];

/** Platform Pulse status tiers. */
export const PLATFORM_PULSE_STATUS = {
  AWAKENING: "AWAKENING",
  GROWING: "GROWING",
  ROOTED: "ROOTED",
  FLOURISHING: "FLOURISHING",
  THRIVING: "THRIVING",
  FULLY_SYNCED: "FULLY_SYNCED",
} as const;

export type PlatformPulseStatus =
  (typeof PLATFORM_PULSE_STATUS)[keyof typeof PLATFORM_PULSE_STATUS];

export type PulseThresholdRow = {
  status: PulseStatus;
  minScore: number;
  label: string;
  emoji?: string;
};

export type PlatformPulseThresholdRow = {
  status: PlatformPulseStatus;
  minValue: number;
  label: string;
  emoji?: string;
};

/** Default weights used when DB seed rows are missing. */
export const DEFAULT_PULSE_WEIGHTS: Record<PulseEventType, number> = {
  PULSE_CREATED: 5,
  PULSE_RECEIVED: 1,
  PROFILE_COMPLETED: 10,
  LISTING_PUBLISHED: 15,
  ORDER_VERIFIED: 8,
  BOOKING_COMPLETED: 8,
  MESSAGE_SENT: 1,
  DAILY_ACTIVITY: 2,
  AI_GROW_PLAN_COMPLETED: 12,
  VENDOR_REVIEW_GIVEN: 3,
  VENDOR_PULSE_RECEIVED: 5,
};

export const DEFAULT_PULSE_THRESHOLDS: PulseThresholdRow[] = [
  { status: PULSE_STATUS.EMERGING, minScore: 0, label: "Emerging", emoji: "🌱" },
  { status: PULSE_STATUS.GROWING, minScore: 100, label: "Growing", emoji: "🌿" },
  { status: PULSE_STATUS.ROOTED, minScore: 500, label: "Rooted", emoji: "🌳" },
  { status: PULSE_STATUS.FLOURISHING, minScore: 1000, label: "Flourishing", emoji: "🌾" },
  { status: PULSE_STATUS.CONNECTED, minScore: 2500, label: "Connected", emoji: "🌎" },
  { status: PULSE_STATUS.CANOPY, minScore: 5000, label: "Canopy", emoji: "🌲" },
];

export const DEFAULT_PLATFORM_PULSE_THRESHOLDS: PlatformPulseThresholdRow[] = [
  { status: PLATFORM_PULSE_STATUS.AWAKENING, minValue: 0, label: "Awakening", emoji: "🌱" },
  { status: PLATFORM_PULSE_STATUS.GROWING, minValue: 100_000, label: "Growing", emoji: "🌿" },
  { status: PLATFORM_PULSE_STATUS.ROOTED, minValue: 250_000, label: "Rooted", emoji: "🌳" },
  {
    status: PLATFORM_PULSE_STATUS.FLOURISHING,
    minValue: 500_000,
    label: "Flourishing",
    emoji: "🌾",
  },
  { status: PLATFORM_PULSE_STATUS.THRIVING, minValue: 750_000, label: "Thriving", emoji: "🌎" },
  {
    status: PLATFORM_PULSE_STATUS.FULLY_SYNCED,
    minValue: 1_000_000,
    label: "Fully Synced",
    emoji: "✨",
  },
];

export const PLATFORM_PULSE_MAX = 1_000_000;

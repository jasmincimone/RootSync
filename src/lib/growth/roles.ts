/** Growth contact lifecycle status — stored as strings in PostgreSQL. */
export const GROWTH_CONTACT_STATUS = {
  NEW_LEAD: "NEW_LEAD",
  SUBSCRIBER: "SUBSCRIBER",
  COMMUNITY_MEMBER: "COMMUNITY_MEMBER",
  CUSTOMER: "CUSTOMER",
  RETURNING_CUSTOMER: "RETURNING_CUSTOMER",
  VIP: "VIP",
  PARTNER: "PARTNER",
  SPONSOR: "SPONSOR",
  INACTIVE: "INACTIVE",
} as const;

export type GrowthContactStatus =
  (typeof GROWTH_CONTACT_STATUS)[keyof typeof GROWTH_CONTACT_STATUS];

export const GROWTH_CONTACT_STATUS_LABELS: Record<GrowthContactStatus, string> = {
  NEW_LEAD: "New Lead",
  SUBSCRIBER: "Subscriber",
  COMMUNITY_MEMBER: "Community Member",
  CUSTOMER: "Customer",
  RETURNING_CUSTOMER: "Returning Customer",
  VIP: "VIP",
  PARTNER: "Partner",
  SPONSOR: "Sponsor",
  INACTIVE: "Inactive",
};

/** Consultation marketing pipeline stages. */
export const GROWTH_CONSULTATION_STAGE = {
  LEAD: "LEAD",
  REQUESTED: "REQUESTED",
  SCHEDULED: "SCHEDULED",
  COMPLETED: "COMPLETED",
  PROPOSAL_SENT: "PROPOSAL_SENT",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  PROJECT_COMPLETE: "PROJECT_COMPLETE",
  REVIEW_RECEIVED: "REVIEW_RECEIVED",
} as const;

export type GrowthConsultationStage =
  (typeof GROWTH_CONSULTATION_STAGE)[keyof typeof GROWTH_CONSULTATION_STAGE];

export const GROWTH_CONSULTATION_STAGE_LABELS: Record<GrowthConsultationStage, string> = {
  LEAD: "Lead",
  REQUESTED: "Consultation Requested",
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  PROPOSAL_SENT: "Proposal Sent",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  PROJECT_COMPLETE: "Project Complete",
  REVIEW_RECEIVED: "Review Received",
};

export const GROWTH_CAMPAIGN_STATUS = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  SENDING: "SENDING",
  SENT: "SENT",
  PAUSED: "PAUSED",
  CANCELLED: "CANCELLED",
} as const;

export type GrowthCampaignStatus =
  (typeof GROWTH_CAMPAIGN_STATUS)[keyof typeof GROWTH_CAMPAIGN_STATUS];

export const GROWTH_CAMPAIGN_STATUS_LABELS: Record<GrowthCampaignStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  SENDING: "Sending",
  SENT: "Sent",
  PAUSED: "Paused",
  CANCELLED: "Cancelled",
};

export const GROWTH_CAMPAIGN_OBJECTIVE = {
  BOOKINGS: "BOOKINGS",
  SELL: "SELL",
  EVENT: "EVENT",
  LEADS: "LEADS",
  WINBACK: "WINBACK",
  ANNOUNCEMENT: "ANNOUNCEMENT",
  CUSTOM: "CUSTOM",
} as const;

export type GrowthCampaignObjective =
  (typeof GROWTH_CAMPAIGN_OBJECTIVE)[keyof typeof GROWTH_CAMPAIGN_OBJECTIVE];

export const GROWTH_CAMPAIGN_OBJECTIVE_LABELS: Record<GrowthCampaignObjective, string> = {
  BOOKINGS: "Get more bookings",
  SELL: "Sell something",
  EVENT: "Promote an event",
  LEADS: "Generate leads",
  WINBACK: "Bring customers back",
  ANNOUNCEMENT: "Make an announcement",
  CUSTOM: "Start from scratch",
};

export const GROWTH_CAMPAIGN_CHANNEL = {
  EMAIL: "EMAIL",
  SMS: "SMS",
} as const;

export const GROWTH_CAMPAIGN_DESTINATION = {
  FUNNEL: "FUNNEL",
  LISTING: "LISTING",
  BOOKING: "BOOKING",
  EVENT: "EVENT",
  EXTERNAL: "EXTERNAL",
} as const;

export type GrowthCampaignDestinationType =
  (typeof GROWTH_CAMPAIGN_DESTINATION)[keyof typeof GROWTH_CAMPAIGN_DESTINATION];

export const GROWTH_CAMPAIGN_DESTINATION_LABELS: Record<GrowthCampaignDestinationType, string> = {
  FUNNEL: "Funnel",
  LISTING: "Listing",
  BOOKING: "Booking page",
  EVENT: "Event",
  EXTERNAL: "External URL",
};

export const GROWTH_CAMPAIGN_AUDIENCE = {
  ALL: "ALL",
  STATUS: "STATUS",
  MANUAL: "MANUAL",
} as const;

export const GROWTH_CAMPAIGN_RECIPIENT_STATUS = {
  QUEUED: "QUEUED",
  SENT: "SENT",
  FAILED: "FAILED",
  SKIPPED: "SKIPPED",
} as const;

export const GROWTH_CAMPAIGN_STEP_TRIGGER = {
  NO_CLICK: "NO_CLICK",
  CLICKED_NO_CONVERT: "CLICKED_NO_CONVERT",
} as const;

export const GROWTH_FUNNEL_STEP_TYPE = {
  LANDING_PAGE: "LANDING_PAGE",
  LEAD_MAGNET: "LEAD_MAGNET",
  EMAIL_SEQUENCE: "EMAIL_SEQUENCE",
  NEWSLETTER: "NEWSLETTER",
  CTA: "CTA",
  CONSULTATION: "CONSULTATION",
  MARKETPLACE: "MARKETPLACE",
  REFERRAL: "REFERRAL",
} as const;

export const GROWTH_FUNNEL_STEP_TYPE_LABELS: Record<
  (typeof GROWTH_FUNNEL_STEP_TYPE)[keyof typeof GROWTH_FUNNEL_STEP_TYPE],
  string
> = {
  LANDING_PAGE: "Landing page",
  LEAD_MAGNET: "Lead magnet",
  EMAIL_SEQUENCE: "Nurture emails",
  NEWSLETTER: "Newsletter",
  CTA: "Call to action",
  CONSULTATION: "Consultation",
  MARKETPLACE: "Marketplace",
  REFERRAL: "Referral",
};

/** When set on an active funnel, Discover checkout buyers are added as CRM contacts. */
export const GROWTH_FUNNEL_ENTRY_SOURCE = {
  DISCOVER_CHECKOUT: "discover_checkout",
} as const;

export const GROWTH_QR_CAMPAIGN_TYPE = {
  INVESTFEST: "INVESTFEST",
  FARMERS_MARKET: "FARMERS_MARKET",
  WORKSHOP: "WORKSHOP",
  BOOK: "BOOK",
  SEED_KIT: "SEED_KIT",
  DIY_PLAN: "DIY_PLAN",
  PODCAST: "PODCAST",
  PRODUCT_PACKAGING: "PRODUCT_PACKAGING",
  VENDOR_BOOTH: "VENDOR_BOOTH",
  COMMUNITY_EVENT: "COMMUNITY_EVENT",
} as const;

export const GROWTH_MARKETING_EVENT_TYPE = {
  PAGE_VIEW: "PAGE_VIEW",
  QR_SCAN: "QR_SCAN",
  EMAIL_SENT: "EMAIL_SENT",
  EMAIL_OPEN: "EMAIL_OPEN",
  EMAIL_CLICK: "EMAIL_CLICK",
  DESTINATION_VISIT: "DESTINATION_VISIT",
  CHECKOUT_STARTED: "CHECKOUT_STARTED",
  CONVERSION: "CONVERSION",
  SIGNUP: "SIGNUP",
  UNSUBSCRIBED: "UNSUBSCRIBED",
} as const;

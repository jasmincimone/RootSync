/** Shared analytics shapes — safe for client type-only imports (no Prisma). */

export type CampaignAnalytics = {
  recipients: number;
  delivered: number;
  failed: number;
  skipped: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
  destinationVisits: number;
  leads: number;
  checkoutStarts: number;
  conversions: number;
  conversionRate: number;
  revenueCents: number;
  openRate: number;
  clickRate: number;
};

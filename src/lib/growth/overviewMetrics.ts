import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/roles";
import { growthVendorWhere } from "@/lib/growthAccess";

export type GrowthOverviewMetrics = {
  contacts: number;
  activeFunnels: number;
  campaigns: number;
  landingPageViews: number;
  qrScans: number;
  newsletterSubscribers: number;
  upcomingBookings: number;
  totalRevenueCents: number;
  openTasks: number;
  consultationLeads: number;
  recentOrders: number;
};

export async function loadGrowthOverviewMetrics(
  vendorProfileId: string | null,
  isPlatformScope: boolean,
): Promise<GrowthOverviewMetrics> {
  const scope = growthVendorWhere(vendorProfileId, isPlatformScope);

  const [
    contacts,
    activeFunnels,
    campaigns,
    landingPages,
    qrCampaigns,
    newsletterSubscribers,
    openTasks,
    consultationLeads,
    upcomingBookings,
    revenueAgg,
    recentOrders,
  ] = await Promise.all([
    prisma.growthContact.count({ where: scope }),
    prisma.growthFunnel.count({ where: { ...scope, isActive: true } }),
    prisma.growthEmailCampaign.count({ where: scope }),
    prisma.growthLandingPage.aggregate({
      where: scope,
      _sum: { viewCount: true },
    }),
    prisma.growthQrCampaign.aggregate({
      where: scope,
      _sum: { scanCount: true },
    }),
    prisma.growthContact.count({
      where: {
        ...scope,
        status: { in: ["SUBSCRIBER", "COMMUNITY_MEMBER", "CUSTOMER", "RETURNING_CUSTOMER"] },
      },
    }),
    prisma.growthTask.count({
      where: { ...scope, completedAt: null },
    }),
    vendorProfileId
      ? prisma.growthConsultationLead.count({ where: { vendorProfileId } })
      : Promise.resolve(0),
    vendorProfileId
      ? prisma.booking.count({
          where: {
            vendorProfileId,
            status: { in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING_PAYMENT] },
            scheduledStartAt: { gte: new Date() },
          },
        })
      : Promise.resolve(0),
    vendorProfileId
      ? prisma.orderItem.findMany({
          where: {
            listing: { vendorProfileId },
            order: { status: { in: ["paid", "shipped", "delivered"] } },
          },
          select: { priceCents: true, quantity: true },
        })
      : Promise.resolve([]),
    vendorProfileId
      ? prisma.order.count({
          where: {
            items: { some: { listing: { vendorProfileId } } },
            createdAt: { gte: daysAgo(30) },
          },
        })
      : Promise.resolve(0),
  ]);

  return {
    contacts,
    activeFunnels,
    campaigns,
    landingPageViews: landingPages._sum.viewCount ?? 0,
    qrScans: qrCampaigns._sum.scanCount ?? 0,
    newsletterSubscribers,
    upcomingBookings,
    totalRevenueCents: Array.isArray(revenueAgg)
      ? revenueAgg.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
      : 0,
    openTasks,
    consultationLeads,
    recentOrders,
  };
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

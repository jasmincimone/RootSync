import { prisma } from "@/lib/prisma";
import { VENDOR_STATUS } from "@/lib/roles";

export type PlatformDashboardMetrics = {
  platformPulseToday: number;
  platformPulseAllTime: number;
  membersSynced: number;
  membersMilestone: number;
  pulsesToday: number;
  activeMembersToday: number;
  vendorsConnected: number;
  organizationsConnected: number;
  productsListed: number;
  messagesSent: number;
  aiConversations: number;
};

const MEMBERS_MILESTONE = 1_000_000;

export async function loadPlatformDashboardMetrics(): Promise<PlatformDashboardMetrics> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [
    memberCount,
    vendorCount,
    listingCount,
    messageCount,
    aiConversationCount,
    todayEvents,
    allTimeAgg,
    todayActive,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.vendorProfile.count({ where: { status: VENDOR_STATUS.APPROVED } }),
    prisma.listing.count(),
    prisma.directMessage.count(),
    prisma.rootSyncConversation.count(),
    prisma.pulseEvent.findMany({
      where: { createdAt: { gte: startOfDay } },
      select: { pulseValue: true, userId: true },
    }),
    prisma.pulseEvent.aggregate({ _sum: { pulseValue: true }, _count: true }),
    prisma.pulseEvent.findMany({
      where: { createdAt: { gte: startOfDay } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const platformPulseToday = todayEvents.reduce((s: number, e) => s + e.pulseValue, 0);

  return {
    platformPulseToday,
    platformPulseAllTime: allTimeAgg._sum.pulseValue ?? 0,
    membersSynced: memberCount,
    membersMilestone: MEMBERS_MILESTONE,
    pulsesToday: todayEvents.length,
    activeMembersToday: todayActive.length,
    vendorsConnected: vendorCount,
    organizationsConnected: 0,
    productsListed: listingCount,
    messagesSent: messageCount,
    aiConversations: aiConversationCount,
  };
}

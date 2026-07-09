import { prisma } from "@/lib/prisma";
import { BOOKING_STATUS } from "@/lib/roles";
import { growthVendorWhere } from "@/lib/growthAccess";

import type { GrowthOverviewMetrics } from "./overviewMetrics";
import { loadGrowthOverviewMetrics } from "./overviewMetrics";

export type GrowthActivityItem = {
  id: string;
  kind: "order" | "booking" | "contact" | "task";
  title: string;
  detail: string;
  occurredAt: Date;
};

export type GrowthRecentOrderRow = {
  id: string;
  productName: string;
  totalCents: number;
  status: string;
  createdAt: Date;
};

export type GrowthUpcomingBookingRow = {
  id: string;
  title: string;
  memberName: string;
  scheduledStartAt: Date;
  status: string;
};

export type GrowthPerformanceMonth = {
  label: string;
  views: number;
  orders: number;
  revenueCents: number;
};

export type GrowthOverviewDashboardData = {
  metrics: GrowthOverviewMetrics;
  displayName: string;
  accountTypeLabel: string;
  memberSince: Date | null;
  revenueSparkline: number[];
  revenueTrendLabel: string | null;
  revenueTrendPositive: boolean;
  recentActivity: GrowthActivityItem[];
  recentOrders: GrowthRecentOrderRow[];
  upcomingBookings: GrowthUpcomingBookingRow[];
  performanceMonths: GrowthPerformanceMonth[];
  communityReachLabel: string;
  communityReachLevel: string;
  openTasksPreview: Array<{ id: string; title: string; dueAt: Date | null }>;
  communityHighlight: {
    authorName: string;
    excerpt: string;
    createdAt: Date;
  } | null;
};

export async function loadGrowthOverviewDashboard(
  vendorProfileId: string | null,
  isPlatformScope: boolean,
  displayName: string,
): Promise<GrowthOverviewDashboardData> {
  const metrics = await loadGrowthOverviewMetrics(vendorProfileId, isPlatformScope);

  if (!vendorProfileId) {
    return emptyDashboard(metrics, displayName, isPlatformScope);
  }

  const [profile, orderItems, orders, bookings, tasks, contacts, revenueMonths, communityPost] =
    await Promise.all([
    prisma.vendorProfile.findUnique({
      where: { id: vendorProfileId },
      select: { createdAt: true, status: true },
    }),
    prisma.orderItem.findMany({
      where: {
        listing: { vendorProfileId },
        order: {
          status: { in: ["paid", "shipped", "delivered"] },
          createdAt: { gte: monthsAgo(6) },
        },
      },
      select: {
        priceCents: true,
        quantity: true,
        order: { select: { createdAt: true, id: true } },
      },
    }),
    prisma.order.findMany({
      where: { items: { some: { listing: { vendorProfileId } } } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        items: {
          where: { listing: { vendorProfileId } },
          take: 1,
          select: { name: true, priceCents: true, quantity: true },
        },
      },
    }),
    prisma.booking.findMany({
      where: {
        vendorProfileId,
        scheduledStartAt: { gte: new Date() },
        status: { in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING_PAYMENT] },
      },
      orderBy: { scheduledStartAt: "asc" },
      take: 5,
      include: { offering: { select: { title: true } } },
    }),
    prisma.growthTask.findMany({
      where: { ...growthVendorWhere(vendorProfileId, false), completedAt: null },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      take: 5,
      select: { id: true, title: true, dueAt: true, createdAt: true },
    }),
    prisma.growthContact.findMany({
      where: growthVendorWhere(vendorProfileId, false),
      orderBy: { createdAt: "desc" },
      take: 3,
      select: { id: true, name: true, status: true, createdAt: true },
    }),
    loadPerformanceMonths(vendorProfileId),
    prisma.communityPost.findFirst({
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true } } },
    }),
  ]);

  const revenueSparkline = bucketRevenueByMonth(orderItems, 6);
  const trend = percentChange(revenueSparkline);

  const recentOrders: GrowthRecentOrderRow[] = orders.map((order) => {
    const item = order.items[0];
    const lineTotal = item ? item.priceCents * item.quantity : order.totalCents;
    return {
      id: order.id,
      productName: item?.name ?? "Order",
      totalCents: lineTotal,
      status: order.status,
      createdAt: order.createdAt,
    };
  });

  const upcomingBookings: GrowthUpcomingBookingRow[] = bookings.map((b) => ({
    id: b.id,
    title: b.offering.title,
    memberName: b.memberName ?? b.memberEmail,
    scheduledStartAt: b.scheduledStartAt,
    status: b.status,
  }));

  const recentActivity = buildActivityFeed(orders, bookings, contacts, tasks);

  const reachScore = metrics.newsletterSubscribers + metrics.contacts;

  return {
    metrics,
    displayName,
    accountTypeLabel: isPlatformScope ? "Platform Admin" : "Vendor Account",
    memberSince: profile?.createdAt ?? null,
    revenueSparkline,
    revenueTrendLabel: trend?.label ?? null,
    revenueTrendPositive: trend?.positive ?? true,
    recentActivity,
    recentOrders,
    upcomingBookings,
    performanceMonths: revenueMonths,
    communityReachLabel: String(reachScore),
    communityReachLevel: communityLevel(reachScore),
    openTasksPreview: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      dueAt: t.dueAt,
    })),
    communityHighlight: communityPost
      ? {
          authorName: communityPost.author.name ?? "RootSync member",
          excerpt:
            communityPost.content.length > 120
              ? `${communityPost.content.slice(0, 117)}…`
              : communityPost.content,
          createdAt: communityPost.createdAt,
        }
      : null,
  };
}

function emptyDashboard(
  metrics: GrowthOverviewMetrics,
  displayName: string,
  isPlatformScope: boolean,
): GrowthOverviewDashboardData {
  return {
    metrics,
    displayName,
    accountTypeLabel: isPlatformScope ? "Platform Admin" : "Vendor Account",
    memberSince: null,
    revenueSparkline: [0, 0, 0, 0, 0, 0],
    revenueTrendLabel: null,
    revenueTrendPositive: true,
    recentActivity: [],
    recentOrders: [],
    upcomingBookings: [],
    performanceMonths: buildEmptyPerformanceMonths(),
    communityReachLabel: "0",
    communityReachLevel: "Seedling",
    openTasksPreview: [],
    communityHighlight: null,
  };
}

async function loadPerformanceMonths(vendorProfileId: string): Promise<GrowthPerformanceMonth[]> {
  const months = lastNMonthStarts(6);
  const start = months[0]!;

  const [orderItems, landingViews] = await Promise.all([
    prisma.orderItem.findMany({
      where: {
        listing: { vendorProfileId },
        order: {
          createdAt: { gte: start },
          status: { in: ["paid", "shipped", "delivered"] },
        },
      },
      select: {
        priceCents: true,
        quantity: true,
        order: { select: { createdAt: true, id: true } },
      },
    }),
    prisma.growthLandingPage.aggregate({
      where: { vendorProfileId },
      _sum: { viewCount: true },
    }),
  ]);

  const viewsPerMonth = distributeEvenly(landingViews._sum.viewCount ?? 0, 6);

  return months.map((monthStart, index) => {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    const inMonth = orderItems.filter((item) => {
      const at = item.order.createdAt;
      return at >= monthStart && at < monthEnd;
    });
    const orderIds = new Set(inMonth.map((i) => i.order.id));
    const revenueCents = inMonth.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
    return {
      label: monthStart.toLocaleDateString("en-US", { month: "short" }),
      views: viewsPerMonth[index] ?? 0,
      orders: orderIds.size,
      revenueCents,
    };
  });
}

function buildActivityFeed(
  orders: Array<{ id: string; createdAt: Date; items: Array<{ name: string }> }>,
  bookings: Array<{
    id: string;
    createdAt: Date;
    offering: { title: string };
    memberName: string | null;
    memberEmail: string;
  }>,
  contacts: Array<{ id: string; name: string; status: string; createdAt: Date }>,
  tasks: Array<{ id: string; title: string; createdAt: Date }>,
): GrowthActivityItem[] {
  const items: GrowthActivityItem[] = [
    ...orders.map((o) => ({
      id: `order-${o.id}`,
      kind: "order" as const,
      title: "New order",
      detail: o.items[0]?.name ?? "Marketplace purchase",
      occurredAt: o.createdAt,
    })),
    ...bookings.map((b) => ({
      id: `booking-${b.id}`,
      kind: "booking" as const,
      title: "Booking confirmed",
      detail: `${b.offering.title} · ${b.memberName ?? b.memberEmail}`,
      occurredAt: b.createdAt,
    })),
    ...contacts.map((c) => ({
      id: `contact-${c.id}`,
      kind: "contact" as const,
      title: "New contact",
      detail: `${c.name} · ${c.status.replace(/_/g, " ").toLowerCase()}`,
      occurredAt: c.createdAt,
    })),
    ...tasks.map((t) => ({
      id: `task-${t.id}`,
      kind: "task" as const,
      title: "Follow-up task",
      detail: t.title,
      occurredAt: t.createdAt,
    })),
  ];
  return items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 6);
}

function bucketRevenueByMonth(
  items: Array<{ priceCents: number; quantity: number; order: { createdAt: Date } }>,
  months: number,
): number[] {
  const starts = lastNMonthStarts(months);
  return starts.map((monthStart) => {
    const monthEnd = new Date(monthStart);
    monthEnd.setMonth(monthEnd.getMonth() + 1);
    return items
      .filter((item) => {
        const at = item.order.createdAt;
        return at >= monthStart && at < monthEnd;
      })
      .reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  });
}

function percentChange(values: number[]): { label: string; positive: boolean } | null {
  if (values.length < 2) return null;
  const prev = values[values.length - 2] ?? 0;
  const curr = values[values.length - 1] ?? 0;
  if (prev === 0 && curr === 0) return null;
  if (prev === 0) return { label: "New revenue this month", positive: true };
  const pct = Math.round(((curr - prev) / prev) * 100);
  return {
    label: `${pct >= 0 ? "+" : ""}${pct}% from last month`,
    positive: pct >= 0,
  };
}

function communityLevel(score: number): string {
  if (score >= 100) return "Level 4 · Harvester";
  if (score >= 50) return "Level 3 · Cultivator";
  if (score >= 10) return "Level 2 · Sprout";
  return "Level 1 · Seedling";
}

function lastNMonthStarts(n: number): Date[] {
  const result: Date[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    result.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }
  return result;
}

export function buildEmptyPerformanceMonths(): GrowthPerformanceMonth[] {
  return lastNMonthStarts(6).map((monthStart) => ({
    label: monthStart.toLocaleDateString("en-US", { month: "short" }),
    views: 0,
    orders: 0,
    revenueCents: 0,
  }));
}

function distributeEvenly(total: number, buckets: number): number[] {
  if (total <= 0) return Array.from({ length: buckets }, () => 0);
  const base = Math.floor(total / buckets);
  const remainder = total % buckets;
  return Array.from({ length: buckets }, (_, i) => base + (i < remainder ? 1 : 0));
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

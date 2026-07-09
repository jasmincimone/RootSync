import Link from "next/link";
import {
  ArrowRight,
  Bell,
  Calendar,
  DollarSign,
  MessageSquare,
  Package,
  Search,
  Sparkles,
  Sprout,
  UserCircle,
  Users,
} from "lucide-react";

import { GrowthKpiCard } from "@/components/growth/GrowthKpiCard";
import { GrowthPerformanceChart } from "@/components/growth/GrowthPerformanceChart";
import { GrowthSparkline } from "@/components/growth/GrowthSparkline";
import { PulseWorkspacePanel } from "@/components/pulse/PulseWorkspacePanel";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { BookingStatusBadge, OrderStatusBadge } from "@/components/ui/StatusBadge";
import { formatPrice } from "@/lib/format";
import type { GrowthOverviewDashboardData } from "@/lib/growth/overviewDashboard";
import type { MemberPulseSummary } from "@/lib/pulse/memberScore";
import type { PulseWorkspaceData } from "@/lib/pulse/workspace";
import { cn } from "@/lib/cn";

type Props = {
  data: GrowthOverviewDashboardData;
  pulseWorkspace?: PulseWorkspaceData;
  pulseSummary?: MemberPulseSummary;
};

const ACTIVITY_ICONS = {
  order: Package,
  booking: Calendar,
  contact: Users,
  task: MessageSquare,
} as const;

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function GrowthOverviewDashboard({ data, pulseWorkspace, pulseSummary }: Props) {
  const {
    metrics,
    displayName,
    accountTypeLabel,
    memberSince,
    revenueSparkline,
    revenueTrendLabel,
    revenueTrendPositive,
    recentActivity,
    recentOrders,
    upcomingBookings,
    performanceMonths,
    communityReachLabel,
    communityReachLevel,
    openTasksPreview,
    communityHighlight,
  } = data;

  const firstName = displayName.split(" ")[0] ?? displayName;
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const nextBooking = upcomingBookings[0];
  const aiInsight =
    metrics.contacts === 0
      ? "Import contacts from recent orders and bookings to start nurturing relationships. RootSense AI can suggest your first welcome series."
      : metrics.activeFunnels === 0
        ? "You have contacts but no active funnels. Build a podcast → consultation funnel to convert interest into booked sessions."
        : "Demand for local wellness and growing products is trending up in your region. Consider a seasonal newsletter and a QR campaign at your next event.";

  const quickActions = [
    { href: "/account/growth/crm", label: "Add contact", primary: true },
    { href: "/account/growth/funnels", label: "Create funnel", primary: false },
    { href: "/account/growth/newsletter", label: "Draft newsletter", primary: false },
    { href: "/account/growth/ai-marketing", label: "AI recommendations", primary: false },
  ];

  return (
    <div className="space-y-6">
      {/* Toolbar — reference top bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-fix-border/15 bg-fix-surface/80 p-3 shadow-soft">
        <label className="relative min-w-[12rem] flex-1">
          <span className="sr-only">Search growth workspace</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fix-text-muted"
            aria-hidden
          />
          <input
            type="search"
            disabled
            placeholder="Search contacts, campaigns, funnels…"
            className="w-full rounded-full border border-fix-border/15 bg-fix-bg-muted/40 py-2 pl-9 pr-4 text-sm text-fix-text-muted"
          />
        </label>
        <div className="flex items-center gap-2">
          <Link
            href="/account/growth"
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-fix-border/15 bg-fix-bg-muted/50 text-fix-text-muted hover:text-fix-heading"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" aria-hidden />
            {metrics.openTasks > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold text-espresso">
                {metrics.openTasks > 9 ? "9+" : metrics.openTasks}
              </span>
            ) : null}
          </Link>
          <Link
            href="/messages/inbox"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-fix-border/15 bg-fix-bg-muted/50 text-fix-text-muted hover:text-fix-heading"
            aria-label="Messages"
          >
            <MessageSquare className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/account/settings"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-fix-border/15 bg-forest/10 text-forest hover:bg-forest/15"
            aria-label="Account settings"
          >
            <UserCircle className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>

      {/* Welcome header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
            Growth command center
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fix-heading sm:text-3xl">
            Welcome back, {firstName}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fix-text-muted">
            What should you do next to grow your business, strengthen your community, and increase
            your impact?
          </p>
        </div>
        <span className="rounded-full border border-fix-border/20 bg-fix-bg-muted/60 px-4 py-1.5 text-xs font-medium text-fix-text-muted">
          {today}
        </span>
      </div>

      {/* Top KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GrowthKpiCard
          label="Account type"
          value={accountTypeLabel}
          subtext={memberSince ? `Member since ${formatShortDate(memberSince)}` : undefined}
          badge={{ label: "Active", tone: "success" }}
          icon={UserCircle}
        />
        <GrowthKpiCard
          label="Total revenue"
          value={formatPrice(metrics.totalRevenueCents)}
          trend={revenueTrendLabel ?? undefined}
          trendPositive={revenueTrendPositive}
          icon={DollarSign}
          footer={<GrowthSparkline values={revenueSparkline} />}
        />
        <GrowthKpiCard
          label="Upcoming bookings"
          value={String(metrics.upcomingBookings)}
          subtext={
            nextBooking
              ? `Next: ${nextBooking.scheduledStartAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}`
              : "No appointments scheduled"
          }
          icon={Calendar}
        />
        <GrowthKpiCard
          label="Community reach"
          value={communityReachLabel}
          subtext={communityReachLevel}
          icon={Sprout}
        />
      </div>

      {pulseWorkspace ? (
        <PulseWorkspacePanel data={pulseWorkspace} summary={pulseSummary} />
      ) : null}

      {/* Activity + quick actions */}
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-fix-heading">Recent activity</h3>
            <Link
              href="/account/activity"
              className="text-xs font-medium text-fix-link hover:text-fix-link-hover"
            >
              View all
            </Link>
          </div>
          {recentActivity.length === 0 ? (
            <p className="mt-6 text-sm text-fix-text-muted">
              Orders, bookings, and CRM updates will appear here as your community grows.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recentActivity.map((item) => {
                const Icon = ACTIVITY_ICONS[item.kind];
                return (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-xl border border-fix-border/10 bg-fix-bg-muted/30 px-3 py-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-fix-surface text-forest">
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-fix-heading">{item.title}</p>
                      <p className="mt-0.5 truncate text-sm text-fix-text-muted">{item.detail}</p>
                    </div>
                    <span className="shrink-0 text-xs text-fix-text-muted">
                      {formatRelativeTime(item.occurredAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-fix-heading">Quick actions</h3>
          <p className="mt-1 text-sm text-fix-text-muted">Your highest-impact next steps.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <ButtonLink
                key={action.href}
                href={action.href}
                variant={action.primary ? "cta" : "secondary"}
                size="sm"
                className={cn("justify-center text-center", action.primary && "col-span-2")}
              >
                {action.label}
              </ButtonLink>
            ))}
          </div>
          <ButtonLink
            href="/account/vendor"
            variant="secondary"
            size="sm"
            className="mt-3 w-full justify-center"
          >
            Go to vendor dashboard
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
          </ButtonLink>
        </Card>
      </div>

      {/* Performance chart */}
      <GrowthPerformanceChart months={performanceMonths} />

      {/* AI insight */}
      <Card className="overflow-hidden border-forest/20 bg-gradient-to-br from-fix-surface via-fix-bg-muted/30 to-forest/5 p-0 shadow-soft">
        <div className="grid lg:grid-cols-[1fr_auto]">
          <div className="p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest/10 text-forest">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <h3 className="text-sm font-semibold text-fix-heading">AI Grow insight</h3>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-fix-text-muted">{aiInsight}</p>
            <ButtonLink
              href="/account/growth/ai-marketing"
              variant="cta"
              size="sm"
              className="mt-4"
            >
              View insights
            </ButtonLink>
          </div>
          <div
            className="hidden min-h-[8rem] w-full bg-gradient-to-br from-gold/25 via-forest/10 to-fix-bg-muted/50 lg:block lg:min-h-0 lg:w-48 xl:w-56"
            aria-hidden
          >
            <div className="flex h-full items-end justify-center p-6">
              <Sprout className="h-16 w-16 text-forest/40" strokeWidth={1.25} />
            </div>
          </div>
        </div>
      </Card>

      {/* Bottom row: orders, bookings, tasks */}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-fix-heading">Recent orders</h3>
            <Link
              href="/account/vendor/orders"
              className="text-xs font-medium text-fix-link hover:text-fix-link-hover"
            >
              View all
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <p className="mt-4 text-sm text-fix-text-muted">No marketplace orders yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="border-b border-fix-border/15 text-xs uppercase tracking-wide text-fix-text-muted">
                    <th className="pb-2 pr-4 font-semibold">Product</th>
                    <th className="pb-2 pr-4 font-semibold">Amount</th>
                    <th className="pb-2 pr-4 font-semibold">Date</th>
                    <th className="pb-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-fix-border/10">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="text-fix-text">
                      <td className="py-3 pr-4 font-medium text-fix-heading">{order.productName}</td>
                      <td className="py-3 pr-4">{formatPrice(order.totalCents)}</td>
                      <td className="py-3 pr-4 text-fix-text-muted">
                        {order.createdAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-3">
                        <OrderStatusBadge status={order.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-fix-heading">Upcoming bookings</h3>
              <Link
                href="/account/vendor/bookings"
                className="text-xs font-medium text-fix-link hover:text-fix-link-hover"
              >
                View all
              </Link>
            </div>
            {upcomingBookings.length === 0 ? (
              <p className="mt-4 text-sm text-fix-text-muted">No upcoming appointments.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {upcomingBookings.map((booking) => (
                  <li
                    key={booking.id}
                    className="rounded-xl border border-fix-border/10 bg-fix-bg-muted/25 px-3 py-3"
                  >
                    <p className="text-sm font-medium text-fix-heading">{booking.title}</p>
                    <p className="mt-0.5 text-xs text-fix-text-muted">
                      {booking.memberName} ·{" "}
                      {booking.scheduledStartAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <div className="mt-2">
                      <BookingStatusBadge status={booking.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-fix-heading">Community highlight</h3>
              <Link
                href="/community"
                className="text-xs font-medium text-fix-link hover:text-fix-link-hover"
              >
                View feed
              </Link>
            </div>
            {communityHighlight ? (
              <div className="mt-4 rounded-xl border border-fix-border/10 bg-fix-bg-muted/25 p-4">
                <p className="text-sm font-medium text-fix-heading">{communityHighlight.authorName}</p>
                <p className="mt-2 text-sm leading-relaxed text-fix-text-muted">
                  {communityHighlight.excerpt}
                </p>
                <p className="mt-3 text-xs text-fix-text-muted">
                  {formatRelativeTime(communityHighlight.createdAt)}
                </p>
              </div>
            ) : (
              <p className="mt-4 text-sm text-fix-text-muted">
                Share updates in Community to strengthen local connections and grow your reach.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-fix-heading">Tasks needing attention</h3>
              <Link
                href="/account/growth/crm"
                className="text-xs font-medium text-fix-link hover:text-fix-link-hover"
              >
                Open CRM
              </Link>
            </div>
            {openTasksPreview.length === 0 ? (
              <p className="mt-4 text-sm text-fix-text-muted">
                {metrics.openTasks === 0
                  ? "You're caught up — add follow-up tasks in CRM."
                  : `${metrics.openTasks} open tasks`}
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {openTasksPreview.map((task) => (
                  <li
                    key={task.id}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-fix-text-muted"
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber" aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-fix-heading">{task.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {/* Secondary metrics strip */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "CRM contacts", value: metrics.contacts },
          { label: "Active funnels", value: metrics.activeFunnels },
          { label: "Landing page views", value: metrics.landingPageViews },
          { label: "QR scans", value: metrics.qrScans },
        ].map((item) => (
          <Card key={item.label} className="px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-fix-text-muted">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-fix-heading">{item.value}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

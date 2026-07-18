import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { GrowthOverviewDashboard } from "@/components/growth/GrowthOverviewDashboard";
import { PageBody } from "@/components/ui/PageBody";
import { authOptions } from "@/lib/authOptions";
import { requireGrowthWorkspace } from "@/lib/growthAccess";
import { loadGrowthOverviewDashboard, buildEmptyPerformanceMonths } from "@/lib/growth/overviewDashboard";
import { loadGrowthOverviewMetrics } from "@/lib/growth/overviewMetrics";
import { loadMemberPulseScore } from "@/lib/pulse/memberScore";
import { loadPulseWorkspace } from "@/lib/pulse/workspace";

export const dynamic = "force-dynamic";

export default async function GrowthOverviewPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/account/growth");

  const ctx = await requireGrowthWorkspace(session.user.id);
  if ("error" in ctx) redirect("/account/vendor/apply");

  const [pulseScore, pulseWorkspace] = await Promise.all([
    loadMemberPulseScore(session.user.id),
    loadPulseWorkspace(session.user.id),
  ]);

  let data;
  try {
    data = await loadGrowthOverviewDashboard(
      ctx.vendorProfileId,
      ctx.isPlatformScope,
      ctx.displayName,
    );
  } catch {
    const metrics = await loadGrowthOverviewMetrics(ctx.vendorProfileId, ctx.isPlatformScope).catch(
      () => ({
        contacts: 0,
        activeFunnels: 0,
        campaigns: 0,
        landingPageViews: 0,
        qrScans: 0,
        newsletterSubscribers: 0,
        upcomingBookings: 0,
        totalRevenueCents: 0,
        openTasks: 0,
        consultationLeads: 0,
        recentOrders: 0,
      }),
    );
    data = {
      metrics,
      displayName: ctx.displayName,
      accountTypeLabel: ctx.isPlatformScope ? "Platform Admin" : "Vendor Account",
      memberSince: null,
      revenueSparkline: [0, 0, 0, 0, 0, 0],
      revenueTrendLabel: null,
      revenueTrendPositive: true,
      recentActivity: [],
      recentOrders: [],
      upcomingBookings: [],
      performanceMonths: buildEmptyPerformanceMonths(),
      communityReachLabel: "0",
    communityReachLevel: "Level 1 · Seedling",
    openTasksPreview: [],
    communityHighlight: null,
  };
  }

  return (
    <PageBody wide>
      <GrowthOverviewDashboard
        data={data}
        pulseWorkspace={pulseWorkspace}
        pulseSummary={pulseScore}
      />
    </PageBody>
  );
}

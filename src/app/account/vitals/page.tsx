import { getServerSession } from "next-auth";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { PendingPulseReviewsPanel } from "@/components/pulse/PendingPulseReviewsPanel";
import { PulseMeter } from "@/components/pulse/PulseMeter";
import { PulseWorkspacePanel } from "@/components/pulse/PulseWorkspacePanel";
import { authOptions } from "@/lib/authOptions";
import { loadMemberPulseScore } from "@/lib/pulse/memberScore";
import { loadPulseWorkspace } from "@/lib/pulse/workspace";

export const dynamic = "force-dynamic";

export default async function AccountVitalsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const [pulseScore, pulseWorkspace] = await Promise.all([
    loadMemberPulseScore(session.user.id),
    loadPulseWorkspace(session.user.id),
  ]);

  return (
    <AccountSubpageBody description="Your Pulse score, contribution history, and pending reviews.">
      <PulseMeter
        totalScore={pulseScore.totalScore}
        status={pulseScore.status}
        statusLabel={pulseScore.statusLabel}
        activityTrend={pulseScore.activityTrend}
        activityTrendLabel={pulseScore.activityTrendLabel}
        pulseThisWeek={pulseScore.pulseThisWeek}
        tierProgress={pulseScore.tierProgress}
      />

      <PendingPulseReviewsPanel />

      <PulseWorkspacePanel data={pulseWorkspace} />
    </AccountSubpageBody>
  );
}

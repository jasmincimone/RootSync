import { Container } from "@/components/Container";
import { PublicPulseDashboard } from "@/components/pulse/PublicPulseDashboard";
import { loadPlatformDashboardMetrics } from "@/lib/pulse/platformMetrics";
import { loadLatestPlatformPulseSnapshot } from "@/lib/pulse/platformPulse";
import { PLATFORM_PULSE_STATUS } from "@/lib/pulse/eventTypes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ecosystem Dashboard",
  description: "Live health of the RootSync ecosystem.",
};

export default async function RootSyncDashboardPage() {
  let metrics;
  let platformSnapshot;
  try {
    [metrics, platformSnapshot] = await Promise.all([
      loadPlatformDashboardMetrics(),
      loadLatestPlatformPulseSnapshot(),
    ]);
  } catch {
    metrics = {
      platformPulseToday: 0,
      platformPulseAllTime: 0,
      membersSynced: 0,
      membersMilestone: 1_000_000,
      pulsesToday: 0,
      activeMembersToday: 0,
      vendorsConnected: 0,
      organizationsConnected: 0,
      productsListed: 0,
      messagesSent: 0,
      aiConversations: 0,
    };
    platformSnapshot = {
      pulseValue: 0,
      status: PLATFORM_PULSE_STATUS.AWAKENING,
      label: "🌱 Awakening",
      metricsJson: {},
    };
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-base leading-relaxed text-fix-text-muted">
          A living status board — not analytics software. Watch the RootSync ecosystem grow in real
          time as members contribute, connect, and strengthen local communities.
        </p>
        <div className="mt-8">
          <PublicPulseDashboard metrics={metrics} platformSnapshot={platformSnapshot} />
        </div>
      </div>
    </Container>
  );
}

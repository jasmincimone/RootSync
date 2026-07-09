import { Suspense } from "react";
import { getServerSession } from "next-auth";

import { Container } from "@/components/Container";
import { PlatformIllustrationBanner } from "@/components/PlatformIllustrationBanner";
import { PulseComposerSection } from "@/components/pulse/PulseComposerSection";
import { PulseIcon } from "@/components/pulse/PulseIcon";
import { PulsePostCard } from "@/components/pulse/PulsePostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { authOptions } from "@/lib/authOptions";
import { ensurePulseConfig } from "@/lib/pulse/ensureConfig";
import { loadPulseFeedPosts } from "@/lib/pulse/feed";
import { prisma } from "@/lib/prisma";
import { PULSE_POST_STATUS } from "@/lib/roles";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pulse",
  description: "The living heartbeat of the RootSync ecosystem.",
};

export default async function PulsePage() {
  const session = await getServerSession(authOptions);
  let posts: Awaited<ReturnType<typeof loadPulseFeedPosts>> = [];
  let drafts: { id: string; content: string; updatedAt: string }[] = [];
  let dbError: string | null = null;

  try {
    await ensurePulseConfig();
    posts = await loadPulseFeedPosts(session?.user?.id);
    if (session?.user?.id) {
      const draftRows = await prisma.communityPost.findMany({
        where: { authorId: session.user.id, status: PULSE_POST_STATUS.DRAFT },
        orderBy: { updatedAt: "desc" },
        take: 50,
        select: { id: true, content: true, updatedAt: true },
      });
      drafts = draftRows.map((d) => ({
        id: d.id,
        content: d.content,
        updatedAt: d.updatedAt.toISOString(),
      }));
    }
  } catch (e) {
    console.error("Pulse feed DB error:", e);
    posts = [];
    dbError =
      "Database not ready or migrations missing. From the project root run: npm run db:migrate";
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto mb-6 max-w-3xl">
        <div className="flex items-center gap-3">
          <PulseIcon size={40} alt="Pulse" />
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
              Pulse
            </h1>
            <p className="mt-1 text-sm font-medium text-fix-text-muted">
              The heartbeat of RootSync
            </p>
          </div>
        </div>
        <p className="mt-4 text-base leading-relaxed text-fix-text-muted">
          Every post is a Pulse. Together they create the living rhythm of our ecosystem — harvests,
          progress, events, questions, and community wins. Not another social feed. A window into
          what&apos;s alive near you.
        </p>
      </div>

      <PlatformIllustrationBanner
        src="/images/platform/community/farm-illustration.png"
        alt="Flat illustration of a diverse community farming, gardening, making pottery, and woodworking together."
        width={1024}
        height={511}
        className="mx-auto mb-8 max-w-md"
      />

      <div className="mx-auto mt-10 max-w-3xl space-y-8">
        <Suspense fallback={null}>
          <PulseComposerSection drafts={drafts} />
        </Suspense>

        {dbError ? <ErrorBanner message={dbError} /> : null}

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fix-text-muted">
            Latest Pulses
          </h2>
          {posts.length === 0 ? (
            <EmptyState
              bordered={false}
              title="No Pulses yet"
              description="Be the first to share a harvest, question, or community win."
            />
          ) : (
            <ul className="space-y-4">
              {posts.map((p) => (
                <li key={p.id}>
                  <PulsePostCard post={p} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Container>
  );
}

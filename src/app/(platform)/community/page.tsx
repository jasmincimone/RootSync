import type { Prisma } from "@prisma/client";
import { Container } from "@/components/Container";
import { CommunityPostForm } from "@/components/CommunityPostForm";
import { CommunityPostHeader } from "@/components/CommunityPostHeader";
import { PlatformIllustrationBanner } from "@/components/PlatformIllustrationBanner";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { communityAuthorSelect } from "@/lib/userProfileDisplay";
import { prisma } from "@/lib/prisma";

type CommunityPostWithAuthor = Prisma.CommunityPostGetPayload<{
  include: {
    author: { select: typeof communityAuthorSelect };
  };
}>;

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Community",
};

export default async function CommunityPage() {
  let posts: CommunityPostWithAuthor[] = [];
  let dbError: string | null = null;
  try {
    posts = await prisma.communityPost.findMany({
      include: {
        author: { select: communityAuthorSelect },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch (e) {
    console.error("Community feed DB error:", e);
    posts = [];
    dbError =
      "Database not ready or migrations missing. From the project root run: npm run db:migrate";
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto mb-6 max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
          Community
        </h1>
        <p className="mt-3 text-base text-fix-text-muted">
          Discussions, events, and updates from the RootSync Community. Members and vendors can post
          here — approved vendors show a badge on their posts.
        </p>
      </div>

      <PlatformIllustrationBanner
        src="/images/platform/community/farm-illustration.png"
        alt="Flat illustration of a diverse community farming, gardening, making pottery, and woodworking together, with a barn, farmhouse, and a sign that reads Grown made together."
        width={1024}
        height={511}
        className="mx-auto mb-8 max-w-md"
      />

      <div className="mx-auto mt-10 max-w-3xl space-y-8">
        <CommunityPostForm />

        {dbError ? <ErrorBanner message={dbError} /> : null}

        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fix-text-muted">Feed</h2>
          {posts.length === 0 ? (
            <EmptyState
              bordered={false}
              title="No posts yet"
              description="Be the first to share — members and vendors are welcome to post."
            />
          ) : (
            <ul className="space-y-4">
              {posts.map((p) => (
                <li key={p.id}>
                  <Card className="p-5">
                    <CommunityPostHeader
                      author={p.author}
                      roleAtPost={p.roleAtPost}
                      showVendorBadge={p.showVendorBadge}
                      createdAt={p.createdAt.toISOString()}
                      editedAt={p.editedAt?.toISOString() ?? null}
                    />
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fix-text">
                      {p.content}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Container>
  );
}

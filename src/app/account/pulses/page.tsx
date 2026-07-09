import Link from "next/link";
import { getServerSession } from "next-auth";

import { MyCommunityPosts } from "@/components/MyCommunityPosts";
import { AccountPulseDraftsSection } from "@/components/pulse/AccountPulseDraftsSection";
import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { ButtonLink } from "@/components/ui/Button";
import { authOptions } from "@/lib/authOptions";
import { parsePulsePostMediaJson } from "@/lib/pulsePostMedia";
import { prisma } from "@/lib/prisma";
import { PULSE_POST_STATUS } from "@/lib/roles";

export const metadata = {
  title: "My Pulses",
};

function serializePost(p: {
  id: string;
  content: string;
  mediaJson: unknown;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
}) {
  return {
    id: p.id,
    content: p.content,
    media: parsePulsePostMediaJson(p.mediaJson),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    editedAt: p.editedAt?.toISOString() ?? null,
  };
}

export default async function AccountPulsesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return null;
  }

  const rows = await prisma.communityPost.findMany({
    where: { authorId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  const published = rows
    .filter((row) => row.status === PULSE_POST_STATUS.PUBLISHED)
    .map(serializePost);
  const drafts = rows
    .filter((row) => row.status === PULSE_POST_STATUS.DRAFT)
    .map((row) => ({
      id: row.id,
      content: row.content,
      updatedAt: row.updatedAt.toISOString(),
    }));

  const listKey = published.map((p) => `${p.id}:${p.updatedAt}`).join("|");

  return (
    <AccountSubpageBody description="Your published Pulses and private drafts. Editing a published Pulse bumps it to the top of this list and the main Pulse feed.">
      <ButtonLink href="/pulse" variant="secondary" size="sm">
        Open Pulse composer
      </ButtonLink>

      <div className="mt-8 space-y-8">
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fix-text-muted">
            Drafts
          </h2>
          <div className="mt-4">
            <AccountPulseDraftsSection drafts={drafts} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-fix-text-muted">
            Published
          </h2>
          <div className="mt-4">
            <MyCommunityPosts key={listKey} posts={published} />
          </div>
        </section>
      </div>

      <p className="text-xs text-fix-text-muted">
        Want to create a new Pulse?{" "}
        <Link href="/pulse" className="font-medium text-fix-link hover:text-fix-link-hover">
          Open Pulse
        </Link>
        .
      </p>
    </AccountSubpageBody>
  );
}

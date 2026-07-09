import Link from "next/link";
import { getServerSession } from "next-auth";

import { MyCommunityPosts } from "@/components/MyCommunityPosts";
import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { ButtonLink } from "@/components/ui/Button";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "My Pulses",
};

function serializePost(p: {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  editedAt: Date | null;
}) {
  return {
    id: p.id,
    content: p.content,
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

  const posts = rows.map(serializePost);
  const listKey = posts.map((p) => `${p.id}:${p.updatedAt}`).join("|");

  return (
    <AccountSubpageBody description="Your Pulses on the public feed. Editing bumps a Pulse to the top of this list and the main Pulse feed.">
      <ButtonLink href="/pulse" variant="secondary" size="sm">
        View Pulse feed
      </ButtonLink>

      <MyCommunityPosts key={listKey} posts={posts} />

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

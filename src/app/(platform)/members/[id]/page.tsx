import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";

import { CommunityPostHeader } from "@/components/CommunityPostHeader";
import { Container } from "@/components/Container";
import { MessageUserLink } from "@/components/MessageUserLink";
import { UserAvatar } from "@/components/UserAvatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { discoverVendorPath } from "@/config/discoverPaths";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";
import {
  communityAuthorSelect,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
} from "@/lib/userProfileDisplay";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    select: { name: true, email: true },
  });
  if (!user) return { title: "Member" };
  const name = user.name?.trim() || user.email?.split("@")[0] || "Member";
  return { title: `${name} · Community` };
}

export default async function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      imageUrl: true,
      shopNeighborhoods: true,
      createdAt: true,
      vendorProfile: {
        select: {
          id: true,
          displayName: true,
          profileImageUrl: true,
          status: true,
        },
      },
    },
  });

  if (!user) notFound();

  const isSelf = session?.user?.id === user.id;
  const displayName = resolveUserDisplayName(user);
  const avatarUrl = resolveUserAvatarUrl(user);
  const approvedVendor =
    user.vendorProfile?.status === VENDOR_STATUS.APPROVED ? user.vendorProfile : null;

  const posts = await prisma.communityPost.findMany({
    where: { authorId: user.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { author: { select: communityAuthorSelect } },
  });

  const roleLabel =
    user.role === ROLES.ADMIN ? "Admin" : approvedVendor ? "Vendor" : "Member";

  return (
    <Container className="py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <nav className="text-sm text-fix-text-muted">
          <Link href="/community" className="text-fix-link hover:text-fix-link-hover">
            Community
          </Link>
          <span className="mx-2">/</span>
          <span className="text-fix-heading">{displayName}</span>
        </nav>

        <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6">
          <UserAvatar src={avatarUrl} name={displayName} size="xl" className="mx-auto sm:mx-0" />
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <span className="inline-flex rounded-full bg-fix-bg-muted px-2.5 py-0.5 text-xs font-medium text-fix-text-muted">
              {roleLabel}
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-fix-heading sm:text-3xl">
              {displayName}
            </h1>
            {user.shopNeighborhoods?.trim() ? (
              <p className="mt-3 text-sm leading-relaxed text-fix-text-muted">
                <span className="font-medium text-fix-heading">Local neighborhoods: </span>
                {user.shopNeighborhoods.trim()}
              </p>
            ) : (
              <p className="mt-3 text-sm text-fix-text-muted">
                {isSelf
                  ? "Add neighborhoods you shop or want to shop in account settings."
                  : "No neighborhoods shared yet."}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              {!isSelf ? (
                <MessageUserLink targetUserId={user.id} variant="primary" size="md" />
              ) : null}
              {approvedVendor ? (
                <ButtonLink href={discoverVendorPath(approvedVendor.id)} variant="secondary" size="md">
                  Vendor page
                </ButtonLink>
              ) : null}
              {isSelf ? (
                <ButtonLink href="/account/settings" variant="secondary" size="md">
                  Edit profile
                </ButtonLink>
              ) : null}
            </div>
          </div>
        </div>

        <section className="mt-10" aria-labelledby="member-posts-heading">
          <h2 id="member-posts-heading" className="text-lg font-semibold text-fix-heading">
            Community posts
          </h2>
          <p className="mt-1 text-sm text-fix-text-muted">
            Public updates from {displayName} on the community feed.
          </p>
          {posts.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                bordered={false}
                title="No posts yet"
                description={
                  isSelf
                    ? "Share something on the community feed to introduce yourself."
                    : `${displayName} hasn't posted on the community feed yet.`
                }
                action={
                  isSelf ? { href: "/community", label: "Go to community", variant: "secondary" } : undefined
                }
              />
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {posts.map((p) => (
                <li key={p.id}>
                  <Card className="p-5">
                    <CommunityPostHeader
                      author={p.author}
                      roleAtPost={p.roleAtPost}
                      showVendorBadge={p.showVendorBadge}
                      createdAt={p.createdAt.toISOString()}
                      editedAt={p.editedAt?.toISOString() ?? null}
                      showMessageLink={!isSelf}
                    />
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fix-text">
                      {p.content}
                    </p>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Container>
  );
}

import { prisma } from "@/lib/prisma";
import { communityAuthorSelect } from "@/lib/userProfileDisplay";

import type { PulseFeedPost } from "@/components/pulse/PulsePostCard";

export async function loadPulseFeedPosts(viewerUserId?: string | null): Promise<PulseFeedPost[]> {
  const rows = await prisma.communityPost.findMany({
    include: {
      author: { select: communityAuthorSelect },
      _count: { select: { pulseReactions: true } },
      ...(viewerUserId
        ? {
            pulseReactions: {
              where: { giverUserId: viewerUserId },
              select: { id: true },
              take: 1,
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rows.map((p) => ({
    id: p.id,
    content: p.content,
    authorId: p.authorId,
    roleAtPost: p.roleAtPost,
    showVendorBadge: p.showVendorBadge,
    createdAt: p.createdAt.toISOString(),
    editedAt: p.editedAt?.toISOString() ?? null,
    pulseCount: p._count.pulseReactions,
    viewerGavePulse: viewerUserId ? (p.pulseReactions?.length ?? 0) > 0 : false,
    author: p.author,
  }));
}

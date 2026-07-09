import { CommunityPostHeader } from "@/components/CommunityPostHeader";
import { GivePulseButton } from "@/components/pulse/GivePulseButton";
import { Card } from "@/components/ui/Card";
import type { UserProfilePeer } from "@/lib/userProfileDisplay";

export type PulseFeedPost = {
  id: string;
  content: string;
  authorId: string;
  roleAtPost: string;
  showVendorBadge: boolean;
  createdAt: string;
  editedAt: string | null;
  pulseCount: number;
  viewerGavePulse: boolean;
  author: UserProfilePeer;
};

type Props = {
  post: PulseFeedPost;
};

export function PulsePostCard({ post }: Props) {
  return (
    <Card className="p-5 shadow-soft">
      <CommunityPostHeader
        author={post.author}
        roleAtPost={post.roleAtPost}
        showVendorBadge={post.showVendorBadge}
        createdAt={post.createdAt}
        editedAt={post.editedAt}
      />
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fix-text">{post.content}</p>
      <GivePulseButton
        postId={post.id}
        authorId={post.authorId}
        initialCount={post.pulseCount}
        initialGiven={post.viewerGavePulse}
      />
    </Card>
  );
}

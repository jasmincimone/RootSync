import { CommunityPostHeader } from "@/components/CommunityPostHeader";
import { GivePulseButton } from "@/components/pulse/GivePulseButton";
import { PulsePostContent } from "@/components/pulse/PulsePostContent";
import { PulsePostMediaGallery } from "@/components/pulse/PulsePostMediaGallery";
import { Card } from "@/components/ui/Card";
import type { PulsePostMediaItem } from "@/config/pulsePostMedia";
import { isPulseHtmlContent, plainTextToPulseHtml } from "@/lib/pulsePostHtml";
import type { UserProfilePeer } from "@/lib/userProfileDisplay";

export type PulseFeedPost = {
  id: string;
  content: string;
  media: PulsePostMediaItem[];
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
  const html = isPulseHtmlContent(post.content)
    ? post.content
    : post.content
      ? plainTextToPulseHtml(post.content)
      : "";
  const showLegacyGallery = !isPulseHtmlContent(post.content) && post.media.length > 0;

  return (
    <Card className="p-5 shadow-soft">
      <CommunityPostHeader
        author={post.author}
        roleAtPost={post.roleAtPost}
        showVendorBadge={post.showVendorBadge}
        createdAt={post.createdAt}
        editedAt={post.editedAt}
      />
      <PulsePostContent html={html} />
      {showLegacyGallery ? <PulsePostMediaGallery media={post.media} /> : null}
      <GivePulseButton
        postId={post.id}
        authorId={post.authorId}
        initialCount={post.pulseCount}
        initialGiven={post.viewerGavePulse}
      />
    </Card>
  );
}

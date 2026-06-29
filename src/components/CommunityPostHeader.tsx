import Link from "next/link";

import { CommunityPostRoleBadge } from "@/components/CommunityPostRoleBadge";
import { MessageUserLink } from "@/components/MessageUserLink";
import { UserAvatar } from "@/components/UserAvatar";
import {
  publicProfileHref,
  resolveUserAvatarUrl,
  resolveUserDisplayName,
  type UserProfilePeer,
} from "@/lib/userProfileDisplay";
import { formatCommunityDate, formatCommunityDateTime } from "@/lib/formatCommunityDate";

type Props = {
  author: UserProfilePeer;
  roleAtPost: string;
  showVendorBadge: boolean;
  createdAt: string;
  editedAt?: string | null;
  showMessageLink?: boolean;
};

export function CommunityPostHeader({
  author,
  roleAtPost,
  showVendorBadge,
  createdAt,
  editedAt = null,
  showMessageLink = true,
}: Props) {
  const displayName = resolveUserDisplayName(author);
  const avatarUrl = resolveUserAvatarUrl(author);
  const profileHref = publicProfileHref(author);

  return (
    <div className="flex gap-3">
      <Link
        href={profileHref}
        className="shrink-0 rounded-full outline-none ring-fix-cta focus-visible:ring-2 focus-visible:ring-offset-2"
        aria-label={`View ${displayName}'s profile`}
      >
        <UserAvatar src={avatarUrl} name={displayName} size="md" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <CommunityPostRoleBadge
            roleAtPost={roleAtPost}
            showVendorBadge={showVendorBadge}
            authorRole={author.role}
          />
          <Link
            href={profileHref}
            className="text-sm font-medium text-fix-heading hover:text-fix-link hover:underline"
          >
            {displayName}
          </Link>
          {showMessageLink ? <MessageUserLink targetUserId={author.id} /> : null}
          <span className="text-xs text-fix-text-muted">
            <span>{formatCommunityDate(createdAt)}</span>
            {editedAt ? (
              <>
                <span className="mx-1.5">·</span>
                <span>Edited {formatCommunityDateTime(editedAt)}</span>
              </>
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
}

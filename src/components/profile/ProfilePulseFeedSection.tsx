import Link from "next/link";

import { CommunityPostHeader } from "@/components/CommunityPostHeader";
import { MessageUserLink } from "@/components/MessageUserLink";
import { PulseIcon } from "@/components/pulse/PulseIcon";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PULSE_HREF } from "@/config/platformNav";
import type { UserProfilePeer } from "@/lib/userProfileDisplay";

type PulsePost = {
  id: string;
  content: string;
  roleAtPost: string;
  showVendorBadge: boolean;
  createdAt: Date;
  editedAt: Date | null;
  author: UserProfilePeer;
};

type Props = {
  headingId: string;
  displayName: string;
  posts: PulsePost[];
  messageUserId: string;
  isSelf?: boolean;
  showMessageLink?: boolean;
  className?: string;
};

export function ProfilePulseFeedSection({
  headingId,
  displayName,
  posts,
  messageUserId,
  isSelf = false,
  showMessageLink = true,
  className = "",
}: Props) {
  return (
    <section className={className} aria-labelledby={headingId}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2
            id={headingId}
            className="text-base font-semibold tracking-tight text-fix-heading sm:text-lg"
          >
            Check The Pulse
          </h2>
          <p className="mt-1 text-sm text-fix-text-muted">
            Public updates from {displayName} on{" "}
            <Link
              href={PULSE_HREF}
              className="inline-flex items-center gap-1 font-medium text-fix-link hover:text-fix-link-hover"
            >
              Pulse
              <PulseIcon size={14} alt="" />
            </Link>
          </p>
        </div>
        {showMessageLink ? <MessageUserLink targetUserId={messageUserId} className="shrink-0" /> : null}
      </div>
      {posts.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            bordered={false}
            title="No pulses yet"
            description={
              isSelf
                ? "Share an update on Pulse to introduce yourself."
                : `${displayName} hasn't posted on Pulse yet.`
            }
            action={isSelf ? { href: PULSE_HREF, label: "Go to Pulse", variant: "secondary" } : undefined}
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
                  showMessageLink={showMessageLink && !isSelf}
                />
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-fix-text">{p.content}</p>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

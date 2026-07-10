import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import { Card } from "@/components/ui/Card";

type Props = {
  displayName: string;
  imageUrl?: string | null;
  profileHref: string;
  editProfileHref?: string;
};

const linkClass =
  "text-fix-link transition-colors hover:text-fix-link-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 rounded-sm";

export function AccountProfileCard({
  displayName,
  imageUrl,
  profileHref,
  editProfileHref = "/account/settings?section=account",
}: Props) {
  return (
    <Card className="p-4 shadow-soft">
      <div className="flex items-center gap-4">
        <Link
          href={profileHref}
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2"
        >
          <UserAvatar src={imageUrl} name={displayName} size="lg" />
        </Link>
        <div className="min-w-0 flex-1">
          <Link
            href={profileHref}
            className="block truncate text-base font-semibold text-fix-heading transition-colors hover:text-fix-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 rounded-sm"
          >
            {displayName}
          </Link>
          <p className="mt-0.5 text-sm text-fix-text-muted">
            <Link href={profileHref} className={linkClass}>
              View your profile
            </Link>
            <span aria-hidden="true"> | </span>
            <Link href={editProfileHref} className={linkClass}>
              Edit your profile
            </Link>
          </p>
        </div>
        <Link
          href={profileHref}
          className="inline-flex shrink-0 rounded-lg p-1 text-fix-text-muted transition-colors hover:bg-fix-bg-muted/40 hover:text-fix-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2"
          aria-label="View your profile"
        >
          <ChevronRight className="h-5 w-5" aria-hidden />
        </Link>
      </div>
    </Card>
  );
}

import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import { Card } from "@/components/ui/Card";

type Props = {
  displayName: string;
  subtitle?: string;
  imageUrl?: string | null;
  profileHref: string;
};

export function AccountProfileCard({ displayName, subtitle, imageUrl, profileHref }: Props) {
  return (
    <Card className="p-4 shadow-soft">
      <Link
        href={profileHref}
        className="flex items-center gap-4 rounded-xl transition-colors hover:bg-fix-bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2"
      >
        <UserAvatar src={imageUrl} name={displayName} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-fix-heading">{displayName}</p>
          <p className="mt-0.5 text-sm text-fix-text-muted">{subtitle ?? "View your profile"}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-fix-text-muted" aria-hidden />
      </Link>
    </Card>
  );
}

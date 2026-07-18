import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Bookmark } from "lucide-react";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { FavoriteButton } from "@/components/FavoriteButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { authOptions } from "@/lib/authOptions";
import { listSavedFavorites } from "@/lib/favorites";
import { FAVORITE_TARGET_TYPE } from "@/lib/roles";

const TYPE_LABEL: Record<string, string> = {
  [FAVORITE_TARGET_TYPE.LISTING]: "Listing",
  [FAVORITE_TARGET_TYPE.VENDOR]: "Vendor",
  [FAVORITE_TARGET_TYPE.DIRECTORY]: "Directory",
};

export default async function AccountSavedPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/saved");
  }

  const favorites = await listSavedFavorites(session.user.id);

  return (
    <AccountSubpageBody description="Your favorite listings, vendors, and directory places.">
      {favorites.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Bookmark}
            title="No favorites yet"
            description="Tap the bookmark on a Discover listing, vendor, or directory place to add it to your favorites."
            action={{ href: "/discover", label: "Browse Discover", variant: "cta" }}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {favorites.map((item) => (
            <li key={item.id}>
              <Card className="flex items-start gap-3 p-4 sm:items-center sm:gap-4 sm:p-5">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-fix-text-muted">
                    {TYPE_LABEL[item.targetType] ?? item.targetType}
                  </p>
                  <Link
                    href={item.href}
                    className="mt-1 block text-base font-semibold text-fix-heading hover:text-fix-link"
                  >
                    {item.title}
                  </Link>
                  {item.subtitle ? (
                    <p className="mt-0.5 text-sm text-fix-text-muted">{item.subtitle}</p>
                  ) : null}
                </div>
                <FavoriteButton
                  targetType={item.targetType}
                  targetId={item.targetId}
                  initialSaved
                  signedIn
                  size="sm"
                />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </AccountSubpageBody>
  );
}

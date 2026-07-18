"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";

import { DiscoverCollapsibleSection } from "@/components/DiscoverCollapsibleSection";
import { FavoriteButton } from "@/components/FavoriteButton";
import { ListingImage } from "@/components/ListingImage";
import { UserAvatar } from "@/components/UserAvatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FAVORITE_TARGET_TYPE, type FavoriteTargetType } from "@/lib/roles";
import { rememberDiscoverResults } from "@/lib/discoverReturn";

export type DiscoverFavoriteItem = {
  id: string;
  targetType: FavoriteTargetType;
  targetId: string;
  title: string;
  subtitle: string | null;
  href: string;
  imageUrl: string | null;
};

const TYPE_LABEL: Record<FavoriteTargetType, string> = {
  [FAVORITE_TARGET_TYPE.LISTING]: "Listing",
  [FAVORITE_TARGET_TYPE.VENDOR]: "Vendor",
  [FAVORITE_TARGET_TYPE.DIRECTORY]: "Directory",
};

type Props = {
  favorites: DiscoverFavoriteItem[];
  discoverResultsHref: string;
  buildDetailHref: (
    detailPath: string,
    kind: "vendor" | "directory" | "listing",
    id: string,
  ) => string;
  defaultOpen?: boolean;
};

function kindForType(targetType: FavoriteTargetType): "vendor" | "directory" | "listing" {
  if (targetType === FAVORITE_TARGET_TYPE.VENDOR) return "vendor";
  if (targetType === FAVORITE_TARGET_TYPE.DIRECTORY) return "directory";
  return "listing";
}

export function DiscoverFavoritesSection({
  favorites,
  discoverResultsHref,
  buildDetailHref,
  defaultOpen = true,
}: Props) {
  const rememberResults = () => rememberDiscoverResults(discoverResultsHref);

  return (
    <DiscoverCollapsibleSection
      id="discover-favorites"
      title="Your favorites"
      description="Your favorite vendors, listings, and directory places — only visible to you."
      count={favorites.length}
      defaultOpen={defaultOpen}
      headerExtra={
        <Link
          href="/account/saved"
          className="text-sm font-medium text-fix-link hover:text-fix-link-hover"
          onClick={(e) => e.stopPropagation()}
        >
          Manage favorites →
        </Link>
      }
    >
      {favorites.length === 0 ? (
        <EmptyState
          bordered
          icon={Bookmark}
          title="No favorites yet"
          description="Tap the bookmark on a vendor, listing, or directory place to add it to your favorites."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((item) => {
            const detailHref = buildDetailHref(
              item.href,
              kindForType(item.targetType),
              item.targetId,
            );
            return (
              <li key={item.id}>
                <Card className="flex h-full flex-col p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    {item.targetType === FAVORITE_TARGET_TYPE.VENDOR ? (
                      <UserAvatar src={item.imageUrl} name={item.title} size="md" className="shrink-0" />
                    ) : item.targetType === FAVORITE_TARGET_TYPE.LISTING && item.imageUrl ? (
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-fix-bg-muted">
                        <ListingImage src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-fix-bg-muted text-fix-text-muted">
                        <Bookmark className="h-5 w-5" aria-hidden />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-fix-text-muted">
                        {TYPE_LABEL[item.targetType]}
                      </p>
                      <Link
                        href={detailHref}
                        onClick={rememberResults}
                        className="mt-0.5 block text-sm font-semibold text-fix-heading hover:text-fix-link hover:underline"
                      >
                        {item.title}
                      </Link>
                      {item.subtitle ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-fix-text-muted">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                    <FavoriteButton
                      targetType={item.targetType}
                      targetId={item.targetId}
                      initialSaved
                      signedIn
                      size="sm"
                    />
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </DiscoverCollapsibleSection>
  );
}

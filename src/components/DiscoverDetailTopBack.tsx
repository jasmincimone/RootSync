import { DiscoverDetailBackLink } from "@/components/DiscoverDetailBackLink";
import { safeDiscoverResultsPath } from "@/lib/discoverReturn";

type Props = {
  returnTo?: string | null;
};

/** Shown at the top of Discover detail pages when opened from search results. */
export function DiscoverDetailTopBack({ returnTo }: Props) {
  if (!safeDiscoverResultsPath(returnTo)) return null;

  return (
    <div className="mb-3 sm:mb-4">
      <DiscoverDetailBackLink
        returnTo={returnTo}
        className="inline-flex items-center text-sm font-medium text-fix-link hover:text-fix-link-hover"
      />
    </div>
  );
}

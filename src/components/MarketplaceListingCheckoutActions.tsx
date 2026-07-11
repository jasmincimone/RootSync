import { ButtonLink } from "@/components/ui/Button";
import { discoverListingPath } from "@/config/discoverPaths";
import { withDiscoverReturnTo } from "@/lib/discoverReturn";
import { LISTING_TYPE } from "@/lib/roles";

type Props = {
  listingId: string;
  listingType?: string;
  compact?: boolean;
  /** When set, listing detail back navigation returns here (e.g. vendor profile). */
  returnTo?: string | null;
};

/**
 * Browse-card CTA — always goes to the listing detail page.
 * Option selection and checkout happen there, not on vendor/discover cards.
 */
export function MarketplaceListingCheckoutActions({
  listingId,
  listingType,
  compact = false,
  returnTo,
}: Props) {
  const isService = listingType === LISTING_TYPE.SERVICE;
  const isEvent = listingType === LISTING_TYPE.EVENT;
  const baseHref = discoverListingPath(listingId);
  const href = returnTo ? withDiscoverReturnTo(baseHref, returnTo) : baseHref;

  const label = isService ? "Book now" : isEvent ? "Get tickets" : "Buy now";

  return (
    <ButtonLink
      href={href}
      variant="cta"
      size={compact ? "sm" : "md"}
      className={compact ? "w-full justify-center" : undefined}
    >
      {label}
    </ButtonLink>
  );
}

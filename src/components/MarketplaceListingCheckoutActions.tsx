import { ButtonLink } from "@/components/ui/Button";
import { LISTING_TYPE } from "@/lib/roles";

type Props = {
  listingId: string;
  listingType?: string;
  compact?: boolean;
};

/**
 * Browse-card CTA — always goes to the listing detail page.
 * Option selection and checkout happen there, not on vendor/discover cards.
 */
export function MarketplaceListingCheckoutActions({
  listingId,
  listingType,
  compact = false,
}: Props) {
  const isService = listingType === LISTING_TYPE.SERVICE;

  return (
    <ButtonLink
      href={`/discover/listings/${listingId}`}
      variant="cta"
      size={compact ? "sm" : "md"}
      className={compact ? "w-full justify-center" : undefined}
    >
      {isService ? "Book now" : "Buy now"}
    </ButtonLink>
  );
}

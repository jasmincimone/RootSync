"use client";

import { useState } from "react";

import { BuyNowButton } from "@/components/BuyNowButton";
import {
  ListingVariantSelector,
  type ListingVariant,
} from "@/components/ListingVariantSelector";
import { ButtonLink } from "@/components/ui/Button";

type Props = {
  listingId: string;
  listingType: string;
  variants: ListingVariant[];
  paymentUrl?: string | null;
  productUrl?: string | null;
  compact?: boolean;
};

export function MarketplaceListingPurchase({
  listingId,
  listingType,
  variants,
  paymentUrl,
  productUrl,
  compact = false,
}: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null,
  );
  const isService = listingType === "SERVICE";
  const needsVariant = variants.length > 0;
  const bookHref =
    selectedVariantId && needsVariant
      ? `/marketplace/listings/${listingId}/book?variant=${encodeURIComponent(selectedVariantId)}`
      : `/marketplace/listings/${listingId}/book`;

  return (
    <div className={compact ? "flex flex-col gap-3" : "flex flex-col gap-4"}>
      {needsVariant ? (
        <ListingVariantSelector
          variants={variants}
          selectedId={selectedVariantId}
          onSelect={setSelectedVariantId}
          listingType={listingType}
        />
      ) : null}

      <div className={compact ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2"}>
        {isService ? (
          <ButtonLink
            href={bookHref}
            variant="cta"
            size={compact ? "sm" : "md"}
            className={compact ? "w-full justify-center" : undefined}
          >
            Book now
          </ButtonLink>
        ) : (
          <BuyNowButton
            listingId={listingId}
            variantId={selectedVariantId}
            size={compact ? "sm" : "md"}
            fullWidth={compact}
            disabled={needsVariant && !selectedVariantId}
          />
        )}
        {paymentUrl ? (
          <a
            href={paymentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={
              compact
                ? "inline-flex w-full items-center justify-center rounded-full border border-fix-border/25 bg-fix-surface px-4 py-2 text-sm font-medium text-fix-link ring-1 ring-inset ring-fix-border/15 hover:bg-fix-bg-muted"
                : "inline-flex h-11 items-center justify-center rounded-full border border-fix-border/25 bg-fix-surface px-5 text-sm font-medium text-fix-link ring-1 ring-inset ring-fix-border/15 hover:bg-fix-bg-muted"
            }
          >
            Alternate checkout
          </a>
        ) : null}
        {productUrl ? (
          <a
            href={productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={
              compact
                ? "inline-flex w-full items-center justify-center text-sm font-medium text-fix-link hover:text-fix-link-hover"
                : "inline-flex h-11 items-center justify-center rounded-full border border-fix-border/25 bg-fix-surface px-5 text-sm font-medium text-fix-link ring-1 ring-inset ring-fix-border/15 hover:bg-fix-bg-muted"
            }
          >
            Product page
          </a>
        ) : null}
        {isService ? (
          <p className="w-full text-xs text-fix-text-muted">
            Sign in to complete booking. Choose an option above, then continue to payment.
          </p>
        ) : variants.length > 0 ? (
          <p className="w-full text-xs text-fix-text-muted">
            Choose an option above, then continue to checkout.
          </p>
        ) : null}
      </div>
    </div>
  );
}

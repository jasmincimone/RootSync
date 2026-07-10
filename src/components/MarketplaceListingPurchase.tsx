"use client";

import { useState } from "react";

import { BuyNowButton } from "@/components/BuyNowButton";
import { BuyNowLink } from "@/components/BuyNowLink";
import {
  ListingVariantSelector,
  type ListingVariant,
} from "@/components/ListingVariantSelector";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Props = {
  listingId: string;
  listingType: string;
  variants: ListingVariant[];
  paymentLinkUrl?: string | null;
  productUrl?: string | null;
  stripeCheckoutReady?: boolean;
  compact?: boolean;
};

const secondaryCheckoutClass =
  "inline-flex items-center justify-center rounded-full border border-fix-border/25 bg-fix-surface font-medium text-fix-link ring-1 ring-inset ring-fix-border/15 hover:bg-fix-bg-muted";

export function MarketplaceListingPurchase({
  listingId,
  listingType,
  variants,
  paymentLinkUrl,
  productUrl,
  stripeCheckoutReady = false,
  compact = false,
}: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null,
  );
  const isService = listingType === "SERVICE";
  const needsVariant = variants.length > 0;
  const bookHref =
    selectedVariantId && needsVariant
      ? `/discover/listings/${listingId}/book?variant=${encodeURIComponent(selectedVariantId)}`
      : `/discover/listings/${listingId}/book`;

  const hasPaymentLink = !!paymentLinkUrl?.trim();
  const hasStripeCheckout = stripeCheckoutReady;
  const variantBlocked = needsVariant && !selectedVariantId;

  function renderProductCheckout() {
    if (hasStripeCheckout && hasPaymentLink) {
      return (
        <>
          <BuyNowButton
            listingId={listingId}
            variantId={selectedVariantId}
            size={compact ? "sm" : "md"}
            fullWidth={compact}
            disabled={variantBlocked}
          />
          <a
            href={paymentLinkUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              secondaryCheckoutClass,
              compact ? "h-9 w-full px-3 text-sm" : "h-11 px-5 text-sm",
            )}
          >
            Pay Link
          </a>
        </>
      );
    }

    if (hasPaymentLink) {
      return (
        <BuyNowLink
          href={paymentLinkUrl!}
          size={compact ? "sm" : "md"}
          className={compact ? "w-full" : undefined}
        >
          Buy now
        </BuyNowLink>
      );
    }

    return (
      <BuyNowButton
        listingId={listingId}
        variantId={selectedVariantId}
        size={compact ? "sm" : "md"}
        fullWidth={compact}
        disabled={variantBlocked}
      />
    );
  }

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
          renderProductCheckout()
        )}
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

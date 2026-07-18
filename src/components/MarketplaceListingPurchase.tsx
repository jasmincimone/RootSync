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
import { LISTING_TYPE } from "@/lib/roles";

type Props = {
  listingId: string;
  listingType: string;
  priceCents?: number;
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
  priceCents = 0,
  variants,
  paymentLinkUrl,
  productUrl,
  stripeCheckoutReady = false,
  compact = false,
}: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null,
  );
  const isService = listingType === LISTING_TYPE.SERVICE;
  const isEvent = listingType === LISTING_TYPE.EVENT;
  const isResource = listingType === LISTING_TYPE.RESOURCE;
  const needsVariant = variants.length > 0;
  const selectedVariant = selectedVariantId
    ? variants.find((variant) => variant.id === selectedVariantId)
    : null;
  const effectivePriceCents = selectedVariant?.priceCents ?? priceCents;
  const freeCheckoutUnsupported =
    (isEvent || isResource) && (!Number.isFinite(effectivePriceCents) || effectivePriceCents <= 0);
  const bookHref =
    selectedVariantId && needsVariant
      ? `/discover/listings/${listingId}/book?variant=${encodeURIComponent(selectedVariantId)}`
      : `/discover/listings/${listingId}/book`;

  const hasPaymentLink = !!paymentLinkUrl?.trim();
  const hasStripeCheckout = stripeCheckoutReady;
  const variantBlocked = needsVariant && !selectedVariantId;
  const checkoutUnavailable = !hasStripeCheckout && !hasPaymentLink;
  const externalFulfillmentNote =
    isEvent || isResource
      ? " The Vendor handles access and fulfillment for external purchases."
      : "";

  function renderProductCheckout() {
    if (freeCheckoutUnsupported) {
      return (
        <p className="w-full rounded-xl border border-fix-border/15 bg-fix-bg-muted/40 px-4 py-3 text-sm text-fix-text-muted">
          {isEvent
            ? "Free tickets aren't available through RootSync checkout yet. Contact the Vendor through Stay Synced."
            : "Free Resources aren't available through RootSync checkout yet. Contact the Vendor through Stay Synced."}
        </p>
      );
    }

    const buyLabel = isEvent ? "Get tickets" : "Buy now";
    const linkLabel = isEvent ? "Ticket link" : "Pay Link";

    if (hasStripeCheckout && hasPaymentLink) {
      return (
        <>
          <BuyNowButton
            listingId={listingId}
            variantId={selectedVariantId}
            size={compact ? "sm" : "md"}
            fullWidth={compact}
            disabled={variantBlocked}
            label={buyLabel}
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
            {linkLabel}
          </a>
          <p className="w-full text-xs text-fix-text-muted">
            {linkLabel} opens the vendor&apos;s external checkout (off-platform — no RootSync
            platform fee). Prefer in-app checkout when available.
            {externalFulfillmentNote}
          </p>
        </>
      );
    }

    if (hasStripeCheckout) {
      return (
        <BuyNowButton
          listingId={listingId}
          variantId={selectedVariantId}
          size={compact ? "sm" : "md"}
          fullWidth={compact}
          disabled={variantBlocked}
          label={buyLabel}
        />
      );
    }

    if (hasPaymentLink) {
      return (
        <>
          <BuyNowLink
            href={paymentLinkUrl!}
            size={compact ? "sm" : "md"}
            className={compact ? "w-full" : undefined}
          >
            {buyLabel}
          </BuyNowLink>
          <p className="w-full text-xs text-fix-text-muted">
            External checkout — off-platform payment (no RootSync platform fee).
            {externalFulfillmentNote}
          </p>
        </>
      );
    }

    return (
      <p className="w-full rounded-xl border border-fix-border/15 bg-fix-bg-muted/40 px-4 py-3 text-sm text-fix-text-muted">
        Checkout isn&apos;t available yet for this listing. The vendor still needs to finish payment
        setup.
      </p>
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
          hasStripeCheckout || hasPaymentLink ? (
            <ButtonLink
              href={bookHref}
              variant="cta"
              size={compact ? "sm" : "md"}
              className={compact ? "w-full justify-center" : undefined}
            >
              Book now
            </ButtonLink>
          ) : (
            <p className="w-full rounded-xl border border-fix-border/15 bg-fix-bg-muted/40 px-4 py-3 text-sm text-fix-text-muted">
              Booking isn&apos;t available yet — this vendor still needs to finish payment setup.
            </p>
          )
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
        {isService && !checkoutUnavailable ? (
          <p className="w-full text-xs text-fix-text-muted">
            Sign in to complete booking. Choose an option above, then continue to payment.
          </p>
        ) : !isService && variants.length > 0 && !checkoutUnavailable ? (
          <p className="w-full text-xs text-fix-text-muted">
            {isEvent
              ? "Choose a ticket tier above, then continue to checkout."
              : "Choose an option above, then continue to checkout."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

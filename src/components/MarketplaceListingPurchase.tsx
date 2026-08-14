"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { BuyNowButton } from "@/components/BuyNowButton";
import { BuyNowLink } from "@/components/BuyNowLink";
import { ClaimFreeResourceButton } from "@/components/ClaimFreeResourceButton";
import { FulfillmentModePicker } from "@/components/FulfillmentModePicker";
import {
  emptyUnitSelections,
  ListingDealConfigurator,
  type ListingDeal,
  type UnitSelectionDraft,
} from "@/components/ListingDealConfigurator";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { discoverBookPath } from "@/config/discoverPaths";
import { addLineToCart } from "@/lib/cart";
import type { CheckoutFulfillmentMode } from "@/lib/checkoutFulfillment";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import type { SerializedOfferingOptionGroup } from "@/lib/offeringOptions";
import { LISTING_TYPE } from "@/lib/roles";

type Props = {
  listingId: string;
  listingTitle: string;
  imageUrl?: string | null;
  publicSlug?: string | null;
  listingType: string;
  priceCents?: number;
  variants: ListingDeal[];
  optionGroups?: SerializedOfferingOptionGroup[];
  vendorProfileId: string;
  vendorDisplayName: string;
  vendorPublicSlug?: string | null;
  paymentLinkUrl?: string | null;
  productUrl?: string | null;
  stripeCheckoutReady?: boolean;
  /** Product-level remaining stock; null/undefined = unlimited */
  inventoryQuantity?: number | null;
  requiresShipping?: boolean;
  offersLocalPickup?: boolean;
  pickupLocation?: string | null;
  shippingFlatCents?: number | null;
  compact?: boolean;
};

const secondaryCheckoutClass =
  "inline-flex items-center justify-center rounded-full border border-fix-border/25 bg-fix-surface font-medium text-fix-link ring-1 ring-inset ring-fix-border/15 hover:bg-fix-bg-muted";

export function MarketplaceListingPurchase({
  listingId,
  listingTitle,
  imageUrl = null,
  publicSlug = null,
  listingType,
  priceCents = 0,
  variants,
  optionGroups = [],
  vendorProfileId,
  vendorDisplayName,
  vendorPublicSlug = null,
  paymentLinkUrl,
  productUrl,
  stripeCheckoutReady = false,
  inventoryQuantity = null,
  requiresShipping = false,
  offersLocalPickup = true,
  pickupLocation = null,
  shippingFlatCents = null,
  compact = false,
}: Props) {
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    variants[0]?.id ?? null,
  );
  const [unitSelections, setUnitSelections] = useState<UnitSelectionDraft[]>(() =>
    emptyUnitSelections(variants[0]?.unitsIncluded ?? 1, optionGroups),
  );
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const [cartError, setCartError] = useState<string | null>(null);
  const [fulfillmentMode, setFulfillmentMode] = useState<CheckoutFulfillmentMode | null>(null);

  const isService = listingType === LISTING_TYPE.SERVICE;
  const isEvent = listingType === LISTING_TYPE.EVENT;
  const isResource = listingType === LISTING_TYPE.RESOURCE;
  const needsVariant = variants.length > 0;
  const selectedVariant = selectedVariantId
    ? variants.find((variant) => variant.id === selectedVariantId)
    : null;
  const effectivePriceCents = selectedVariant?.priceCents ?? priceCents;
  const availableStock =
    listingType === LISTING_TYPE.PRODUCT
      ? selectedVariant?.inventoryQuantity != null
        ? selectedVariant.inventoryQuantity
        : inventoryQuantity
      : null;
  const soldOut = availableStock != null && availableStock <= 0;
  const isFreeResource =
    isResource && Number.isFinite(effectivePriceCents) && effectivePriceCents <= 0;
  const freeEventUnsupported =
    isEvent && (!Number.isFinite(effectivePriceCents) || effectivePriceCents <= 0);
  const bookHref = discoverBookPath(
    { id: listingId, publicSlug },
    selectedVariantId && needsVariant ? selectedVariantId : null,
  );

  const hasPaymentLink = !!paymentLinkUrl?.trim();
  const hasStripeCheckout = stripeCheckoutReady;
  const variantBlocked = needsVariant && !selectedVariantId;
  const optionsIncomplete =
    optionGroups.length > 0 &&
    (unitSelections.length !== (selectedVariant?.unitsIncluded ?? 1) ||
      unitSelections.some((row) =>
        optionGroups.some(
          (g) => !row.choices.some((c) => c.groupId === g.id && c.valueId),
        ),
      ));
  const checkoutBlocked = variantBlocked || optionsIncomplete;
  const checkoutUnavailable = !hasStripeCheckout && !hasPaymentLink;
  const canAddToCart =
    hasStripeCheckout &&
    !isService &&
    !isEvent &&
    !isFreeResource &&
    !soldOut &&
    !checkoutBlocked;
  const externalFulfillmentNote =
    isEvent || isResource
      ? " The Vendor handles access and fulfillment for external purchases."
      : "";

  useEffect(() => {
    if (!selectedVariantId) return;
    const deal = variants.find((v) => v.id === selectedVariantId);
    if (!deal) return;
    setUnitSelections(emptyUnitSelections(deal.unitsIncluded, optionGroups));
  }, [selectedVariantId, variants, optionGroups]);

  function buildDetailLabel(): string {
    const parts: string[] = [];
    if (selectedVariant?.title) parts.push(selectedVariant.title);
    if (optionGroups.length > 0 && unitSelections.length > 0) {
      const labels = unitSelections.map((unit) => {
        const choices = unit.choices
          .map((choice) => {
            const group = optionGroups.find((g) => g.id === choice.groupId);
            const value = group?.values.find((v) => v.id === choice.valueId);
            if (!group || !value) return null;
            return `${group.name}: ${value.label}`;
          })
          .filter(Boolean);
        return unitSelections.length > 1
          ? `Item ${unit.unit} (${choices.join(", ")})`
          : choices.join(", ");
      });
      parts.push(labels.join(" · "));
    }
    return parts.filter(Boolean).join(" · ");
  }

  function handleAddToCart() {
    setCartError(null);
    setCartMessage(null);
    if (!canAddToCart) return;
    const result = addLineToCart({
      listingId,
      listingTitle,
      imageUrl,
      vendorProfileId,
      vendorDisplayName,
      vendorPublicSlug,
      listingType,
      variantId: selectedVariantId,
      variantTitle: selectedVariant?.title ?? null,
      unitSelections: optionGroups.length > 0 ? unitSelections : null,
      unitPriceCents: effectivePriceCents,
      detailLabel: buildDetailLabel() || formatPrice(effectivePriceCents),
      quantity: 1,
      requiresShipping,
      offersLocalPickup,
      shippingFlatCents,
      pickupLocation,
    });
    if (!result.ok) {
      setCartError(result.error);
      return;
    }
    setCartMessage("Added to cart.");
  }

  function renderProductCheckout() {
    if (soldOut) {
      return (
        <p className="w-full rounded-xl border border-fix-border/15 bg-fix-bg-muted/40 px-4 py-3 text-sm font-medium text-fix-heading">
          Sold out
        </p>
      );
    }

    if (isFreeResource) {
      return (
        <ClaimFreeResourceButton
          listingId={listingId}
          variantId={selectedVariantId}
          size={compact ? "sm" : "md"}
          fullWidth={compact}
          disabled={checkoutBlocked}
        />
      );
    }

    if (freeEventUnsupported) {
      return (
        <p className="w-full rounded-xl border border-fix-border/15 bg-fix-bg-muted/40 px-4 py-3 text-sm text-fix-text-muted">
          Free tickets aren&apos;t available through RootSync checkout yet. Contact the Vendor through
          Stay Synced.
        </p>
      );
    }

    const buyLabel = isEvent ? "Get tickets" : "Buy now";
    const linkLabel = isEvent ? "Ticket link" : "Pay Link";
    const buyNowProps = {
      listingId,
      variantId: selectedVariantId,
      unitSelections: optionGroups.length > 0 ? unitSelections : null,
      size: (compact ? "sm" : "md") as "sm" | "md",
      fullWidth: compact,
      disabled: checkoutBlocked,
      label: buyLabel,
      fulfillmentMode,
      requiresFulfillmentChoice: requiresShipping && hasStripeCheckout,
    };
    const addToCartButton = canAddToCart ? (
      <Button
        type="button"
        variant="secondary"
        size={compact ? "sm" : "md"}
        className={compact ? "w-full" : undefined}
        disabled={checkoutBlocked}
        onClick={handleAddToCart}
      >
        Add to cart
      </Button>
    ) : null;
    const fulfillmentPicker =
      requiresShipping && hasStripeCheckout ? (
        <FulfillmentModePicker
          className="w-full"
          value={fulfillmentMode}
          onChange={setFulfillmentMode}
          offersLocalPickup={offersLocalPickup}
          pickupLocation={pickupLocation}
          shippingFlatCents={shippingFlatCents}
        />
      ) : null;

    if (hasStripeCheckout && hasPaymentLink) {
      return (
        <>
          {fulfillmentPicker}
          <BuyNowButton {...buyNowProps} />
          {addToCartButton}
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
        <>
          {fulfillmentPicker}
          <BuyNowButton {...buyNowProps} />
          {addToCartButton}
        </>
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

  const showConfigurator = needsVariant || optionGroups.length > 0;

  return (
    <div className={compact ? "flex flex-col gap-3" : "flex flex-col gap-4"}>
      {showConfigurator ? (
        <ListingDealConfigurator
          deals={variants}
          optionGroups={isService || isEvent ? [] : optionGroups}
          selectedDealId={selectedVariantId}
          onSelectDeal={setSelectedVariantId}
          unitSelections={unitSelections}
          onChangeUnitSelections={setUnitSelections}
          listingType={listingType}
        />
      ) : null}

      {availableStock != null && availableStock > 0 ? (
        <p className="text-sm text-fix-text-muted">
          {availableStock === 1 ? "1 left" : `${availableStock} available`}
        </p>
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
        {cartMessage ? (
          <p className="w-full text-sm text-forest">
            {cartMessage}{" "}
            <Link href="/cart" className="font-semibold underline hover:text-fix-link-hover">
              View cart
            </Link>
          </p>
        ) : null}
        {cartError ? <p className="w-full text-sm text-bark">{cartError}</p> : null}
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
            Sign in to complete booking. Choose a deal above, then continue to payment.
          </p>
        ) : isFreeResource && variants.length > 0 ? (
          <p className="w-full text-xs text-fix-text-muted">
            Choose a deal above, then download.
          </p>
        ) : !isService && !isFreeResource && showConfigurator && !checkoutUnavailable ? (
          <p className="w-full text-xs text-fix-text-muted">
            {isEvent
              ? "Choose a ticket tier above, then continue to checkout."
              : optionGroups.length > 0
                ? "Choose a deal and options for each item, then continue to checkout."
                : "Choose a deal above, then continue to checkout."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

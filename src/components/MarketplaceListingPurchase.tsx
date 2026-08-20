"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";

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
import { discoverBookPath, discoverVendorListingsPath } from "@/config/discoverPaths";
import { BOOKING_CANCELLATION_POLICY_SHORT } from "@/lib/bookingPolicy";
import { addLineToCart } from "@/lib/cart";
import {
  listingUsesShipping,
  resolveServiceCheckoutMode,
  type CheckoutFulfillmentMode,
} from "@/lib/checkoutFulfillment";
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
  /** Listing sells through its own external pay link, so RootSync checkout is withheld. */
  externalCheckoutOnly?: boolean;
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
  externalCheckoutOnly = false,
  inventoryQuantity = null,
  requiresShipping = false,
  offersLocalPickup = false,
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
  const [quantity, setQuantity] = useState(1);

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
  const hasStripeCheckout = stripeCheckoutReady && !externalCheckoutOnly;
  const isPhysicalProduct = listingUsesShipping(listingType, requiresShipping);
  const serviceCheckoutMode = isService
    ? resolveServiceCheckoutMode({
        externalCheckoutOnly,
        hasPaymentLink,
        hasStripeCheckout,
      })
    : "unavailable";
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
  const maxQuantity = Math.max(1, Math.min(99, availableStock ?? 99));
  // In-app checkout carries a quantity; external pay links cannot.
  const showQuantityPicker =
    hasStripeCheckout &&
    (listingType === LISTING_TYPE.PRODUCT || isEvent) &&
    !soldOut &&
    !isFreeResource &&
    !freeEventUnsupported;
  function changeQuantity(next: number) {
    if (!Number.isFinite(next)) return;
    setQuantity(Math.max(1, Math.min(maxQuantity, Math.floor(next))));
  }

  useEffect(() => {
    if (!selectedVariantId) return;
    const deal = variants.find((v) => v.id === selectedVariantId);
    if (!deal) return;
    setUnitSelections(emptyUnitSelections(deal.unitsIncluded, optionGroups));
    setQuantity(1);
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
      quantity,
      requiresShipping: isPhysicalProduct,
      offersLocalPickup,
      shippingFlatCents,
      pickupLocation,
    });
    if (!result.ok) {
      setCartError(result.error);
      return;
    }
    setCartMessage(quantity > 1 ? `Added ${quantity} to cart.` : "Added to cart.");
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
    const linkLabel = isEvent ? "Vendor ticket link" : "Vendor checkout";
    const buyNowProps = {
      listingId,
      variantId: selectedVariantId,
      unitSelections: optionGroups.length > 0 ? unitSelections : null,
      size: (compact ? "sm" : "md") as "sm" | "md",
      fullWidth: compact,
      disabled: checkoutBlocked,
      label: buyLabel,
      quantity,
      vendorDisplayName,
      fulfillmentMode: isPhysicalProduct && !offersLocalPickup ? "ship" : fulfillmentMode,
      requiresFulfillmentChoice: isPhysicalProduct && hasStripeCheckout && offersLocalPickup,
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
      isPhysicalProduct && hasStripeCheckout && offersLocalPickup ? (
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
            {linkLabel} opens the vendor&apos;s checkout in a new tab. You can also check out
            directly through RootSync above.
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
            {isEvent || isResource
              ? "Payment continues on the vendor’s website in a new tab. The vendor will provide access after purchase."
              : "Checkout continues on the vendor’s website in a new tab. The vendor manages payment and fulfillment."}
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

      {showQuantityPicker ? (
        <div className="flex flex-wrap items-center gap-3">
          <span id={`qty-label-${listingId}`} className="text-sm font-medium text-fix-text">
            {isEvent ? "Tickets" : "Quantity"}
          </span>
          <div
            className="inline-flex items-center gap-1 rounded-full border border-fix-border/25 bg-fix-surface p-1 ring-1 ring-inset ring-fix-border/15"
            role="group"
            aria-labelledby={`qty-label-${listingId}`}
          >
            <button
              type="button"
              onClick={() => changeQuantity(quantity - 1)}
              disabled={quantity <= 1}
              aria-label={isEvent ? "Remove one ticket" : "Decrease quantity"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fix-heading transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxQuantity}
              value={quantity}
              onChange={(e) => changeQuantity(Number.parseInt(e.target.value, 10))}
              onBlur={(e) => changeQuantity(Number.parseInt(e.target.value, 10) || 1)}
              aria-label={isEvent ? "Ticket quantity" : "Quantity"}
              className="w-12 border-0 bg-transparent text-center text-sm font-semibold text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-amber [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => changeQuantity(quantity + 1)}
              disabled={quantity >= maxQuantity}
              aria-label={isEvent ? "Add one ticket" : "Increase quantity"}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fix-heading transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {quantity > 1 ? (
            <span className="text-sm text-fix-text-muted">
              {formatPrice(effectivePriceCents * quantity)} total
            </span>
          ) : null}
        </div>
      ) : null}

      <div className={compact ? "flex flex-col gap-2" : "flex flex-wrap items-center gap-2"}>
        {isService ? (
          serviceCheckoutMode === "external_pay_link" ? (
            <>
              <BuyNowLink
                href={paymentLinkUrl!}
                size={compact ? "sm" : "md"}
                className={compact ? "w-full" : undefined}
              >
                Book now
              </BuyNowLink>
              <p className="w-full text-xs text-fix-text-muted">
                Booking and payment continue on the vendor&apos;s website in a new tab.
              </p>
            </>
          ) : serviceCheckoutMode === "rootsync_booking" ? (
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
        {!compact ? (
          <ButtonLink
            href={discoverVendorListingsPath({ id: vendorProfileId, publicSlug: vendorPublicSlug })}
            variant="secondary"
            size="md"
          >
            Keep shopping
          </ButtonLink>
        ) : null}
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
        {isService && !externalCheckoutOnly && !checkoutUnavailable ? (
          <p className="w-full text-xs text-fix-text-muted">
            Choose a deal above, then pick a time. {BOOKING_CANCELLATION_POLICY_SHORT}
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

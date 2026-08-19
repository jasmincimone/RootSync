import { LISTING_TYPE } from "@/lib/roles";

/** Buyer choice before Stripe Checkout for physical products. */
export type CheckoutFulfillmentMode = "pickup" | "ship";

export function parseCheckoutFulfillmentMode(raw: unknown): CheckoutFulfillmentMode | null {
  if (raw === "pickup" || raw === "ship") return raw;
  return null;
}

export function listingUsesShipping(listingType: string, requiresShipping: boolean): boolean {
  return listingType === LISTING_TYPE.PRODUCT && requiresShipping;
}

/** Listing override when set; otherwise vendor profile flat rate (null → $0). */
export function resolveEffectiveShippingFlatCents(args: {
  listingShippingFlatCents: number | null | undefined;
  vendorShippingFlatCents: number | null | undefined;
}): number {
  if (
    typeof args.listingShippingFlatCents === "number" &&
    Number.isFinite(args.listingShippingFlatCents)
  ) {
    return Math.max(0, Math.round(args.listingShippingFlatCents));
  }
  return Math.max(0, Math.round(args.vendorShippingFlatCents ?? 0));
}

export function formatFlatShippingLabel(cents: number | null | undefined): string {
  if (cents == null || cents <= 0) return "Free shipping";
  const formatted = (cents / 100).toFixed(cents % 100 === 0 ? 0 : 2);
  return `$${formatted} shipping`;
}

/** Pickup is listing opt-in. Vendor profile is a master switch (off = never). */
export function listingOffersLocalPickup(args: {
  listingOffersLocalPickup: boolean;
  vendorOffersLocalPickup?: boolean;
}): boolean {
  return Boolean(args.listingOffersLocalPickup) && args.vendorOffersLocalPickup !== false;
}

/**
 * Shipping-only listings skip the buyer choice and check out as ship.
 * Pickup is only valid when the listing (and vendor) opted in.
 */
export function resolveShippingFulfillmentMode(args: {
  requiresShipping: boolean;
  offersLocalPickup: boolean;
  fulfillmentMode: CheckoutFulfillmentMode | null | undefined;
}): CheckoutFulfillmentMode | null {
  if (!args.requiresShipping) return null;
  if (!args.offersLocalPickup) {
    if (args.fulfillmentMode === "pickup") {
      throw new Error("This listing is shipping only. Choose ship / deliver instead.");
    }
    return "ship";
  }
  if (args.fulfillmentMode !== "pickup" && args.fulfillmentMode !== "ship") {
    throw new Error("Choose pickup / in person or ship / deliver before checkout.");
  }
  return args.fulfillmentMode;
}

export type ServiceCheckoutMode = "external_pay_link" | "rootsync_booking" | "unavailable";

export function resolveServiceCheckoutMode(args: {
  externalCheckoutOnly: boolean;
  hasPaymentLink: boolean;
  hasStripeCheckout: boolean;
}): ServiceCheckoutMode {
  const mode =
    args.externalCheckoutOnly && args.hasPaymentLink
      ? "external_pay_link"
      : args.hasStripeCheckout || args.hasPaymentLink
        ? "rootsync_booking"
        : "unavailable";
  return mode;
}

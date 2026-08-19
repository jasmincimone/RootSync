/** Client-side cart for same-vendor Discover checkout (localStorage). */

import { listingUsesShipping } from "@/lib/checkoutFulfillment";

export const CART_STORAGE_KEY = "rootsync.cart.v1";
export const CART_CHANGED_EVENT = "rootsync:cart-changed";

export type CartUnitChoice = {
  groupId: string;
  valueId: string;
};

export type CartUnitSelection = {
  unit: number;
  choices: CartUnitChoice[];
};

export type CartLine = {
  /** Stable client id for remove/update */
  key: string;
  listingId: string;
  listingTitle: string;
  imageUrl: string | null;
  vendorProfileId: string;
  vendorDisplayName: string;
  vendorPublicSlug: string | null;
  listingType: string;
  variantId: string | null;
  variantTitle: string | null;
  unitSelections: CartUnitSelection[] | null;
  unitPriceCents: number;
  quantity: number;
  /** Human summary of deal + options for the bag UI */
  detailLabel: string;
  /** Physical product that needs pickup vs ship choice */
  requiresShipping: boolean;
  /** Listing opted into in-person / local pickup */
  offersLocalPickup: boolean;
  /** Effective ship rate for this line (listing override or vendor default) */
  shippingFlatCents: number | null;
};

export type CartState = {
  vendorProfileId: string | null;
  vendorDisplayName: string | null;
  vendorPublicSlug: string | null;
  /** Vendor pickup availability for the cart's vendor (from last add) */
  offersLocalPickup: boolean;
  shippingFlatCents: number | null;
  pickupLocation: string | null;
  lines: CartLine[];
};

export function emptyCart(): CartState {
  return {
    vendorProfileId: null,
    vendorDisplayName: null,
    vendorPublicSlug: null,
    offersLocalPickup: false,
    shippingFlatCents: null,
    pickupLocation: null,
    lines: [],
  };
}

/** Highest ship rate among shippable lines (one package from one vendor). */
function cartShippingFromLines(lines: CartLine[]): number | null {
  const rates = lines
    .filter((line) => line.requiresShipping)
    .map((line) => Math.max(0, line.shippingFlatCents ?? 0));
  if (rates.length === 0) return null;
  return Math.max(...rates);
}

/** Pickup only if every physical line opted in on its listing. */
function cartOffersPickupFromLines(lines: CartLine[]): boolean {
  const physical = lines.filter((line) => line.requiresShipping);
  return physical.length > 0 && physical.every((line) => line.offersLocalPickup);
}

export function cartLineCount(cart: CartState): number {
  return cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function cartSubtotalCents(cart: CartState): number {
  return cart.lines.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);
}

export function makeCartLineKey(args: {
  listingId: string;
  variantId: string | null;
  unitSelections: CartUnitSelection[] | null;
}): string {
  return [
    args.listingId,
    args.variantId ?? "",
    args.unitSelections ? JSON.stringify(args.unitSelections) : "",
  ].join("|");
}

export function readCart(): CartState {
  if (typeof window === "undefined") return emptyCart();
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return emptyCart();
    const parsed = JSON.parse(raw) as CartState;
    if (!parsed || !Array.isArray(parsed.lines)) return emptyCart();
    const lines = parsed.lines
      .filter(
        (line) =>
          line &&
          typeof line.key === "string" &&
          typeof line.listingId === "string" &&
          typeof line.unitPriceCents === "number" &&
          typeof line.quantity === "number" &&
          line.quantity > 0,
      )
      .map((line) => ({
        ...line,
        vendorPublicSlug:
          typeof line.vendorPublicSlug === "string" ? line.vendorPublicSlug : null,
        requiresShipping:
          listingUsesShipping(
            line.listingType,
            typeof line.requiresShipping === "boolean" ? line.requiresShipping : true,
          ),
        offersLocalPickup: line.offersLocalPickup === true,
        shippingFlatCents:
          typeof line.shippingFlatCents === "number" ? line.shippingFlatCents : null,
      }));
    return {
      vendorProfileId: parsed.vendorProfileId ?? null,
      vendorDisplayName: parsed.vendorDisplayName ?? null,
      vendorPublicSlug:
        typeof parsed.vendorPublicSlug === "string" ? parsed.vendorPublicSlug : null,
      offersLocalPickup: cartOffersPickupFromLines(lines),
      shippingFlatCents:
        cartShippingFromLines(lines) ??
        (typeof parsed.shippingFlatCents === "number" ? parsed.shippingFlatCents : null),
      pickupLocation: typeof parsed.pickupLocation === "string" ? parsed.pickupLocation : null,
      lines,
    };
  } catch {
    return emptyCart();
  }
}

export function writeCart(cart: CartState): void {
  if (typeof window === "undefined") return;
  const next: CartState =
    cart.lines.length === 0
      ? emptyCart()
      : {
          vendorProfileId: cart.vendorProfileId,
          vendorDisplayName: cart.vendorDisplayName,
          vendorPublicSlug: cart.vendorPublicSlug,
          offersLocalPickup: cart.offersLocalPickup,
          shippingFlatCents: cart.shippingFlatCents,
          pickupLocation: cart.pickupLocation,
          lines: cart.lines,
        };
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

export function clearCart(): void {
  writeCart(emptyCart());
}

export type AddToCartResult =
  | { ok: true; cart: CartState }
  | { ok: false; error: string };

export function addLineToCart(
  input: Omit<CartLine, "key" | "quantity"> & {
    quantity?: number;
    offersLocalPickup?: boolean;
    pickupLocation?: string | null;
  },
): AddToCartResult {
  const quantity = Math.max(1, Math.min(99, input.quantity ?? 1));
  const cart = readCart();

  if (cart.vendorProfileId && cart.vendorProfileId !== input.vendorProfileId) {
    return {
      ok: false,
      error: `Your cart has items from ${cart.vendorDisplayName ?? "another vendor"}. Checkout or clear the cart before adding from ${input.vendorDisplayName}.`,
    };
  }

  const key = makeCartLineKey({
    listingId: input.listingId,
    variantId: input.variantId,
    unitSelections: input.unitSelections,
  });

  const existing = cart.lines.find((line) => line.key === key);
  const {
    offersLocalPickup = false,
    pickupLocation = null,
    quantity: _ignoredQty,
    ...lineFields
  } = input;

  const lines = existing
    ? cart.lines.map((line) =>
        line.key === key
          ? { ...line, quantity: Math.min(99, line.quantity + quantity) }
          : line,
      )
    : [
        ...cart.lines,
        {
          ...lineFields,
          offersLocalPickup,
          key,
          quantity,
        },
      ];

  const next: CartState = {
    vendorProfileId: input.vendorProfileId,
    vendorDisplayName: input.vendorDisplayName,
    vendorPublicSlug: input.vendorPublicSlug,
    offersLocalPickup: cartOffersPickupFromLines(lines),
    shippingFlatCents: cartShippingFromLines(lines),
    pickupLocation,
    lines,
  };
  writeCart(next);
  return { ok: true, cart: next };
}

export function updateCartLineQuantity(key: string, quantity: number): CartState {
  const cart = readCart();
  const qty = Math.floor(quantity);
  const lines =
    qty < 1
      ? cart.lines.filter((line) => line.key !== key)
      : cart.lines.map((line) =>
          line.key === key ? { ...line, quantity: Math.min(99, qty) } : line,
        );
  const next: CartState =
    lines.length === 0
      ? emptyCart()
      : {
          ...cart,
          lines,
          shippingFlatCents: cartShippingFromLines(lines),
          offersLocalPickup: cartOffersPickupFromLines(lines),
        };
  writeCart(next);
  return next;
}

export function removeCartLine(key: string): CartState {
  const cart = readCart();
  const lines = cart.lines.filter((line) => line.key !== key);
  const next =
    lines.length === 0
      ? emptyCart()
      : {
          ...cart,
          lines,
          shippingFlatCents: cartShippingFromLines(lines),
          offersLocalPickup: cartOffersPickupFromLines(lines),
        };
  writeCart(next);
  return next;
}

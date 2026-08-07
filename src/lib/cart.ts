/** Client-side cart for same-vendor Discover checkout (localStorage). */

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
  listingType: string;
  variantId: string | null;
  variantTitle: string | null;
  unitSelections: CartUnitSelection[] | null;
  unitPriceCents: number;
  quantity: number;
  /** Human summary of deal + options for the bag UI */
  detailLabel: string;
};

export type CartState = {
  vendorProfileId: string | null;
  vendorDisplayName: string | null;
  lines: CartLine[];
};

export function emptyCart(): CartState {
  return { vendorProfileId: null, vendorDisplayName: null, lines: [] };
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
    return {
      vendorProfileId: parsed.vendorProfileId ?? null,
      vendorDisplayName: parsed.vendorDisplayName ?? null,
      lines: parsed.lines.filter(
        (line) =>
          line &&
          typeof line.key === "string" &&
          typeof line.listingId === "string" &&
          typeof line.unitPriceCents === "number" &&
          typeof line.quantity === "number" &&
          line.quantity > 0,
      ),
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

export function addLineToCart(input: Omit<CartLine, "key" | "quantity"> & { quantity?: number }): AddToCartResult {
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
  const lines = existing
    ? cart.lines.map((line) =>
        line.key === key
          ? { ...line, quantity: Math.min(99, line.quantity + quantity) }
          : line,
      )
    : [
        ...cart.lines,
        {
          ...input,
          key,
          quantity,
        },
      ];

  const next: CartState = {
    vendorProfileId: input.vendorProfileId,
    vendorDisplayName: input.vendorDisplayName,
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
      : { ...cart, lines };
  writeCart(next);
  return next;
}

export function removeCartLine(key: string): CartState {
  const cart = readCart();
  const lines = cart.lines.filter((line) => line.key !== key);
  const next = lines.length === 0 ? emptyCart() : { ...cart, lines };
  writeCart(next);
  return next;
}

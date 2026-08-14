/** Buyer choice before Stripe Checkout for physical products. */
export type CheckoutFulfillmentMode = "pickup" | "ship";

export function parseCheckoutFulfillmentMode(raw: unknown): CheckoutFulfillmentMode | null {
  if (raw === "pickup" || raw === "ship") return raw;
  return null;
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

import { Container } from "@/components/Container";
import { CheckoutAuthGate } from "@/components/CheckoutAuthGate";
import { FulfillmentModePicker } from "@/components/FulfillmentModePicker";
import { ListingImage } from "@/components/ListingImage";
import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { discoverVendorListingsPath } from "@/config/discoverPaths";
import {
  CART_CHANGED_EVENT,
  cartSubtotalCents,
  clearCart,
  emptyCart,
  readCart,
  removeCartLine,
  updateCartLineQuantity,
  type CartState,
} from "@/lib/cart";
import type { CheckoutFulfillmentMode } from "@/lib/checkoutFulfillment";
import { formatPrice } from "@/lib/format";
import { ShoppingBag } from "lucide-react";

export function CartPageClient() {
  const { data: session, status } = useSession();
  const [cart, setCart] = useState<CartState>(() =>
    typeof window === "undefined" ? emptyCart() : readCart(),
  );
  const [email, setEmail] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [guestCheckout, setGuestCheckout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fulfillmentMode, setFulfillmentMode] = useState<CheckoutFulfillmentMode | null>(null);

  useEffect(() => {
    function sync() {
      setCart(readCart());
    }
    sync();
    window.addEventListener(CART_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const sessionEmail = session?.user?.email?.trim() ?? "";
  const needsEmail = status !== "loading" && !sessionEmail;
  const subtotal = cartSubtotalCents(cart);
  const needsFulfillmentChoice = cart.lines.some((line) => line.requiresShipping);
  const buyerMustChooseFulfillment = needsFulfillmentChoice && cart.offersLocalPickup;
  const keepShoppingHref = cart.vendorProfileId
    ? discoverVendorListingsPath({
        id: cart.vendorProfileId,
        publicSlug: cart.vendorPublicSlug,
      })
    : "/discover";

  async function checkout(checkoutEmail: string) {
    if (buyerMustChooseFulfillment && !fulfillmentMode) {
      setError("Choose pickup / in person or ship / deliver before checkout.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketplace/cart/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: checkoutEmail,
          fulfillmentMode: needsFulfillmentChoice
            ? buyerMustChooseFulfillment
              ? fulfillmentMode
              : "ship"
            : undefined,
          items: cart.lines.map((line) => ({
            listingId: line.listingId,
            quantity: line.quantity,
            variantId: line.variantId,
            unitSelections: line.unitSelections,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not start checkout.");
      }
      if (typeof data.url !== "string" || !data.url) {
        throw new Error("Checkout URL missing from server.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
      setLoading(false);
    }
  }

  function handleCheckoutClick() {
    if (buyerMustChooseFulfillment && !fulfillmentMode) {
      setError("Choose pickup / in person or ship / deliver before checkout.");
      return;
    }
    if (needsEmail && !guestCheckout && !showEmail) {
      setShowAuthGate(true);
      return;
    }
    if (needsEmail && !showEmail) {
      setShowEmail(true);
      return;
    }
    const checkoutEmail = sessionEmail || email.trim();
    if (!checkoutEmail) {
      setError("Enter your email to continue.");
      return;
    }
    void checkout(checkoutEmail);
  }

  if (cart.lines.length === 0) {
    return (
      <Container className="py-12">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          description="Add products from a vendor listing, then come back here to check out everything together."
          action={{ href: "/discover", label: "Browse Discover", variant: "cta" }}
        />
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fix-heading">Cart</h1>
          {cart.vendorDisplayName ? (
            <p className="mt-1 text-sm text-fix-text-muted">
              Shopping with <span className="font-medium text-fix-heading">{cart.vendorDisplayName}</span>
              {" · "}
              one vendor per checkout
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            clearCart();
            setCart(readCart());
          }}
          className="text-sm font-medium text-fix-text-muted hover:text-bark"
        >
          Clear cart
        </button>
      </div>

      <ul className="mt-6 space-y-3">
        {cart.lines.map((line) => (
          <li key={line.key}>
            <Card className="p-4">
              <div className="flex gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-fix-border/15 bg-fix-bg-muted">
                  {line.imageUrl ? <ListingImage src={line.imageUrl} alt="" /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/discover/listings/${line.listingId}`}
                    className="font-medium text-fix-heading hover:text-fix-link hover:underline"
                  >
                    {line.listingTitle}
                  </Link>
                  {line.detailLabel ? (
                    <p className="mt-0.5 text-xs text-fix-text-muted">{line.detailLabel}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-fix-text">
                      Qty
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={line.quantity}
                        onChange={(e) => {
                          const next = updateCartLineQuantity(
                            line.key,
                            Number.parseInt(e.target.value, 10) || 1,
                          );
                          setCart(next);
                        }}
                        className="w-16 rounded-lg border border-fix-border/20 bg-fix-surface px-2 py-1 text-sm"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setCart(removeCartLine(line.key))}
                      className="text-xs font-medium text-fix-text-muted hover:text-bark"
                    >
                      Remove
                    </button>
                    <span className="ml-auto text-sm font-semibold text-fix-heading">
                      {formatPrice(line.unitPriceCents * line.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <Card className="mt-6 space-y-4 p-5">
        <CheckoutAuthGate
          variant="modal"
          open={showAuthGate}
          onClose={() => setShowAuthGate(false)}
          callbackUrl="/cart"
          guestLabel="Checkout as guest"
          onGuestContinue={() => {
            setGuestCheckout(true);
            setShowEmail(true);
          }}
        />
        <div className="flex items-center justify-between text-base">
          <span className="font-medium text-fix-text-muted">Subtotal</span>
          <span className="font-semibold text-fix-heading">{formatPrice(subtotal)}</span>
        </div>

        {buyerMustChooseFulfillment ? (
          <FulfillmentModePicker
            value={fulfillmentMode}
            onChange={(mode) => {
              setFulfillmentMode(mode);
              setError(null);
            }}
            offersLocalPickup={cart.offersLocalPickup}
            pickupLocation={cart.pickupLocation}
            shippingFlatCents={cart.shippingFlatCents}
          />
        ) : null}

        {showEmail && needsEmail ? (
          <div>
            <label htmlFor="cart-email" className="block text-sm font-medium text-fix-text">
              Email for receipt
            </label>
            <input
              id="cart-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
            />
          </div>
        ) : null}

        {error ? <p className="text-sm text-bark">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="cta"
            size="md"
            disabled={loading || status === "loading"}
            onClick={handleCheckoutClick}
          >
            {loading
              ? "Redirecting…"
              : showEmail && needsEmail
                ? "Continue to checkout"
                : "Checkout"}
          </Button>
          <ButtonLink href={keepShoppingHref} variant="secondary" size="md">
            Keep shopping
          </ButtonLink>
        </div>
      </Card>
    </Container>
  );
}

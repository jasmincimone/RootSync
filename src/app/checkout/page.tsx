"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { Container } from "@/components/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";

const SHIPPING_CENTS = 599;

export default function CheckoutPage() {
  const { items, itemCount, clearCart, resolveProduct } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("US");

  const lineItems = items
    .map((item) => {
      const product = resolveProduct(item.productId);
      if (!product) return null;
      return {
        key: item.key,
        product,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity,
        selections: item.selections ?? {},
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const hasPhysical = lineItems.some((l) => l.product.type === "physical");
  const subtotal = lineItems.reduce((s, l) => s + l.lineTotal, 0);
  const shipping = hasPhysical ? SHIPPING_CENTS : 0;
  const total = subtotal + shipping;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);
      if (itemCount === 0) {
        setError("Your cart is empty.");
        return;
      }
      if (!email.trim()) {
        setError("Please enter your email.");
        return;
      }
      if (hasPhysical) {
        if (!name.trim() || !line1.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
          setError("Please fill in all shipping fields.");
          return;
        }
      }
      setSubmitting(true);
      try {
        const res = await fetch("/api/checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: email.trim(),
            ...(hasPhysical && {
              shippingAddress: {
                name: name.trim(),
                line1: line1.trim(),
                line2: line2.trim() || undefined,
                city: city.trim(),
                state: state.trim(),
                postalCode: postalCode.trim(),
                country: country.trim(),
              },
            }),
            items: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              selections: i.selections ?? undefined,
            })),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Failed to start checkout.");
          setSubmitting(false);
          return;
        }
        if (data.url) {
          clearCart();
          setSuccess("Submitted. Redirecting to secure payment…");
          setSubmitting(false);
          window.setTimeout(() => {
            window.location.href = data.url as string;
          }, 500);
          return;
        }
        setError("No checkout URL returned. Please try again.");
        setSubmitting(false);
      } catch {
        setError("Something went wrong. Check your connection and try again.");
        setSubmitting(false);
      }
    },
    [items, itemCount, email, name, line1, line2, city, state, postalCode, country, hasPhysical, clearCart]
  );

  if (itemCount === 0 && lineItems.length === 0) {
    return (
      <Container className="py-12 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-fix-heading">Checkout</h1>
        <p className="mt-4 text-fix-text-muted">Your cart is empty. Add items to checkout.</p>
        <div className="mt-6">
          <Link href="/marketplace" className="text-fix-link hover:text-fix-link-hover hover:underline">
            Continue shopping →
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
        Checkout
      </h1>
      <p className="mt-2 text-fix-text-muted">Enter your details to complete your order.</p>
      {!hasPhysical && lineItems.length > 0 && (
        <p className="mt-2 text-sm text-forest">
          Your cart contains only digital items — no shipping address required.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-8">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-fix-heading">Contact</h2>
              <div className="mt-4">
                <label htmlFor="checkout-email" className="block text-sm font-medium text-fix-text">
                  Email
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text placeholder:text-fix-text-muted/70 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                  placeholder="you@example.com"
                />
              </div>
            </Card>

            {hasPhysical && (
              <Card className="p-6">
                <h2 className="text-lg font-semibold text-fix-heading">Shipping address</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="checkout-name" className="block text-sm font-medium text-fix-text">Full name</label>
                    <input id="checkout-name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text placeholder:text-fix-text-muted/70 focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber" />
                  </div>
                  <div>
                    <label htmlFor="checkout-line1" className="block text-sm font-medium text-fix-text">Address line 1</label>
                    <input id="checkout-line1" type="text" required value={line1} onChange={(e) => setLine1(e.target.value)} className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber" />
                  </div>
                  <div>
                    <label htmlFor="checkout-line2" className="block text-sm font-medium text-fix-text">Address line 2 (optional)</label>
                    <input id="checkout-line2" type="text" value={line2} onChange={(e) => setLine2(e.target.value)} className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="checkout-city" className="block text-sm font-medium text-fix-text">City</label>
                      <input id="checkout-city" type="text" required value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber" />
                    </div>
                    <div>
                      <label htmlFor="checkout-state" className="block text-sm font-medium text-fix-text">State</label>
                      <input id="checkout-state" type="text" required value={state} onChange={(e) => setState(e.target.value)} className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="checkout-postal" className="block text-sm font-medium text-fix-text">Postal code</label>
                      <input id="checkout-postal" type="text" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber" />
                    </div>
                    <div>
                      <label htmlFor="checkout-country" className="block text-sm font-medium text-fix-text">Country</label>
                      <input id="checkout-country" type="text" required value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber" />
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div>
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-semibold text-fix-heading">Order summary</h2>
              <ul className="mt-4 space-y-2 text-sm">
                {lineItems.map(({ key, product, quantity, lineTotal, selections }) => {
                  const selectionSummary = (product.options ?? [])
                    .map((opt) => {
                      const choiceId = selections[opt.id];
                      if (!choiceId) return null;
                      const choice = opt.choices.find((c) => c.id === choiceId);
                      if (!choice) return null;
                      return `${choice.label}`;
                    })
                    .filter((x): x is string => x != null)
                    .join(", ");

                  return (
                    <li key={key} className="flex justify-between">
                      <span className="text-fix-text-muted">
                        {product.name}
                        {selectionSummary ? ` (${selectionSummary})` : ""} × {quantity}
                      </span>
                    <span className="font-medium text-fix-heading">{formatPrice(lineTotal)}</span>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-4 space-y-2 border-t border-fix-border/15 pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-fix-text-muted">Subtotal</dt>
                  <dd className="font-medium text-fix-heading">{formatPrice(subtotal)}</dd>
                </div>
                {hasPhysical && (
                  <div className="flex justify-between">
                    <dt className="text-fix-text-muted">Shipping</dt>
                    <dd className="font-medium text-fix-heading">{formatPrice(shipping)}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-fix-border/15 pt-3 text-base">
                  <dt className="font-semibold text-fix-heading">Total</dt>
                  <dd className="font-semibold text-fix-heading">{formatPrice(total)}</dd>
                </div>
              </dl>
              <div className="mt-4">
                <FormFeedback success={success} error={error} />
              </div>
              <p className="mt-4 text-xs text-fix-text-muted">
                You&apos;ll be redirected to Stripe to pay securely. Cards are never stored on our servers.
              </p>
              <Button type="submit" disabled={submitting || !!success} className="mt-6 w-full" size="lg" variant="cta">
                {submitting || success ? "Redirecting…" : "Proceed to payment"}
              </Button>
            </Card>
          </div>
        </div>
      </form>
    </Container>
  );
}

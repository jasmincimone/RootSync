"use client";

import Link from "next/link";

import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/lib/format";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProductImage } from "@/components/ProductImage";

const SHIPPING_CENTS = 599;

export function CartContent() {
  const { items, updateQuantity, removeItem, itemCount, resolveProduct } = useCart();

  const lineItems = items
    .map((item) => {
      const product = resolveProduct(item.productId);
      if (!product) return null;
      const selections = item.selections ?? {};
      const selectionLabels = (product.options ?? [])
        .map((opt) => {
          const choiceId = selections[opt.id];
          if (!choiceId) return null;
          const choice = opt.choices.find((c) => c.id === choiceId);
          if (!choice) return null;
          return `${opt.label}: ${choice.label}`;
        })
        .filter((x): x is string => x != null);
      return {
        key: item.key,
        product,
        quantity: item.quantity,
        lineTotal: product.price * item.quantity,
        selectionLabels,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null);

  const hasPhysical = lineItems.some((l) => l.product?.type === "physical");
  const subtotal = lineItems.reduce((s, l) => s + l.lineTotal, 0);
  const shipping = hasPhysical ? SHIPPING_CENTS : 0;
  const total = subtotal + shipping;

  if (itemCount === 0) {
    return (
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-8 lg:col-span-2">
          <h2 className="text-lg font-semibold text-fix-heading">Your cart</h2>
          <p className="mt-2 text-fix-text-muted">Your cart is empty.</p>
          <div className="mt-6">
            <ButtonLink href="/marketplace" variant="primary" size="md">
              Continue shopping
            </ButtonLink>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-fix-heading">Summary</h2>
          <p className="mt-2 text-sm text-fix-text-muted">Add items to see totals.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2">
        <h2 className="text-lg font-semibold text-fix-heading">Cart ({itemCount} items)</h2>
        <ul className="mt-4 divide-y divide-fix-border/15">
          {lineItems.map(({ key, product, quantity, lineTotal, selectionLabels }) => {
            if (!product) return null;
            return (
              <li key={key} className="flex gap-4 py-4 first:pt-0">
                <Link
                  href={`/products/${product.id}`}
                  className="block shrink-0 overflow-hidden rounded-xl ring-1 ring-inset ring-fix-border/10"
                  aria-label={`${product.name} — view product`}
                >
                  <ProductImage
                    shop={product.shop}
                    productId={product.id}
                    src={product.image}
                    alt=""
                    fit={product.imageFit ?? "cover"}
                    placeholderText={product.type === "digital" ? "Digital" : "Product"}
                    className="aspect-square w-20 rounded-xl bg-fix-bg-muted"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${product.id}`}
                    className="font-medium text-fix-link hover:text-fix-link-hover hover:underline"
                  >
                    {product.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-fix-text-muted">
                    {product.type === "digital" ? "Digital" : "Physical"} •{" "}
                    {formatPrice(product.price)} each
                  </p>
                  {selectionLabels.length > 0 && (
                    <p className="mt-1 text-xs text-fix-text-muted">{selectionLabels.join(" • ")}</p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <label className="sr-only" htmlFor={`qty-${key}`}>
                      Quantity
                    </label>
                    <select
                      id={`qty-${key}`}
                      value={quantity}
                      onChange={(e) =>
                        updateQuantity(key, parseInt(e.target.value, 10))
                      }
                      className="rounded-lg border border-fix-border/20 bg-fix-surface px-2 py-1 text-sm text-fix-text focus:border-amber focus:ring-1 focus:ring-amber"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeItem(key)}
                      className="text-sm text-fix-text-muted hover:text-bark"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="shrink-0 text-right font-semibold text-fix-heading">
                  {formatPrice(lineTotal)}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4">
          <ButtonLink href="/marketplace" variant="secondary" size="sm">
            Continue shopping
          </ButtonLink>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-sm font-semibold text-fix-heading">Summary</h2>
        {!hasPhysical && itemCount > 0 && (
          <p className="mt-2 text-xs text-forest">
            Digital only — no shipping fee.
          </p>
        )}
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-fix-text-muted">Subtotal</dt>
            <dd className="font-medium text-fix-heading">{formatPrice(subtotal)}</dd>
          </div>
          {hasPhysical && (
            <div className="flex justify-between">
              <dt className="text-fix-text-muted">Shipping</dt>
              <dd className="font-medium text-fix-heading">
                {formatPrice(SHIPPING_CENTS)}
              </dd>
            </div>
          )}
          <div className="flex justify-between border-t border-fix-border/15 pt-3 text-base">
            <dt className="font-semibold text-fix-heading">Total</dt>
            <dd className="font-semibold text-fix-heading">{formatPrice(total)}</dd>
          </div>
        </dl>
        <div className="mt-6">
          <ButtonLink href="/checkout" variant="cta" size="lg" className="w-full">
            Proceed to checkout
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}

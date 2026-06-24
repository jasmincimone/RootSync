"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

import { Container } from "@/components/Container";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { formatPrice } from "@/lib/format";

type OrderFromApi = {
  id: string;
  email: string;
  status: string;
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shippingName: string | null;
  shippingLine1: string | null;
  shippingLine2: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostal: string | null;
  shippingCountry: string | null;
  trackingCarrier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    name: string;
    quantity: number;
    priceCents: number;
    type: string;
    format: string | null;
  }>;
};

export function OrderConfirmationClient() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [order, setOrder] = useState<OrderFromApi | null>(null);
  const [loading, setLoading] = useState(!!sessionId);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    fetch(`/api/orders/by-session?session_id=${encodeURIComponent(sessionId)}`)
      .then((res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        return res.json();
      })
      .then((data) => {
        setOrder(data);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <Container className="py-12 sm:py-16">
        <p className="text-fix-text-muted">Loading your order…</p>
      </Container>
    );
  }

  if (notFound || !order) {
    return (
      <Container className="py-12 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-fix-heading">
          Order not found
        </h1>
        <p className="mt-4 text-fix-text-muted">
          We couldn&apos;t find that order. It may have expired or the link is invalid.
        </p>
        <div className="mt-6">
          <ButtonLink href="/marketplace" size="lg" variant="primary">
            Continue shopping
          </ButtonLink>
        </div>
      </Container>
    );
  }

  const date = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const hasShipping =
    order.shippingName &&
    order.shippingLine1 &&
    order.shippingCity &&
    order.shippingState &&
    order.shippingPostal;

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-forest/15 text-forest">
            <svg
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-fix-heading">
            Thank you for your order
          </h1>
          <p className="mt-2 text-fix-text-muted">
            Order <strong className="text-fix-heading">{order.id}</strong> placed on {date}.
          </p>
          <p className="mt-1 text-sm text-fix-text-muted">
            A confirmation has been sent to <strong className="text-fix-heading">{order.email}</strong>.
          </p>
        </div>

        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold text-fix-heading">Order details</h2>
          <ul className="mt-4 divide-y divide-fix-border/15">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-3 first:pt-0">
                <span className="text-fix-text">
                  {item.name} × {item.quantity}
                  <span className="ml-1.5 text-xs text-fix-text-muted">
                    ({item.type === "digital" ? "Digital" : "Physical"})
                  </span>
                </span>
                <span className="font-medium text-fix-heading shrink-0">
                  {formatPrice(item.priceCents * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-fix-border/15 pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-fix-text-muted">Subtotal</dt>
              <dd className="font-medium text-fix-heading">{formatPrice(order.subtotalCents)}</dd>
            </div>
            {order.shippingCents > 0 && (
              <div className="flex justify-between">
                <dt className="text-fix-text-muted">Shipping</dt>
                <dd className="font-medium text-fix-heading">{formatPrice(order.shippingCents)}</dd>
              </div>
            )}
            <div className="flex justify-between border-t border-fix-border/15 pt-3 text-base">
              <dt className="font-semibold text-fix-heading">Total</dt>
              <dd className="font-semibold text-fix-heading">{formatPrice(order.totalCents)}</dd>
            </div>
          </dl>

          {order.items.some((i) => i.type === "digital") && (
            <div className="mt-6 rounded-xl border border-forest/20 bg-forest/5 p-4">
              <h3 className="text-sm font-semibold text-forest">Digital items</h3>
              <p className="mt-1 text-sm text-fix-text-muted">
                Download links are in your account. Go to{" "}
                <Link href="/account/orders" className="text-fix-link hover:text-fix-link-hover underline">
                  Order history
                </Link>{" "}
                and open this order to download.
              </p>
            </div>
          )}

          {order.trackingNumber && (
            <div className="mt-6 rounded-xl border border-fix-border/15 bg-fix-bg-muted/50 p-4">
              <h3 className="text-sm font-semibold text-fix-heading">Tracking</h3>
              <p className="mt-1 text-sm text-fix-text-muted">
                {order.trackingCarrier && <span>{order.trackingCarrier}: </span>}
                <span className="font-medium text-fix-heading">{order.trackingNumber}</span>
              </p>
            </div>
          )}

          {hasShipping && (
            <div className="mt-6 border-t border-fix-border/15 pt-6">
              <h3 className="text-sm font-semibold text-fix-heading">Shipping to</h3>
              <p className="mt-2 text-sm text-fix-text-muted">
                {order.shippingName}
                <br />
                {order.shippingLine1}
                {order.shippingLine2 && (
                  <>
                    <br />
                    {order.shippingLine2}
                  </>
                )}
                <br />
                {order.shippingCity}, {order.shippingState} {order.shippingPostal}
                <br />
                {order.shippingCountry}
              </p>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/account/orders" size="md" variant="primary">
              View order history
            </ButtonLink>
            <ButtonLink href="/marketplace" size="md" variant="secondary">
              Continue shopping
            </ButtonLink>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-full border border-fix-border/20 bg-fix-surface px-4 text-sm font-medium text-fix-heading hover:bg-fix-bg-muted focus:outline-none focus:ring-2 focus:ring-amber focus:ring-offset-2 focus:ring-offset-fix-bg"
            >
              Back to home
            </Link>
          </div>
        </Card>
      </div>
    </Container>
  );
}

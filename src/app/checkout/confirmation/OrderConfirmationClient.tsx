"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

import { Container } from "@/components/Container";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { BookingMeetLink } from "@/components/BookingMeetLink";
import { PostPurchaseNextSteps } from "@/components/PostPurchaseNextSteps";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { formatPrice } from "@/lib/format";
import { isResourceOrderItem, orderItemTypeLabel } from "@/lib/roles";

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
  booking?: {
    id: string;
    status: string;
    scheduledStartAt: string;
    scheduledEndAt: string;
    timeZone: string;
    meetLink: string | null;
    calendarHtmlLink: string | null;
    serviceTitle: string;
  } | null;
  eventJoin?: {
    eventTitle: string;
    ticketLabel: string;
    quantity: number;
    startsAt: string | null;
    endsAt: string | null;
    attendanceMode: string;
    attendanceLabel: string;
    venue: string | null;
    location: string | null;
    meetUrl: string | null;
    externalJoinUrl: string | null;
  } | null;
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

    const sid = sessionId;

    async function loadOrder(confirmIfNeeded: boolean) {
      if (confirmIfNeeded) {
        await fetch("/api/bookings/confirm-from-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid }),
        }).catch(() => undefined);
      }

      const res = await fetch(`/api/orders/by-session?session_id=${encodeURIComponent(sid)}`);
      if (!res.ok) {
        setNotFound(true);
        return null;
      }
      return res.json() as Promise<OrderFromApi>;
    }

    void loadOrder(true)
      .then((data) => {
        if (!data) return;
        setOrder(data);
        if (data.booking?.status === "PENDING_PAYMENT") {
          return loadOrder(true).then((retry) => {
            if (retry) setOrder(retry);
          });
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-2xl space-y-6">
          <CardSkeleton className="min-h-[200px]" />
          <CardSkeleton />
        </div>
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
          <ButtonLink href="/discover" size="lg" variant="primary">
            Continue on Discover
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
            {order.booking
              ? "Booking confirmed"
              : order.eventJoin
                ? "Ticket confirmed"
                : "Thank you for your order"}
          </h1>
          <p className="mt-2 text-fix-text-muted">
            Order <strong className="text-fix-heading">{order.id}</strong> placed on {date}.
          </p>
          <div className="mt-3 flex justify-center">
            <OrderStatusBadge status={order.status} />
          </div>
          {order.booking || order.eventJoin ? (
            <p className="mt-1 text-sm text-fix-text-muted">
              A confirmation has been sent to{" "}
              <strong className="text-fix-heading">{order.email}</strong>.
            </p>
          ) : order.items.some((item) => isResourceOrderItem(item.type)) ? (
            <p className="mt-1 text-sm text-fix-text-muted">
              Access your files from{" "}
              <Link
                href={`/account/orders/${order.id}`}
                className="font-medium text-fix-link hover:text-fix-link-hover"
              >
                Order history
              </Link>
              .
            </p>
          ) : (
            <p className="mt-1 text-sm text-fix-text-muted">
              Receipt details are saved in your{" "}
              <Link
                href={`/account/orders/${order.id}`}
                className="font-medium text-fix-link hover:text-fix-link-hover"
              >
                Order history
              </Link>
              .
            </p>
          )}
        </div>

        {order.booking ? (
          <Card className="mt-8 p-6">
            <h2 className="text-lg font-semibold text-fix-heading">Appointment</h2>
            <p className="mt-2 text-fix-heading">{order.booking.serviceTitle}</p>
            <p className="mt-2 text-sm text-fix-text-muted">
              {new Intl.DateTimeFormat("en-US", {
                timeZone: order.booking.timeZone,
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(order.booking.scheduledStartAt))}
            </p>
            <BookingMeetLink
              className="mt-4 justify-center"
              meetLink={order.booking.meetLink}
              calendarHtmlLink={order.booking.calendarHtmlLink}
              status={order.booking.status}
            />
            <p className="mt-4 text-center text-sm text-fix-text-muted">
              Confirmation and calendar details were sent to{" "}
              <strong className="text-fix-heading">{order.email}</strong>.
            </p>
            <p className="mt-3 text-center">
              <Link href="/account/bookings" className="text-sm text-fix-link hover:text-fix-link-hover">
                View all bookings
              </Link>
            </p>
          </Card>
        ) : null}

        {order.eventJoin ? (
          <Card className="mt-8 p-6">
            <h2 className="text-lg font-semibold text-fix-heading">Your event</h2>
            <p className="mt-2 text-fix-heading">{order.eventJoin.eventTitle}</p>
            <p className="mt-1 text-sm text-fix-text-muted">
              {order.eventJoin.ticketLabel} × {order.eventJoin.quantity}
            </p>
            <p className="mt-2 text-sm text-fix-text-muted">{order.eventJoin.attendanceLabel}</p>
            {order.eventJoin.startsAt ? (
              <p className="mt-2 text-sm text-fix-text-muted">
                {new Intl.DateTimeFormat("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(order.eventJoin.startsAt))}
              </p>
            ) : null}
            {(order.eventJoin.venue || order.eventJoin.location) &&
            !order.eventJoin.meetUrl &&
            !order.eventJoin.externalJoinUrl ? (
              <p className="mt-3 text-sm text-fix-text">
                {[order.eventJoin.venue, order.eventJoin.location].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {order.eventJoin.meetUrl ? (
              <BookingMeetLink
                className="mt-4 justify-center"
                meetLink={order.eventJoin.meetUrl}
                calendarHtmlLink={null}
                status="CONFIRMED"
              />
            ) : null}
            {order.eventJoin.externalJoinUrl ? (
              <p className="mt-4 text-center">
                <a
                  href={order.eventJoin.externalJoinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-fix-link hover:text-fix-link-hover"
                >
                  Open event space
                </a>
              </p>
            ) : null}
            <p className="mt-4 text-center text-sm text-fix-text-muted">
              Join details were emailed to{" "}
              <strong className="text-fix-heading">{order.email}</strong>.
            </p>
            <p className="mt-3 text-center">
              <Link
                href={`/account/orders/${order.id}`}
                className="text-sm text-fix-link hover:text-fix-link-hover"
              >
                View order
              </Link>
            </p>
          </Card>
        ) : null}

        <Card className="mt-8 p-6">
          <h2 className="text-lg font-semibold text-fix-heading">Order details</h2>
          <ul className="mt-4 divide-y divide-fix-border/15">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-3 py-3 first:pt-0">
                <span className="text-fix-text">
                  {item.name} × {item.quantity}
                  <span className="ml-1.5 text-xs text-fix-text-muted">
                    ({orderItemTypeLabel(item.type)})
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

          {order.items.some((i) => isResourceOrderItem(i.type)) && (
            <div className="mt-6 rounded-xl border border-forest/20 bg-forest/5 p-4">
              <h3 className="text-sm font-semibold text-forest">Resources</h3>
              <p className="mt-1 text-sm text-fix-text-muted">
                Access your files from order history. Go to{" "}
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

          <PostPurchaseNextSteps orderHref={`/account/orders/${order.id}`} />

          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/discover" size="md" variant="secondary">
              Browse Discover
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

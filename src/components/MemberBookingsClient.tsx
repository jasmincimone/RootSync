"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { BookingMeetLink } from "@/components/BookingMeetLink";
import { BookingReference } from "@/components/BookingReference";
import { BookingStatusHint } from "@/components/BookingStatusHint";
import { CancelBookingButton, isBookingCancellable } from "@/components/CancelBookingButton";
import { bookingStatusLabel } from "@/lib/bookingAccess";
import { formatPrice } from "@/lib/format";
import type { BookingStatus } from "@/lib/roles";
import { BOOKING_STATUS } from "@/lib/roles";

function bookingDurationMinutes(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

type BookingRow = {
  id: string;
  orderId: string | null;
  status: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  timeZone: string;
  priceCents: number;
  meetLink: string | null;
  calendarHtmlLink: string | null;
  fulfillmentMethod: string;
  listing: { id: string; title: string };
  vendor: { id: string; displayName: string };
};

function formatWhen(startIso: string, endIso: string, timeZone: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const endFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${fmt.format(start)} – ${endFmt.format(end)}`;
}

export function MemberBookingsClient() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/bookings")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Could not load bookings.");
        setBookings(data.bookings ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-fix-text-muted">Loading bookings…</p>;
  if (error) return <p className="text-sm text-bark">{error}</p>;

  if (bookings.length === 0) {
    return (
      <p className="text-sm text-fix-text-muted">
        No bookings yet.{" "}
        <Link href="/marketplace" className="text-fix-link hover:text-fix-link-hover">
          Browse services
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((b) => (
        <Card
          key={b.id}
          className={b.status === BOOKING_STATUS.CANCELLED ? "p-5 opacity-70" : "p-5"}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <BookingReference
                bookingId={b.id}
                orderId={b.orderId}
                orderHref={b.orderId ? `/account/orders/${b.orderId}` : undefined}
                className="text-xs text-fix-text-muted"
              />
              <p className="mt-1 font-semibold text-fix-heading">{b.listing.title}</p>
              <p className="text-sm text-fix-text-muted">{b.vendor.displayName}</p>
              <p className="mt-2 text-sm text-fix-heading">
                {formatWhen(b.scheduledStartAt, b.scheduledEndAt, b.timeZone)}
              </p>
              <p className="mt-1 text-sm text-fix-text-muted">
                {bookingStatusLabel(b.status as BookingStatus)} · {formatPrice(b.priceCents)} ·{" "}
                {bookingDurationMinutes(b.scheduledStartAt, b.scheduledEndAt)} min
              </p>
              <BookingMeetLink
                className="mt-3"
                meetLink={b.meetLink}
                calendarHtmlLink={b.calendarHtmlLink}
                status={b.status}
                fulfillmentMethod={b.fulfillmentMethod}
              />
            </div>
          </div>
          {isBookingCancellable(b.status) ? (
            <CancelBookingButton
              apiPath={`/api/account/bookings/${b.id}`}
              serviceTitle={b.listing.title}
              counterpartyLabel={b.vendor.displayName}
              bookingStatus={b.status}
              priceCents={b.priceCents}
              onCancelled={() =>
                setBookings((prev) =>
                  prev.map((row) =>
                    row.id === b.id ? { ...row, status: BOOKING_STATUS.CANCELLED } : row,
                  ),
                )
              }
            />
          ) : (
            <BookingStatusHint status={b.status} />
          )}
        </Card>
      ))}
    </div>
  );
}

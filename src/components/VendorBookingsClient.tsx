"use client";

import { CalendarCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BookingMeetLink } from "@/components/BookingMeetLink";
import { BookingReference } from "@/components/BookingReference";
import { BookingStatusHint } from "@/components/BookingStatusHint";
import { CancelBookingButton, isBookingCancellable } from "@/components/CancelBookingButton";
import { BookingStatusBadge } from "@/components/ui/StatusBadge";
import { CardListSkeleton } from "@/components/ui/LoadingSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { formatPrice } from "@/lib/format";
import type { BookingStatus } from "@/lib/roles";
import { BOOKING_STATUS } from "@/lib/roles";

function bookingDurationMinutes(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60_000);
}

type VendorBookingRow = {
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
  memberEmail: string;
  memberName: string | null;
  vendorNotes: string | null;
  intakeNotes: string | null;
  listing: { id: string; title: string };
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

export function VendorBookingsClient() {
  const [bookings, setBookings] = useState<VendorBookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/bookings");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not load bookings.");
      setBookings(data.bookings ?? []);
      const drafts: Record<string, string> = {};
      for (const b of data.bookings ?? []) {
        drafts[b.id] = b.vendorNotes ?? "";
      }
      setNotesDraft(drafts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patchBooking(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/vendor/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return res.ok;
  }

  if (loading) return <CardListSkeleton count={3} />;
  if (error) return <ErrorBanner message={error} onRetry={() => void load()} />;

  if (bookings.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No appointments yet"
        description="When members book your services, appointments appear here with intake notes and Meet links."
        action={{ href: "/account/vendor/listings", label: "Manage listings", variant: "cta" }}
        secondaryAction={{
          href: "/account/vendor/listings/new",
          label: "Create a service",
          variant: "secondary",
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {bookings.map((b) => (
        <Card
          key={b.id}
          className={b.status === BOOKING_STATUS.CANCELLED ? "p-5 opacity-70" : "p-5"}
        >
          <BookingReference bookingId={b.id} orderId={b.orderId} className="text-xs text-fix-text-muted" />
          <p className="mt-1 font-semibold text-fix-heading">{b.listing.title}</p>
          <p className="text-sm text-fix-text-muted">
            {b.memberName || b.memberEmail} · {b.memberEmail}
          </p>
          <p className="mt-2 text-sm text-fix-heading">
            {formatWhen(b.scheduledStartAt, b.scheduledEndAt, b.timeZone)}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={b.status} />
            <span className="text-sm text-fix-text-muted">
              {formatPrice(b.priceCents)} ·{" "}
              {bookingDurationMinutes(b.scheduledStartAt, b.scheduledEndAt)} min
            </span>
          </div>
          <BookingMeetLink
            className="mt-3"
            meetLink={b.meetLink}
            calendarHtmlLink={b.calendarHtmlLink}
            status={b.status}
            fulfillmentMethod={b.fulfillmentMethod}
          />
          {b.intakeNotes ? (
            <p className="mt-3 text-sm text-fix-text-muted">
              <span className="font-medium text-fix-heading">Member notes:</span> {b.intakeNotes}
            </p>
          ) : null}

          <div className="mt-4">
            <label className="block text-sm font-medium text-fix-heading">Consultation notes</label>
            <textarea
              value={notesDraft[b.id] ?? ""}
              onChange={(e) => setNotesDraft((prev) => ({ ...prev, [b.id]: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-2"
              onClick={() =>
                void patchBooking(b.id, { action: "notes", vendorNotes: notesDraft[b.id] ?? "" })
              }
            >
              Save notes
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {b.status === BOOKING_STATUS.CONFIRMED ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  void patchBooking(b.id, { action: "complete" }).then((ok) => {
                    if (ok) {
                      setBookings((prev) =>
                        prev.map((row) =>
                          row.id === b.id ? { ...row, status: BOOKING_STATUS.COMPLETED } : row,
                        ),
                      );
                    }
                  })
                }
              >
                Mark completed
              </Button>
            ) : null}
          </div>

          {isBookingCancellable(b.status) ? (
            <CancelBookingButton
              apiPath={`/api/vendor/bookings/${b.id}`}
              serviceTitle={b.listing.title}
              counterpartyLabel={b.memberName || b.memberEmail}
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

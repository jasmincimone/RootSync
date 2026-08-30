"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Minus, Plus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { BookingCalendarPicker } from "@/components/BookingCalendarPicker";
import { CheckoutAuthGate } from "@/components/CheckoutAuthGate";
import { CheckoutMarketingOptIn } from "@/components/CheckoutMarketingOptIn";
import { BOOKING_CANCELLATION_POLICY_LONG } from "@/lib/bookingPolicy";
import { formatPrice } from "@/lib/format";
import {
  clampServiceBookingQuantity,
  MAX_SERVICE_BOOKING_QUANTITY,
} from "@/lib/serviceBookingQuantity";

type IntakeQuestion = {
  id: string;
  question: string;
  required: boolean;
};

type TimeSlot = {
  startAt: string;
  endAt: string;
  timeZone: string;
};

type Props = {
  listingId: string;
  variantId?: string | null;
  title: string;
  priceCents: number;
  durationMinutes: number;
  terms: string | null;
  intakeQuestions: IntakeQuestion[];
  bookPath?: string;
  allowGuestBooking?: boolean;
  vendorDisplayName?: string | null;
};

export function ServiceBookingWizard({
  listingId,
  variantId = null,
  priceCents,
  durationMinutes,
  terms,
  intakeQuestions,
  bookPath,
  allowGuestBooking = true,
  vendorDisplayName,
}: Props) {
  const { data: session, status } = useSession();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedStartAts, setSelectedStartAts] = useState<Array<string | null>>([null]);
  const [intakeNotes, setIntakeNotes] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingAsGuest, setBookingAsGuest] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const signedIn = Boolean(session?.user);
  const loginHref = `/login?callbackUrl=${encodeURIComponent(
    bookPath ?? `/discover/listings/${listingId}/book`,
  )}`;
  const totalCents = priceCents * quantity;
  const allSessionsScheduled = selectedStartAts.every((startAt) => Boolean(startAt));

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    setError(null);
    try {
      const query = variantId ? `?days=21&variant=${encodeURIComponent(variantId)}` : "?days=21";
      const res = await fetch(`/api/marketplace/listings/${listingId}/availability${query}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not load times.");
      }
      setSlots(Array.isArray(data.slots) ? data.slots : []);
      if (typeof data.timeZone === "string") setTimeZone(data.timeZone);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load availability.");
    } finally {
      setLoadingSlots(false);
    }
  }, [listingId, variantId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  function changeQuantity(next: number) {
    const clamped = clampServiceBookingQuantity(next);
    setQuantity(clamped);
    setSelectedStartAts((prev) => {
      if (clamped === prev.length) return prev;
      if (clamped > prev.length) {
        return [...prev, ...Array.from({ length: clamped - prev.length }, () => null)];
      }
      return prev.slice(0, clamped);
    });
    setError(null);
  }

  function updateSessionStartAt(index: number, startAt: string | null) {
    setSelectedStartAts((prev) => {
      const next = [...prev];
      next[index] = startAt;
      return next;
    });
    setError(null);
  }

  const disabledStartAtsBySession = useMemo(
    () =>
      selectedStartAts.map((startAt, index) =>
        selectedStartAts
          .filter((value, otherIndex) => otherIndex !== index && value)
          .map((value) => value as string),
      ),
    [selectedStartAts],
  );

  async function handleSubmit() {
    const scheduledStartAts = selectedStartAts.filter((startAt): startAt is string => Boolean(startAt));
    if (scheduledStartAts.length !== quantity) {
      setError(`Choose a time for all ${quantity} session${quantity === 1 ? "" : "s"}.`);
      return;
    }
    if (!signedIn && !guestEmail.trim()) {
      setError("Enter the email where we should send your confirmation.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const intakeAnswers = intakeQuestions.map((q) => ({
        questionId: q.id,
        questionText: q.question,
        answer: answers[q.id] ?? "",
      }));
      const res = await fetch(`/api/marketplace/listings/${listingId}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduledStartAts,
          intakeNotes,
          intakeAnswers,
          ...(variantId ? { variantId } : {}),
          ...(signedIn
            ? { marketingOptIn }
            : { guestEmail: guestEmail.trim(), guestName: guestName.trim(), marketingOptIn }),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not start booking.");
      }
      if (typeof data.url !== "string" || !data.url) {
        throw new Error("Checkout URL missing.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Booking failed.");
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return <p className="text-sm text-fix-text-muted">Loading…</p>;
  }

  if (!signedIn && (!allowGuestBooking || !bookingAsGuest)) {
    return (
      <CheckoutAuthGate
        callbackUrl={bookPath ?? `/discover/listings/${listingId}/book`}
        allowGuest={allowGuestBooking}
        guestLabel="Book as guest"
        onGuestContinue={() => setBookingAsGuest(true)}
        description={
          allowGuestBooking
            ? "Keep appointments, Meet links, and receipts in one place with a free account."
            : "This vendor requires an account before booking."
        }
      />
    );
  }

  const intakeStep = signedIn ? 3 : 4;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-fix-heading">1. How many sessions?</h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          {durationMinutes}-minute session · {formatPrice(priceCents)} each
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-fix-text">Sessions</span>
          <div
            className="inline-flex items-center gap-1 rounded-full border border-fix-border/25 bg-fix-surface p-1 ring-1 ring-inset ring-fix-border/15"
            role="group"
            aria-label="Number of sessions"
          >
            <button
              type="button"
              onClick={() => changeQuantity(quantity - 1)}
              disabled={quantity <= 1}
              aria-label="Remove one session"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fix-heading transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <span className="w-12 text-center text-sm font-semibold text-fix-heading">{quantity}</span>
            <button
              type="button"
              onClick={() => changeQuantity(quantity + 1)}
              disabled={quantity >= MAX_SERVICE_BOOKING_QUANTITY}
              aria-label="Add one session"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fix-heading transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-amber disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {quantity > 1 ? (
            <span className="text-sm text-fix-text-muted">{formatPrice(totalCents)} total</span>
          ) : null}
        </div>
      </div>

      <div className="space-y-8">
        {Array.from({ length: quantity }, (_, index) => (
          <div key={`session-${index}`}>
            <h2 className="text-lg font-semibold text-fix-heading">
              2{quantity > 1 ? `.${index + 1}` : ""}. Choose a time
              {quantity > 1 ? ` · Session ${index + 1}` : ""}
            </h2>
            <p className="mt-1 text-sm text-fix-text-muted">
              {selectedStartAts[index]
                ? "Time selected — tap another slot to change it."
                : "Pick an open slot to continue."}
            </p>
            <div className="mt-5">
              <BookingCalendarPicker
                slots={slots}
                timeZone={timeZone}
                selectedStartAt={selectedStartAts[index] ?? null}
                onSelectStartAt={(startAt) => updateSessionStartAt(index, startAt)}
                disabledStartAts={disabledStartAtsBySession[index]}
                loading={loadingSlots}
              />
            </div>
          </div>
        ))}
      </div>

      {!signedIn ? (
        <div>
          <h2 className="text-lg font-semibold text-fix-heading">3. Your details</h2>
          <p className="mt-1 text-sm text-fix-text-muted">
            We send your confirmation, calendar invite, and Meet link here.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="guest-booking-email"
                className="block text-sm font-medium text-fix-heading"
              >
                Email <span className="text-bark">*</span>
              </label>
              <input
                id="guest-booking-email"
                type="email"
                autoComplete="email"
                required
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text"
              />
            </div>
            <div>
              <label
                htmlFor="guest-booking-name"
                className="block text-sm font-medium text-fix-heading"
              >
                Name
              </label>
              <input
                id="guest-booking-name"
                type="text"
                autoComplete="name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="So your vendor knows who to expect"
                className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text"
              />
            </div>
          </div>
          <p className="mt-3 text-sm text-fix-text-muted">
            Booking as a guest.{" "}
            <Link href={loginHref} className="text-fix-link hover:text-fix-link-hover">
              Sign in instead
            </Link>{" "}
            to keep all your appointments in one place.
          </p>
        </div>
      ) : null}

      <div>
        <h2 className="text-lg font-semibold text-fix-heading">{intakeStep}. Intake</h2>
        {terms ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-fix-text-muted">{terms}</p>
        ) : null}
        {intakeQuestions.length > 0 ? (
          <div className="mt-4 space-y-4">
            {intakeQuestions.map((q) => (
              <div key={q.id}>
                <label className="block text-sm font-medium text-fix-heading">
                  {q.question}
                  {q.required ? <span className="text-bark"> *</span> : null}
                </label>
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4">
            <label className="block text-sm font-medium text-fix-heading">
              Anything we should know before your session?
            </label>
            <textarea
              value={intakeNotes}
              onChange={(e) => setIntakeNotes(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text"
            />
          </div>
        )}
      </div>

      {error ? <p className="text-sm text-bark">{error}</p> : null}

      <CheckoutMarketingOptIn
        id={`booking-marketing-${listingId}`}
        vendorName={vendorDisplayName}
        checked={marketingOptIn}
        onChange={setMarketingOptIn}
      />

      <div>
        <Button
          type="button"
          variant="cta"
          size="lg"
          disabled={submitting || !allSessionsScheduled || loadingSlots}
          onClick={() => void handleSubmit()}
        >
          {submitting
            ? "Redirecting to payment…"
            : `Continue to payment · ${formatPrice(totalCents)}`}
        </Button>
        {!allSessionsScheduled ? (
          <p className="mt-2 text-sm text-fix-text-muted">
            Choose a time for each session before continuing.
          </p>
        ) : null}
        <p className="mt-3 text-sm text-fix-text-muted">{BOOKING_CANCELLATION_POLICY_LONG}</p>
      </div>
    </div>
  );
}

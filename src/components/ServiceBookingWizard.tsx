"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { BookingCalendarPicker } from "@/components/BookingCalendarPicker";
import { CheckoutAuthGate } from "@/components/CheckoutAuthGate";
import { BOOKING_CANCELLATION_POLICY_LONG } from "@/lib/bookingPolicy";
import { formatPrice } from "@/lib/format";

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
};

export function ServiceBookingWizard({
  listingId,
  variantId = null,
  title,
  priceCents,
  durationMinutes,
  terms,
  intakeQuestions,
  bookPath,
  allowGuestBooking = true,
}: Props) {
  const { data: session, status } = useSession();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [timeZone, setTimeZone] = useState("America/New_York");
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selectedStartAt, setSelectedStartAt] = useState<string | null>(null);
  const [intakeNotes, setIntakeNotes] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingAsGuest, setBookingAsGuest] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");

  const signedIn = Boolean(session?.user);
  const loginHref = `/login?callbackUrl=${encodeURIComponent(
    bookPath ?? `/discover/listings/${listingId}/book`,
  )}`;

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

  async function handleSubmit() {
    if (!selectedStartAt) {
      setError("Choose a time slot.");
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
          scheduledStartAt: selectedStartAt,
          intakeNotes,
          intakeAnswers,
          ...(variantId ? { variantId } : {}),
          ...(signedIn
            ? {}
            : { guestEmail: guestEmail.trim(), guestName: guestName.trim() }),
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-fix-heading">1. Choose a time</h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          {durationMinutes}-minute session · {formatPrice(priceCents)}
        </p>
        <div className="mt-5">
          <BookingCalendarPicker
            slots={slots}
            timeZone={timeZone}
            selectedStartAt={selectedStartAt}
            onSelectStartAt={setSelectedStartAt}
            loading={loadingSlots}
          />
        </div>
      </div>

      {!signedIn ? (
        <div>
          <h2 className="text-lg font-semibold text-fix-heading">2. Your details</h2>
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
        <h2 className="text-lg font-semibold text-fix-heading">
          {signedIn ? "2" : "3"}. Intake
        </h2>
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

      <div>
        <Button
          type="button"
          variant="cta"
          size="lg"
          disabled={submitting || !selectedStartAt || loadingSlots}
          onClick={() => void handleSubmit()}
        >
          {submitting
            ? "Redirecting to payment…"
            : `Continue to payment · ${formatPrice(priceCents)}`}
        </Button>
        <p className="mt-3 text-sm text-fix-text-muted">{BOOKING_CANCELLATION_POLICY_LONG}</p>
      </div>
    </div>
  );
}

"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { BookingCalendarPicker } from "@/components/BookingCalendarPicker";
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
};

export function ServiceBookingWizard({
  listingId,
  variantId = null,
  title,
  priceCents,
  durationMinutes,
  terms,
  intakeQuestions,
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

  if (!session?.user) {
    return (
      <div className="rounded-xl border border-fix-border/15 bg-fix-bg-muted/50 p-6">
        <p className="text-sm text-fix-heading">Sign in to book this service.</p>
        <p className="mt-2 text-sm text-fix-text-muted">
          Members and vendors can book services on RootSync.
        </p>
        <Link
          href={`/login?callbackUrl=${encodeURIComponent(`/discover/listings/${listingId}/book`)}`}
          className="mt-4 inline-flex text-sm font-medium text-fix-link hover:text-fix-link-hover"
        >
          Sign in to continue →
        </Link>
      </div>
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

      <div>
        <h2 className="text-lg font-semibold text-fix-heading">2. Intake</h2>
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

      <Button
        type="button"
        variant="cta"
        size="lg"
        disabled={submitting || !selectedStartAt || loadingSlots}
        onClick={() => void handleSubmit()}
      >
        {submitting ? "Redirecting to payment…" : `Continue to payment · ${formatPrice(priceCents)}`}
      </Button>
    </div>
  );
}

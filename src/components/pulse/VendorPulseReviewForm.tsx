"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { PulseRatingDisplay } from "@/components/pulse/PulseRatingDisplay";
import { usePulseToast } from "@/components/pulse/PulseToastProvider";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";
import type { PulseEarnedPayload } from "@/lib/pulse/toastMessages";
import { cn } from "@/lib/cn";

type Props = {
  vendorProfileId: string;
  vendorName: string;
  orderId?: string;
  bookingId?: string;
  listingTitle?: string | null;
  className?: string;
  onSuccess?: () => void;
};

export function VendorPulseReviewForm({
  vendorProfileId,
  vendorName,
  orderId,
  bookingId,
  listingTitle,
  className,
  onSuccess,
}: Props) {
  const router = useRouter();
  const { showPulseEarned } = usePulseToast();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/vendors/${vendorProfileId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pulseRating: rating,
          title: title.trim() || undefined,
          body: body.trim() || undefined,
          orderId,
          bookingId,
        }),
      });
      const data = (await res.json()) as { error?: string; pulseEarned?: PulseEarnedPayload };
      if (!res.ok) {
        setError(data.error ?? "Could not submit review");
        return;
      }
      if (data.pulseEarned) {
        showPulseEarned(data.pulseEarned);
      }
      setDone(true);
      onSuccess?.();
      router.refresh();
    } catch {
      setError("Could not submit review. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className={cn("rounded-xl border border-forest/20 bg-forest/5 p-4", className)}>
        <p className="text-sm font-medium text-fix-heading">Thank you for giving Pulse</p>
        <p className="mt-1 text-sm text-fix-text-muted">
          Your review helps {vendorName} and strengthens trust across RootSync.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className={cn("space-y-4", className)}>
      <div>
        <p className="text-sm font-semibold text-fix-heading">Give a Pulse to {vendorName}</p>
        {listingTitle ? (
          <p className="mt-0.5 text-xs text-fix-text-muted">For {listingTitle}</p>
        ) : null}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
          Your Pulse rating
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              className={cn(
                "rounded-lg px-2 py-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber",
                rating === value ? "bg-amber/15 ring-1 ring-amber/30" : "hover:bg-fix-bg-muted",
              )}
              aria-label={`${value} Pulse${value !== 1 ? "s" : ""}`}
              aria-pressed={rating === value}
            >
              <PulseRatingDisplay rating={value} size={22} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="pulse-review-title" className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
          Headline (optional)
        </label>
        <input
          id="pulse-review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          className="mt-1 w-full rounded-xl border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          placeholder="What stood out?"
        />
      </div>

      <div>
        <label htmlFor="pulse-review-body" className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
          Your experience (optional)
        </label>
        <textarea
          id="pulse-review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          className="mt-1 w-full rounded-xl border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
          placeholder="Share how this vendor helped you grow."
        />
      </div>

      {error ? <FormFeedback error={error} /> : null}

      <Button type="submit" variant="cta" disabled={submitting}>
        {submitting ? "Sending Pulse…" : "Give a Pulse"}
      </Button>
    </form>
  );
}

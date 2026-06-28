"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { formatPrice } from "@/lib/format";
import { BOOKING_STATUS } from "@/lib/roles";

type Props = {
  apiPath: string;
  serviceTitle: string;
  counterpartyLabel: string;
  bookingStatus: string;
  priceCents?: number;
  onCancelled: (result?: { refunded?: boolean; refundAmountCents?: number }) => void;
};

export function CancelBookingButton({
  apiPath,
  serviceTitle,
  counterpartyLabel,
  bookingStatus,
  priceCents,
  onCancelled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(apiPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          ...(reason.trim() ? { reason: reason.trim() } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not cancel booking.");
      }
      setOpen(false);
      setReason("");
      onCancelled({
        refunded: data.refunded === true,
        refundAmountCents:
          typeof data.refundAmountCents === "number" ? data.refundAmountCents : undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 border-t border-fix-border/15 pt-4">
      {!open ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="text-bark ring-bark/30 hover:bg-bark/5"
          onClick={() => setOpen(true)}
        >
          Cancel booking
        </Button>
      ) : (
        <div className="rounded-xl border border-fix-border/15 bg-fix-bg-muted/40 p-4">
          <p className="text-sm font-medium text-fix-heading">Cancel this booking?</p>
          <p className="mt-1 text-sm text-fix-text-muted">
            <strong className="text-fix-heading">{serviceTitle}</strong> with {counterpartyLabel} will
            be cancelled, the time slot freed, and both parties notified.
            {bookingStatus === BOOKING_STATUS.CONFIRMED && priceCents != null && priceCents > 0 ? (
              <>
                {" "}
                A full refund of <strong className="text-fix-heading">{formatPrice(priceCents)}</strong>{" "}
                will be issued to the original payment method.
              </>
            ) : null}
          </p>
          <label className="mt-3 block text-sm font-medium text-fix-heading">
            Reason <span className="font-normal text-fix-text-muted">(optional)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Let them know why you're cancelling"
            className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text"
          />
          {error ? <p className="mt-2 text-sm text-bark">{error}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className={cn("text-bark ring-bark/30 hover:bg-bark/5")}
              disabled={submitting}
              onClick={() => void handleConfirm()}
            >
              {submitting ? "Cancelling…" : "Confirm cancellation"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={submitting}
              onClick={() => {
                setOpen(false);
                setReason("");
                setError(null);
              }}
            >
              Keep booking
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function isBookingCancellable(status: string): boolean {
  return status === BOOKING_STATUS.PENDING_PAYMENT || status === BOOKING_STATUS.CONFIRMED;
}

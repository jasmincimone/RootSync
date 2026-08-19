"use client";

import { useState } from "react";

import { BookingMeetLink } from "@/components/BookingMeetLink";
import { CancelBookingButton, isBookingCancellable } from "@/components/CancelBookingButton";
import { Card } from "@/components/ui/Card";
import { BookingStatusBadge } from "@/components/ui/StatusBadge";
import {
  BOOKING_CANCELLATION_POLICY_LONG,
  selfCancellationRefundable,
} from "@/lib/bookingPolicy";
import { formatPrice } from "@/lib/format";
import { BOOKING_STATUS } from "@/lib/roles";

type Props = {
  bookingId: string;
  token: string;
  status: string;
  serviceTitle: string;
  vendorName: string;
  when: string;
  priceCents: number;
  meetLink: string | null;
  calendarHtmlLink: string | null;
  fulfillmentMethod: string;
  scheduledStartAt: string;
  vendorMessageHref: string;
};

export function GuestBookingClient({
  bookingId,
  token,
  status: initialStatus,
  serviceTitle,
  vendorName,
  when,
  priceCents,
  meetLink,
  calendarHtmlLink,
  fulfillmentMethod,
  scheduledStartAt,
  vendorMessageHref,
}: Props) {
  const [status, setStatus] = useState(initialStatus);
  const [refundNote, setRefundNote] = useState<string | null>(null);

  const refundEligible = selfCancellationRefundable({
    scheduledStartAt: new Date(scheduledStartAt),
  });

  return (
    <Card className={status === BOOKING_STATUS.CANCELLED ? "p-6 opacity-70" : "p-6"}>
      <p className="text-xs text-fix-text-muted">Booking #{bookingId.slice(-8)}</p>
      <p className="mt-1 text-lg font-semibold text-fix-heading">{serviceTitle}</p>
      <p className="text-sm text-fix-text-muted">{vendorName}</p>
      <p className="mt-3 text-sm text-fix-heading">{when}</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <BookingStatusBadge status={status} />
        <span className="text-sm text-fix-text-muted">{formatPrice(priceCents)}</span>
      </div>

      <BookingMeetLink
        meetLink={meetLink}
        calendarHtmlLink={calendarHtmlLink}
        status={status}
        fulfillmentMethod={fulfillmentMethod}
      />

      {refundNote ? (
        <p className="mt-4 rounded-lg border border-fix-border/15 bg-fix-bg-muted/40 px-4 py-3 text-sm text-fix-text">
          {refundNote}
        </p>
      ) : null}

      {status === BOOKING_STATUS.CANCELLED ? null : (
        <>
          <p className="mt-4 text-sm text-fix-text-muted">
            {BOOKING_CANCELLATION_POLICY_LONG}{" "}
            <a href={vendorMessageHref} className="text-fix-link hover:text-fix-link-hover">
              Message {vendorName}
            </a>
            .
          </p>

          {isBookingCancellable(status) ? (
            <CancelBookingButton
              apiPath={`/api/bookings/${bookingId}/guest-cancel`}
              serviceTitle={serviceTitle}
              counterpartyLabel={vendorName}
              bookingStatus={status}
              priceCents={priceCents}
              refundEligible={refundEligible}
              extraBody={{ token }}
              onCancelled={(result) => {
                setStatus(BOOKING_STATUS.CANCELLED);
                setRefundNote(
                  result?.refunded && result.refundAmountCents
                    ? `Cancelled. A refund of ${formatPrice(
                        result.refundAmountCents,
                      )} is on its way to your original payment method and may take 5–10 business days.`
                    : "Cancelled. No refund was issued for this booking.",
                );
              }}
            />
          ) : null}
        </>
      )}
    </Card>
  );
}

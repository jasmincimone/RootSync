import { cn } from "@/lib/cn";
import { FULFILLMENT_METHOD, BOOKING_STATUS, type BookingStatus, type FulfillmentMethod } from "@/lib/roles";

type Props = {
  meetLink: string | null;
  calendarHtmlLink?: string | null;
  status: BookingStatus | string;
  fulfillmentMethod?: FulfillmentMethod | string | null;
  className?: string;
};

export function BookingMeetLink({
  meetLink,
  calendarHtmlLink,
  status,
  fulfillmentMethod,
  className,
}: Props) {
  const wantsMeet =
    fulfillmentMethod === FULFILLMENT_METHOD.VIRTUAL ||
    fulfillmentMethod === FULFILLMENT_METHOD.HYBRID ||
    !fulfillmentMethod;

  if (!wantsMeet) return null;

  if (status === BOOKING_STATUS.PENDING_PAYMENT) {
    return (
      <p className={cn("text-sm text-fix-text-muted", className)}>
        Your Google Meet link will appear here once payment is confirmed.
      </p>
    );
  }

  if (status === BOOKING_STATUS.CONFIRMED && !meetLink) {
    return (
      <p className={cn("text-sm text-fix-text-muted", className)}>
        Your Meet link is being prepared. Refresh in a moment or check your email.
      </p>
    );
  }

  if (!meetLink) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <a
        href={meetLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-9 items-center justify-center rounded-full bg-amber/15 px-4 text-sm font-medium text-fix-heading ring-1 ring-inset ring-amber/50 transition-colors hover:bg-amber/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
      >
        Join Google Meet
      </a>
      {calendarHtmlLink ? (
        <a
          href={calendarHtmlLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center justify-center rounded-full bg-fix-surface px-4 text-sm font-medium text-fix-heading ring-1 ring-inset ring-fix-border/20 transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
        >
          Open in Google Calendar
        </a>
      ) : null}
    </div>
  );
}

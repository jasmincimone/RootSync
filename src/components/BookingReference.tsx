import Link from "next/link";

import { formatShortReference } from "@/lib/referenceId";

type Props = {
  bookingId: string;
  orderId?: string | null;
  /** Member view: link order to order history detail */
  orderHref?: string;
  className?: string;
};

export function BookingReference({ bookingId, orderId, orderHref, className }: Props) {
  return (
    <p className={className ?? "text-xs text-fix-text-muted"}>
      <span title={bookingId}>
        Booking #<span className="font-mono">{formatShortReference(bookingId)}</span>
      </span>
      {orderId ? (
        <>
          <span className="mx-1.5">·</span>
          {orderHref ? (
            <Link
              href={orderHref}
              className="text-fix-link hover:text-fix-link-hover"
              title={orderId}
            >
              Order #<span className="font-mono">{formatShortReference(orderId)}</span>
            </Link>
          ) : (
            <span title={orderId}>
              Order #<span className="font-mono">{formatShortReference(orderId)}</span>
            </span>
          )}
        </>
      ) : null}
    </p>
  );
}

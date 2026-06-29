import { cn } from "@/lib/cn";
import { bookingStatusLabel } from "@/lib/bookingAccess";
import { offeringStatusLabel } from "@/lib/listingDisplay";
import { BOOKING_STATUS, OFFERING_STATUS } from "@/lib/roles";

export type StatusTone = "success" | "warning" | "neutral" | "danger";

const toneClasses: Record<StatusTone, string> = {
  success: "bg-forest/15 text-forest",
  warning: "bg-amber/15 text-espresso",
  neutral: "bg-fix-bg-muted text-fix-text-muted",
  danger: "bg-bark/10 text-bark",
};

export function StatusBadge({
  label,
  tone = "neutral",
  className,
}: {
  label: string;
  tone?: StatusTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        toneClasses[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending payment",
  paid: "Paid",
  refunded: "Refunded",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function orderStatusTone(status: string): StatusTone {
  if (status === "paid" || status === "shipped" || status === "delivered") return "success";
  if (status === "pending" || status === "processing") return "warning";
  if (status === "cancelled") return "danger";
  if (status === "refunded") return "neutral";
  return "neutral";
}

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge
      label={ORDER_STATUS_LABELS[status] ?? status}
      tone={orderStatusTone(status)}
    />
  );
}

function bookingStatusTone(status: string): StatusTone {
  if (status === BOOKING_STATUS.CONFIRMED || status === BOOKING_STATUS.COMPLETED) return "success";
  if (status === BOOKING_STATUS.PENDING_PAYMENT) return "warning";
  if (status === BOOKING_STATUS.CANCELLED) return "danger";
  return "neutral";
}

export function BookingStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge label={bookingStatusLabel(status)} tone={bookingStatusTone(status)} />
  );
}

function offeringStatusTone(status: string): StatusTone {
  if (status === OFFERING_STATUS.ACTIVE || status === "PUBLISHED") return "success";
  if (status === OFFERING_STATUS.SCHEDULED) return "warning";
  if (status === OFFERING_STATUS.PAUSED || status === OFFERING_STATUS.ARCHIVED) return "neutral";
  return "neutral";
}

export function OfferingStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge label={offeringStatusLabel(status)} tone={offeringStatusTone(status)} />
  );
}

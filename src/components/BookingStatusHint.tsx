import { BOOKING_STATUS } from "@/lib/roles";

type Props = {
  status: string;
  className?: string;
};

export function BookingStatusHint({ status, className }: Props) {
  let message: string | null = null;

  if (status === BOOKING_STATUS.COMPLETED) {
    message = "This appointment was marked completed and can no longer be cancelled.";
  } else if (status === BOOKING_STATUS.CANCELLED) {
    message = "This booking was cancelled.";
  }

  if (!message) return null;

  return <p className={className ?? "mt-4 text-xs text-fix-text-muted"}>{message}</p>;
}

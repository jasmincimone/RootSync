import { guestBookingCancelToken } from "@/lib/auth-tokens";
import { appBaseUrl } from "@/lib/stripeConnectDemo";

/** Path a guest uses to view and cancel a booking they made without an account. */
export function guestBookingManagePath(bookingId: string, memberEmail: string): string {
  const token = guestBookingCancelToken(bookingId, memberEmail);
  return `/bookings/${bookingId}?token=${token}`;
}

/** Absolute version for emails. */
export function guestBookingManageUrl(bookingId: string, memberEmail: string): string {
  return `${appBaseUrl()}${guestBookingManagePath(bookingId, memberEmail)}`;
}

/** Max sessions a buyer can book in one checkout. */
export const MAX_SERVICE_BOOKING_QUANTITY = 10;

export function clampServiceBookingQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_SERVICE_BOOKING_QUANTITY, Math.max(1, Math.floor(value)));
}

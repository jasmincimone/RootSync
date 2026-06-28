import type { BookableServiceListing } from "@/lib/bookingAccess";
import {
  eachLocalDayInRange,
  getZonedParts,
  slotGridIntervalMinutes,
  snapMinutesToGrid,
  zonedLocalToUtc,
} from "@/lib/timezone";

export type AvailabilityRule = {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  timeZone: string;
};

export type TimeSlot = {
  startAt: string;
  endAt: string;
  timeZone: string;
};

const DEFAULT_RULES: AvailabilityRule[] = [
  { dayOfWeek: 1, startMinutes: 9 * 60, endMinutes: 17 * 60, timeZone: "America/New_York" },
  { dayOfWeek: 2, startMinutes: 9 * 60, endMinutes: 17 * 60, timeZone: "America/New_York" },
  { dayOfWeek: 3, startMinutes: 9 * 60, endMinutes: 17 * 60, timeZone: "America/New_York" },
  { dayOfWeek: 4, startMinutes: 9 * 60, endMinutes: 17 * 60, timeZone: "America/New_York" },
  { dayOfWeek: 5, startMinutes: 9 * 60, endMinutes: 17 * 60, timeZone: "America/New_York" },
];

export function getServiceDurationMinutes(
  listing: BookableServiceListing,
  variantId?: string | null,
): number {
  const variants = listing.offering.variants ?? [];
  if (variantId && variants.length > 0) {
    const variant = variants.find((v) => v.id === variantId);
    if (variant?.durationMinutes && variant.durationMinutes > 0) {
      return variant.durationMinutes;
    }
  }
  const d = listing.offering.serviceDetails?.durationMinutes;
  if (typeof d === "number" && d > 0) return d;
  return 60;
}

export function resolveBookingPriceCents(listing: BookableServiceListing): number {
  const variantId = listing.selectedVariantId;
  if (variantId && listing.offering.variants?.length) {
    const variant = listing.offering.variants.find((v) => v.id === variantId);
    if (variant) return variant.priceCents;
  }
  return listing.priceCents;
}

export function resolveAvailabilityRules(listing: BookableServiceListing): AvailabilityRule[] {
  const rules = listing.offering.availabilityRules;
  if (rules.length > 0) {
    return rules.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startMinutes: r.startMinutes,
      endMinutes: r.endMinutes,
      timeZone: r.timeZone || listing.offering.serviceDetails!.defaultTimeZone,
    }));
  }
  const tz = listing.offering.serviceDetails?.defaultTimeZone || "America/New_York";
  return DEFAULT_RULES.map((r) => ({ ...r, timeZone: tz }));
}

export function generateAvailableSlots(args: {
  listing: BookableServiceListing;
  from: Date;
  to: Date;
  bookedRanges: Array<{ startAt: Date; endAt: Date }>;
  variantId?: string | null;
}): TimeSlot[] {
  const { listing, from, to, bookedRanges, variantId } = args;
  const durationMinutes = getServiceDurationMinutes(listing, variantId);
  const rules = resolveAvailabilityRules(listing);
  const slots: TimeSlot[] = [];
  const now = new Date();
  const gridInterval = slotGridIntervalMinutes(durationMinutes);

  const timeZones = [...new Set(rules.map((r) => r.timeZone))];
  for (const tz of timeZones) {
    const tzRules = rules.filter((r) => r.timeZone === tz);
    const localDays = eachLocalDayInRange(from, to, tz);

    for (const localDay of localDays) {
      for (const rule of tzRules) {
        if (localDay.dayOfWeek !== rule.dayOfWeek) continue;

        const windowStart = snapMinutesToGrid(rule.startMinutes, gridInterval);

        for (
          let minute = windowStart;
          minute + durationMinutes <= rule.endMinutes;
          minute += gridInterval
        ) {
          const hour = Math.floor(minute / 60);
          const min = minute % 60;
          const startAt = zonedLocalToUtc(
            localDay.year,
            localDay.month,
            localDay.day,
            hour,
            min,
            tz,
          );
          const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);

          if (startAt < from || startAt > to || startAt <= now) continue;

          const overlaps = bookedRanges.some(
            (b) => startAt < b.endAt && endAt > b.startAt,
          );
          if (overlaps) continue;

          slots.push({
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            timeZone: tz,
          });
        }
      }
    }
  }

  slots.sort((a, b) => a.startAt.localeCompare(b.startAt));
  return slots;
}

export function parseSlotSelection(
  startAtIso: string,
  listing: BookableServiceListing,
  variantId?: string | null,
): { startAt: Date; endAt: Date; timeZone: string } | null {
  const startAt = new Date(startAtIso);
  if (Number.isNaN(startAt.getTime())) return null;
  const durationMinutes = getServiceDurationMinutes(listing, variantId);
  const endAt = new Date(startAt.getTime() + durationMinutes * 60_000);
  const timeZone = listing.offering.serviceDetails?.defaultTimeZone || "America/New_York";
  return { startAt, endAt, timeZone };
}

export function slotIsAvailable(
  startAt: Date,
  endAt: Date,
  listing: BookableServiceListing,
  bookedRanges: Array<{ startAt: Date; endAt: Date }>,
  variantId?: string | null,
): boolean {
  const windowEnd = new Date(startAt);
  windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);
  const slots = generateAvailableSlots({
    listing,
    from: startAt,
    to: windowEnd,
    bookedRanges,
    variantId,
  });
  return slots.some((s) => s.startAt === startAt.toISOString());
}

/** Round-trip check: slot start displays on the booking grid in the service time zone. */
export function slotStartIsGridAligned(
  startAt: Date,
  durationMinutes: number,
  timeZone: string,
): boolean {
  const gridInterval = slotGridIntervalMinutes(durationMinutes);
  const local = getZonedParts(startAt, timeZone);
  const minuteOfDay = local.hour * 60 + local.minute;
  return minuteOfDay % gridInterval === 0;
}

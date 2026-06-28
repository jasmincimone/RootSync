import { dayKey, weekdayInTimeZone } from "@/lib/bookingCalendar";

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dayOfWeek: number;
};

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = fmt.formatToParts(date);
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const rawHour = Number(map.hour);
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: rawHour === 24 ? 0 : rawHour,
    minute: Number(map.minute),
    dayOfWeek: WEEKDAY_MAP[map.weekday] ?? 0,
  };
}

/** Convert wall-clock local time in `timeZone` to a UTC instant. */
export function zonedLocalToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  let guess = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  for (let i = 0; i < 4; i++) {
    const asZoned = getZonedParts(guess, timeZone);
    const diffMs =
      Date.UTC(year, month - 1, day, hour, minute, 0) -
      Date.UTC(asZoned.year, asZoned.month - 1, asZoned.day, asZoned.hour, asZoned.minute, 0);
    if (diffMs === 0) break;
    guess = new Date(guess.getTime() + diffMs);
  }
  return guess;
}

export function addLocalDays(
  year: number,
  month: number,
  day: number,
  days: number,
  timeZone: string,
): Pick<ZonedParts, "year" | "month" | "day"> {
  const anchor = zonedLocalToUtc(year, month, day, 12, 0, timeZone);
  anchor.setUTCDate(anchor.getUTCDate() + days);
  const next = getZonedParts(anchor, timeZone);
  return { year: next.year, month: next.month, day: next.day };
}

/** Walk each calendar day in `timeZone` from `from` through `to` (inclusive). */
export function eachLocalDayInRange(from: Date, to: Date, timeZone: string): ZonedParts[] {
  const start = getZonedParts(from, timeZone);
  const endKey = dayKey(getZonedParts(to, timeZone).year, getZonedParts(to, timeZone).month, getZonedParts(to, timeZone).day);
  const days: ZonedParts[] = [];
  let { year, month, day } = start;

  while (true) {
    const key = dayKey(year, month, day);
    days.push({
      year,
      month,
      day,
      hour: 0,
      minute: 0,
      dayOfWeek: weekdayInTimeZone(year, month, day, timeZone),
    });
    if (key >= endKey) break;
    ({ year, month, day } = addLocalDays(year, month, day, 1, timeZone));
  }

  return days;
}

/** Google Calendar expects local wall time without a Z suffix when timeZone is set. */
export function formatGoogleCalendarDateTime(date: Date, timeZone: string): string {
  const p = getZonedParts(date, timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:00`;
}

/** Slot start grid: hourly for 60+ min sessions, half-hourly for 30, else 15 minutes. */
export function slotGridIntervalMinutes(durationMinutes: number): number {
  if (durationMinutes >= 60 && durationMinutes % 60 === 0) return 60;
  if (durationMinutes >= 30 && durationMinutes % 30 === 0) return 30;
  return 15;
}

export function snapMinutesToGrid(minutes: number, interval: number): number {
  return Math.ceil(minutes / interval) * interval;
}

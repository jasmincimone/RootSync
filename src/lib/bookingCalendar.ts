function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function dayKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseDayKey(dayKey: string): { year: number; month: number; day: number } {
  const [year, month, day] = dayKey.split("-").map(Number);
  return { year, month, day };
}

export function dayKeyFromInstant(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function todayInTimeZone(timeZone: string): { year: number; month: number; day: number; dayKey: string } {
  const dayKey = dayKeyFromInstant(new Date().toISOString(), timeZone);
  const { year, month, day } = parseDayKey(dayKey);
  return { year, month, day, dayKey };
}

export function weekdayInTimeZone(year: number, month: number, day: number, timeZone: string): number {
  const probe = new Date(`${dayKey(year, month, day)}T12:00:00.000Z`);
  const wd = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(probe);
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[wd] ?? 0;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatDayLabel(dayKey: string, timeZone: string): string {
  const probe = new Date(`${dayKey}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(probe);
}

export function formatTimeLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatMonthYear(year: number, month: number, timeZone: string): string {
  const probe = new Date(`${dayKey(year, month, 15)}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("en-US", { timeZone, month: "long", year: "numeric" }).format(probe);
}

export function formatTimeZoneLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(
      new Date(),
    );
    const name = parts.find((p) => p.type === "timeZoneName")?.value;
    return name ?? timeZone;
  } catch {
    return timeZone;
  }
}

export type CalendarCell = {
  day: number | null;
  dayKey: string | null;
};

export function buildMonthGrid(year: number, month: number, timeZone: string): CalendarCell[] {
  const totalDays = daysInMonth(year, month);
  const startWeekday = weekdayInTimeZone(year, month, 1, timeZone);
  const cells: CalendarCell[] = [];

  for (let i = 0; i < startWeekday; i++) {
    cells.push({ day: null, dayKey: null });
  }
  for (let day = 1; day <= totalDays; day++) {
    cells.push({ day, dayKey: dayKey(year, month, day) });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: null, dayKey: null });
  }
  return cells;
}

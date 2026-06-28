"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/cn";
import {
  buildMonthGrid,
  dayKeyFromInstant,
  formatDayLabel,
  formatMonthYear,
  formatTimeLabel,
  formatTimeZoneLabel,
  parseDayKey,
  todayInTimeZone,
} from "@/lib/bookingCalendar";

type TimeSlot = {
  startAt: string;
  endAt: string;
  timeZone: string;
};

type Props = {
  slots: TimeSlot[];
  timeZone: string;
  selectedStartAt: string | null;
  onSelectStartAt: (startAt: string | null) => void;
  loading?: boolean;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Mobile-first fluid inset — ~10% on small screens, up to ~15% on large. */
const CALENDAR_INSET =
  "px-[10%] py-[10%] sm:px-[11%] sm:py-[11%] md:px-[12%] md:py-[12%] lg:px-[15%] lg:py-[15%]";

export function BookingCalendarPicker({
  slots,
  timeZone,
  selectedStartAt,
  onSelectStartAt,
  loading = false,
}: Props) {
  const today = useMemo(() => todayInTimeZone(timeZone), [timeZone]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, TimeSlot[]>();
    for (const slot of slots) {
      const key = dayKeyFromInstant(slot.startAt, slot.timeZone || timeZone);
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    return map;
  }, [slots, timeZone]);

  const initialMonth = useMemo(() => {
    if (slots.length > 0) {
      return parseDayKey(dayKeyFromInstant(slots[0]!.startAt, timeZone));
    }
    return { year: today.year, month: today.month };
  }, [slots, timeZone, today.month, today.year]);

  const [visibleYear, setVisibleYear] = useState(initialMonth.year);
  const [visibleMonth, setVisibleMonth] = useState(initialMonth.month);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);

  useEffect(() => {
    setVisibleYear(initialMonth.year);
    setVisibleMonth(initialMonth.month);
  }, [initialMonth.month, initialMonth.year]);

  useEffect(() => {
    if (selectedStartAt) {
      setSelectedDayKey(dayKeyFromInstant(selectedStartAt, timeZone));
      const { year, month } = parseDayKey(dayKeyFromInstant(selectedStartAt, timeZone));
      setVisibleYear(year);
      setVisibleMonth(month);
      return;
    }
    if (slots.length === 0) {
      setSelectedDayKey(null);
      return;
    }
    const firstDay = dayKeyFromInstant(slots[0]!.startAt, timeZone);
    setSelectedDayKey(firstDay);
  }, [selectedStartAt, slots, timeZone]);

  const monthCells = useMemo(
    () => buildMonthGrid(visibleYear, visibleMonth, timeZone),
    [visibleYear, visibleMonth, timeZone],
  );

  const selectedDaySlots = selectedDayKey ? (slotsByDay.get(selectedDayKey) ?? []) : [];

  function goToMonth(year: number, month: number) {
    setVisibleYear(year);
    setVisibleMonth(month);
  }

  function goPrevMonth() {
    if (visibleMonth === 1) {
      goToMonth(visibleYear - 1, 12);
      return;
    }
    goToMonth(visibleYear, visibleMonth - 1);
  }

  function goNextMonth() {
    if (visibleMonth === 12) {
      goToMonth(visibleYear + 1, 1);
      return;
    }
    goToMonth(visibleYear, visibleMonth + 1);
  }

  function handleSelectDay(dayKey: string) {
    if (!slotsByDay.has(dayKey)) return;
    setSelectedDayKey(dayKey);
    const daySlots = slotsByDay.get(dayKey) ?? [];
    if (daySlots.length === 1) {
      onSelectStartAt(daySlots[0]!.startAt);
      return;
    }
    const stillValid = selectedStartAt && daySlots.some((s) => s.startAt === selectedStartAt);
    if (!stillValid) {
      onSelectStartAt(null);
    }
  }

  if (loading) {
    return (
      <p className={cn("text-sm text-fix-text-muted", CALENDAR_INSET)}>
        Loading available times…
      </p>
    );
  }

  if (slots.length === 0) {
    return (
      <p className={cn("text-sm text-fix-text-muted", CALENDAR_INSET)}>
        No open slots in the next few weeks.
      </p>
    );
  }

  return (
    <div className={cn("space-y-6", CALENDAR_INSET)}>
      <div className="rounded-2xl border border-fix-border/15 bg-fix-surface p-[clamp(1rem,3.5vw,1.75rem)] shadow-soft">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goPrevMonth}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fix-heading ring-1 ring-inset ring-fix-border/20 transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <p className="text-sm font-semibold text-fix-heading sm:text-base">
            {formatMonthYear(visibleYear, visibleMonth, timeZone)}
          </p>
          <button
            type="button"
            onClick={goNextMonth}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fix-heading ring-1 ring-inset ring-fix-border/20 transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-amber"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs font-medium text-fix-text-muted sm:gap-1.5">
          {WEEKDAYS.map((label) => (
            <div key={label} className="py-1">
              {label}
            </div>
          ))}
        </div>

        <div className="mt-1 grid grid-cols-7 gap-1 sm:gap-1.5">
          {monthCells.map((cell, index) => {
            if (!cell.day || !cell.dayKey) {
              return <div key={`pad-${index}`} className="aspect-square" aria-hidden />;
            }

            const hasSlots = slotsByDay.has(cell.dayKey);
            const isSelected = selectedDayKey === cell.dayKey;
            const isToday = cell.dayKey === today.dayKey;

            return (
              <button
                key={cell.dayKey}
                type="button"
                disabled={!hasSlots}
                onClick={() => handleSelectDay(cell.dayKey!)}
                className={cn(
                  "relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber",
                  !hasSlots && "cursor-not-allowed text-fix-text-muted/40",
                  hasSlots && !isSelected && "text-fix-heading hover:bg-fix-bg-muted",
                  hasSlots && isSelected && "bg-amber/15 text-fix-heading ring-1 ring-inset ring-amber/50",
                )}
                aria-pressed={isSelected}
                aria-label={
                  hasSlots
                    ? `${cell.day}, available`
                    : `${cell.day}, unavailable`
                }
              >
                {cell.day}
                {isToday ? (
                  <span
                    className={cn(
                      "absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full",
                      isSelected ? "bg-fix-heading" : "bg-amber",
                    )}
                    aria-hidden
                  />
                ) : null}
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-fix-text-muted">
          Times shown in {formatTimeZoneLabel(timeZone)}. Days with open slots are selectable.
        </p>
      </div>

      {selectedDayKey && selectedDaySlots.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-fix-heading">
            {formatDayLabel(selectedDayKey, timeZone)}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {selectedDaySlots.map((slot) => {
              const selected = selectedStartAt === slot.startAt;
              return (
                <button
                  key={slot.startAt}
                  type="button"
                  onClick={() => onSelectStartAt(slot.startAt)}
                  className={cn(
                    "min-w-[5.5rem] rounded-full px-4 py-2 text-sm font-medium ring-1 ring-inset transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber",
                    selected
                      ? "bg-amber/15 text-fix-heading ring-amber/50"
                      : "bg-fix-surface text-fix-text-muted ring-fix-border/20 hover:bg-fix-bg-muted",
                  )}
                  aria-pressed={selected}
                >
                  {formatTimeLabel(slot.startAt, slot.timeZone || timeZone)}
                </button>
              );
            })}
          </div>
        </div>
      ) : selectedDayKey ? (
        <p className="text-sm text-fix-text-muted">No times available on this day.</p>
      ) : null}
    </div>
  );
}

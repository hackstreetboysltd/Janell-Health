"use client";

import { useMemo, useState } from "react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

/** How far ahead patients can pick preferred visit days. */
const SELECTABLE_DAYS_AHEAD = 90;

type Cell = {
  key: string;
  dateStr: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
};

function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return localDateStr(date);
}

function ymKey(year: number, month: number): number {
  return year * 12 + month;
}

export function isVisitDateSelectable(
  dateStr: string,
  today: string,
  maxDate: string,
): boolean {
  return dateStr >= today && dateStr <= maxDate;
}

function buildCells(
  year: number,
  month: number,
  selected: Set<string>,
  today: string,
  maxDate: string,
): Cell[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const dateStr = localDateStr(cellDate);
    const selectable = isVisitDateSelectable(dateStr, today, maxDate);
    cells.push({
      key: dateStr,
      dateStr,
      day: cellDate.getDate(),
      inMonth: cellDate.getMonth() === month,
      isToday: dateStr === today,
      isSelected: selected.has(dateStr),
      isDisabled: !selectable,
    });
  }
  return cells;
}

function formatSelectedSummary(dates: string[]): string {
  if (dates.length === 0) return "Tap days you are free for a visit.";
  if (dates.length === 1) {
    const [y, m, d] = dates[0]!.split("-").map(Number);
    return new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1).toLocaleDateString(
      "en-KE",
      { weekday: "short", month: "short", day: "numeric" },
    );
  }
  return `${dates.length} days selected`;
}

/**
 * Multi-select month grid (Sherehe FlashDateCalendar pattern).
 * Click toggles a day — past days and days beyond the horizon are locked.
 */
export function VisitDateCalendar({
  selectedDates,
  onChange,
}: {
  selectedDates: string[];
  onChange: (next: string[]) => void;
}) {
  const today = localDateStr();
  const maxDate = addDays(today, SELECTABLE_DAYS_AHEAD);
  const [view, setView] = useState(() => {
    const seed = selectedDates[0] ?? today;
    const [y, m] = seed.split("-").map(Number);
    return new Date(y ?? 2026, (m ?? 1) - 1, 1);
  });
  const selected = useMemo(() => new Set(selectedDates), [selectedDates]);
  const year = view.getFullYear();
  const month = view.getMonth();
  const cells = useMemo(
    () => buildCells(year, month, selected, today, maxDate),
    [year, month, selected, today, maxDate],
  );

  const [minY, minM] = today.split("-").map(Number);
  const [maxY, maxM] = maxDate.split("-").map(Number);
  const minYm = ymKey(minY ?? 2026, (minM ?? 1) - 1);
  const maxYm = ymKey(maxY ?? 2026, (maxM ?? 1) - 1);
  const viewYm = ymKey(year, month);
  const canPrev = viewYm > minYm;
  const canNext = viewYm < maxYm;

  function changeMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    const nextYm = ymKey(next.getFullYear(), next.getMonth());
    if (nextYm < minYm || nextYm > maxYm) return;
    setView(next);
  }

  function toggle(dateStr: string) {
    const next = new Set(selected);
    if (next.has(dateStr)) {
      next.delete(dateStr);
      onChange([...next].sort());
      return;
    }
    if (!isVisitDateSelectable(dateStr, today, maxDate)) return;
    next.add(dateStr);
    onChange([...next].sort());
  }

  return (
    <div className="avail-cal">
      <div className="avail-cal-nav">
        <button
          type="button"
          className="avail-cal-nav-btn"
          aria-label="Previous month"
          disabled={!canPrev}
          onClick={() => changeMonth(-1)}
        >
          ‹
        </button>
        <button
          type="button"
          className="avail-cal-month"
          onClick={() => {
            const [y, m] = today.split("-").map(Number);
            setView(new Date(y ?? 2026, (m ?? 1) - 1, 1));
          }}
        >
          {MONTH_NAMES[month]} {year}
        </button>
        <button
          type="button"
          className="avail-cal-nav-btn"
          aria-label="Next month"
          disabled={!canNext}
          onClick={() => changeMonth(1)}
        >
          ›
        </button>
      </div>

      <div className="avail-cal-weekdays" aria-hidden="true">
        {WEEKDAYS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>

      <div
        className="avail-cal-grid"
        role="grid"
        aria-label="Preferred visit days"
      >
        {cells.map((cell) => {
          const locked = cell.isDisabled && !cell.isSelected;
          return (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              aria-pressed={cell.isSelected}
              aria-label={`${cell.dateStr}${cell.isSelected ? ", selected" : ""}${cell.isDisabled ? ", unavailable" : ""}`}
              disabled={locked}
              className={[
                "avail-cal-day",
                cell.inMonth ? "" : "is-outside",
                cell.isToday ? "is-today" : "",
                cell.isSelected ? "is-selected" : "",
                cell.isDisabled ? "is-disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => toggle(cell.dateStr)}
            >
              <span className="avail-cal-day-num">{cell.day}</span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-ink/50" aria-live="polite">
        {formatSelectedSummary(selectedDates)}
      </p>
    </div>
  );
}

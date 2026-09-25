"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

export type CalendarBooking = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  patientName: string;
};

export type CalendarTimeOff = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
};

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

type Cell = {
  key: string;
  dateStr: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasBooking: boolean;
  hasTimeOff: boolean;
};

function localDateStr(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseMonthParam(monthIso: string): { year: number; month: number } {
  const [y, m] = monthIso.split("-").map(Number);
  return {
    year: y ?? new Date().getFullYear(),
    month: (m ?? new Date().getMonth() + 1) - 1,
  };
}

function monthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function formatDayHeading(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y ?? 2026, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString("en-KE", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function eventDateKey(iso: string): string {
  // Bookings/time-off are stored as ISO; compare on local calendar day.
  return localDateStr(new Date(iso));
}

function buildCells(
  year: number,
  month: number,
  selected: string,
  today: string,
  bookingDays: Set<string>,
  timeOffDays: Set<string>,
): Cell[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);
  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);
    const dateStr = localDateStr(cellDate);
    cells.push({
      key: dateStr,
      dateStr,
      day: cellDate.getDate(),
      inMonth: cellDate.getMonth() === month,
      isToday: dateStr === today,
      isSelected: dateStr === selected,
      hasBooking: bookingDays.has(dateStr),
      hasTimeOff: timeOffDays.has(dateStr),
    });
  }
  return cells;
}

export function AvailabilityCalendar({
  caregiverId,
  monthIso,
  bookings,
  timeOff,
}: {
  caregiverId: string;
  monthIso: string;
  bookings: CalendarBooking[];
  timeOff: CalendarTimeOff[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = localDateStr();
  const { year, month } = parseMonthParam(monthIso);

  const [selected, setSelected] = useState(() =>
    today.startsWith(monthIso) ? today : `${monthIso}-01`,
  );
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("12:00");
  const [blockNote, setBlockNote] = useState("");

  useEffect(() => {
    setSelected((prev) => {
      if (prev.startsWith(monthIso)) return prev;
      return today.startsWith(monthIso) ? today : `${monthIso}-01`;
    });
  }, [monthIso, today]);

  const bookingDays = useMemo(() => {
    const set = new Set<string>();
    for (const b of bookings) set.add(eventDateKey(b.scheduledAt));
    return set;
  }, [bookings]);

  const timeOffDays = useMemo(() => {
    const set = new Set<string>();
    for (const t of timeOff) set.add(eventDateKey(t.date));
    return set;
  }, [timeOff]);

  const cells = useMemo(
    () => buildCells(year, month, selected, today, bookingDays, timeOffDays),
    [year, month, selected, today, bookingDays, timeOffDays],
  );

  const dayBookings = useMemo(
    () => bookings.filter((b) => eventDateKey(b.scheduledAt) === selected),
    [bookings, selected],
  );
  const dayOff = useMemo(
    () => timeOff.filter((t) => eventDateKey(t.date) === selected),
    [timeOff, selected],
  );

  const prevMonth = (() => {
    const d = new Date(year, month - 1, 1);
    return monthParam(d.getFullYear(), d.getMonth());
  })();
  const nextMonth = (() => {
    const d = new Date(year, month + 1, 1);
    return monthParam(d.getFullYear(), d.getMonth());
  })();

  function goMonth(target: string) {
    router.push(`/giver/availability?month=${target}`);
  }

  function addBlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/providers/${caregiverId}/time-off`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selected,
          startTime: blockStart,
          endTime: blockEnd,
          note: blockNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not block time");
        return;
      }
      setBlockNote("");
      router.refresh();
    });
  }

  function removeBlock(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await fetch(
        `/api/providers/${caregiverId}/time-off?blockId=${id}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Could not remove block");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <div className="avail-cal">
        <div className="avail-cal-nav">
          <button
            type="button"
            className="avail-cal-nav-btn"
            aria-label="Previous month"
            onClick={() => goMonth(prevMonth)}
          >
            ‹
          </button>
          <button
            type="button"
            className="avail-cal-month"
            onClick={() => {
              const [y, m] = today.split("-").map(Number);
              goMonth(monthParam(y ?? year, (m ?? 1) - 1));
              setSelected(today);
            }}
          >
            {MONTH_NAMES[month]} {year}
          </button>
          <button
            type="button"
            className="avail-cal-nav-btn"
            aria-label="Next month"
            onClick={() => goMonth(nextMonth)}
          >
            ›
          </button>
        </div>

        <div className="avail-cal-weekdays" aria-hidden="true">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className="avail-cal-grid" role="grid" aria-label="Availability">
          {cells.map((cell) => (
            <button
              key={cell.key}
              type="button"
              role="gridcell"
              aria-pressed={cell.isSelected}
              aria-label={`${cell.dateStr}${cell.hasBooking ? ", has visit" : ""}${cell.hasTimeOff ? ", has time off" : ""}`}
              className={[
                "avail-cal-day",
                cell.inMonth ? "" : "is-outside",
                cell.isToday ? "is-today" : "",
                cell.isSelected ? "is-selected" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => setSelected(cell.dateStr)}
            >
              <span className="avail-cal-day-num">{cell.day}</span>
              {(cell.hasBooking || cell.hasTimeOff) && (
                <span className="avail-cal-dots" aria-hidden>
                  {cell.hasBooking ? (
                    <span className="avail-cal-dot is-booking" />
                  ) : null}
                  {cell.hasTimeOff ? (
                    <span className="avail-cal-dot is-off" />
                  ) : null}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-5 rounded-xl border border-mist bg-white px-4 py-3">
        <h3 className="font-display text-base">{formatDayHeading(selected)}</h3>
        {dayBookings.length === 0 && dayOff.length === 0 ? (
          <p className="mt-2 text-sm text-ink/45">Open — no visits or blocks</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {dayBookings.map((b) => (
              <li
                key={b.id}
                className="rounded-lg bg-sage/10 px-3 py-2 text-sm"
              >
                <span className="font-medium text-sage">
                  {new Date(b.scheduledAt).toLocaleTimeString("en-KE", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                {" · "}
                {b.patientName} ({b.status.replaceAll("_", " ").toLowerCase()})
              </li>
            ))}
            {dayOff.map((t) => (
              <li
                key={t.id}
                className="flex items-start justify-between gap-2 rounded-lg bg-alert/10 px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium text-alert">Blocked</span>{" "}
                  {t.startTime}–{t.endTime}
                  {t.note ? ` · ${t.note}` : ""}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => removeBlock(t.id)}
                  className="shrink-0 text-xs font-semibold text-alert"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form
        id="block-time-off"
        onSubmit={addBlock}
        className="mt-4 scroll-mt-24 rounded-xl border border-mist bg-white p-4"
      >
        <h3 className="font-display text-lg">Block time off</h3>
        <p className="mt-1 text-sm text-ink/55">
          Blocking {formatDayHeading(selected)}. Patients cannot book during
          these hours.
        </p>
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="time"
              value={blockStart}
              onChange={(e) => setBlockStart(e.target.value)}
              className="min-h-11 rounded-lg border border-mist bg-canvas px-3"
              required
            />
            <input
              type="time"
              value={blockEnd}
              onChange={(e) => setBlockEnd(e.target.value)}
              className="min-h-11 rounded-lg border border-mist bg-canvas px-3"
              required
            />
          </div>
          <input
            type="text"
            value={blockNote}
            onChange={(e) => setBlockNote(e.target.value)}
            placeholder="Optional note"
            className="min-h-11 w-full rounded-lg border border-mist bg-canvas px-3"
          />
        </div>
        {error ? <p className="mt-2 text-sm text-alert">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="btn-primary mt-4 w-full disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add block"}
        </button>
      </form>

      <p className="mt-4 text-xs text-ink/45">
        Sage dots mark visits · amber dots mark time off. Base hours are set in
        your profile.
      </p>
    </div>
  );
}

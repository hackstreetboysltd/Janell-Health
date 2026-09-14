"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

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

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function AvailabilityWeekCalendar({
  caregiverId,
  weekStartIso,
  bookings,
  timeOff,
}: {
  caregiverId: string;
  weekStartIso: string;
  bookings: CalendarBooking[];
  timeOff: CalendarTimeOff[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [blockDate, setBlockDate] = useState("");
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("12:00");
  const [blockNote, setBlockNote] = useState("");

  const weekStart = useMemo(
    () => startOfWeek(new Date(weekStartIso)),
    [weekStartIso],
  );
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const prevWeek = dateKey(addDays(weekStart, -7));
  const nextWeek = dateKey(addDays(weekStart, 7));

  function itemsForDay(day: Date) {
    const key = dateKey(day);
    const dayBookings = bookings.filter(
      (b) => b.scheduledAt.slice(0, 10) === key,
    );
    const dayOff = timeOff.filter((t) => t.date.slice(0, 10) === key);
    return { dayBookings, dayOff };
  }

  function addBlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!blockDate) {
      setError("Pick a date.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/providers/${caregiverId}/time-off`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: blockDate,
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
      <div className="flex items-center justify-between gap-2">
        <a
          href={`/giver/availability?week=${prevWeek}`}
          className="rounded-lg border border-mist px-3 py-2 text-sm font-medium text-ink/70"
        >
          ← Prev
        </a>
        <p className="text-sm font-medium text-ink/70">
          Week of {formatDayLabel(weekStart)}
        </p>
        <a
          href={`/giver/availability?week=${nextWeek}`}
          className="rounded-lg border border-mist px-3 py-2 text-sm font-medium text-ink/70"
        >
          Next →
        </a>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {days.map((day) => {
          const { dayBookings, dayOff } = itemsForDay(day);
          const key = dateKey(day);
          const isToday = key === dateKey(new Date());
          return (
            <section
              key={key}
              className={`rounded-xl border bg-white px-4 py-3 ${
                isToday ? "border-sage/40" : "border-mist"
              }`}
            >
              <h3 className="font-display text-base">{formatDayLabel(day)}</h3>
              {dayBookings.length === 0 && dayOff.length === 0 ? (
                <p className="mt-2 text-sm text-ink/45">Open</p>
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
                      {b.patientName} ({b.status.replace("_", " ").toLowerCase()})
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
          );
        })}
      </div>

      <form
        onSubmit={addBlock}
        className="mt-6 rounded-xl border border-mist bg-white p-4"
      >
        <h3 className="font-display text-lg">Block time off</h3>
        <p className="mt-1 text-sm text-ink/55">
          Patients cannot book you during blocked slots.
        </p>
        <div className="mt-4 grid gap-3">
          <input
            type="date"
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-mist bg-canvas px-3"
            required
          />
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
          className="mt-4 flex min-h-11 w-full items-center justify-center rounded-xl bg-sage font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add block"}
        </button>
      </form>

      <p className="mt-4 text-xs text-ink/45">
        Base hours (weekdays/weekends) are set in your profile. Confirmed visits
        appear above and prevent double-booking.
      </p>
    </div>
  );
}

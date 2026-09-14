"use client";

import { useMemo, useState } from "react";
import {
  filterKenyaEmergencyCallbook,
  KENYA_EMERGENCY_CALLBOOK,
} from "@/lib/kenya-emergency-callbook";

export function KenyaEmergencyCallbook() {
  const [query, setQuery] = useState("");
  const results = useMemo(
    () => filterKenyaEmergencyCallbook(query),
    [query],
  );

  return (
    <section className="mt-10">
      <h2 className="font-display text-xl text-[#8b1e1e] dark:text-[#f5a8a8]">
        National emergency callbook
      </h2>
      <p className="mt-2 text-sm text-ink/60">
        Public Kenya hotlines for police, fire, ambulance, and protection
        services. Search by name, number, or category.
      </p>

      <label className="mt-4 block">
        <span className="sr-only">Search national emergency numbers</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search callbook…"
          autoComplete="off"
          className="min-h-11 w-full rounded-xl border border-mist bg-white px-4 text-sm text-ink outline-none ring-[#8b1e1e]/30 placeholder:text-ink/40 focus:ring-2 dark:bg-white/5"
        />
      </label>

      <ul className="mt-4 grid grid-cols-3 gap-2">
        {results.length === 0 ? (
          <li className="col-span-3 rounded-xl border border-dashed border-mist px-4 py-8 text-center text-sm text-ink/50">
            No matches for “{query.trim()}”.
          </li>
        ) : (
          results.map((entry) => (
            <li key={entry.id}>
              <a
                href={`tel:${entry.phone.replace(/\s+/g, "")}`}
                className="flex h-full min-h-[7.5rem] flex-col rounded-xl border border-mist bg-white p-2.5 transition hover:border-[#8b1e1e]/40 hover:bg-[#8b1e1e]/[0.04] dark:bg-white/5"
              >
                <p className="font-mono text-base font-semibold tracking-tight text-[#8b1e1e] dark:text-[#f5a8a8]">
                  {entry.phone}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-snug font-medium text-ink">
                  {entry.name}
                </p>
                <p className="mt-auto pt-2 line-clamp-2 text-[10px] leading-snug text-ink/45">
                  {entry.category}
                </p>
              </a>
            </li>
          ))
        )}
      </ul>

      <p className="mt-3 text-center text-xs text-ink/40">
        {results.length === KENYA_EMERGENCY_CALLBOOK.length
          ? `${KENYA_EMERGENCY_CALLBOOK.length} national lines`
          : `${results.length} of ${KENYA_EMERGENCY_CALLBOOK.length} lines`}
      </p>
    </section>
  );
}

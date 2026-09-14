"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "carelink:dismiss-emergency-banner";

export function EmergencyBanner() {
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  if (dismissed !== false) return null;

  return (
    <div
      role="note"
      className="relative border-b border-[#8b1e1e]/20 bg-[#fff5f5] px-4 py-2.5 pr-11 text-center text-sm text-[#8b1e1e] dark:border-[#8b1e1e]/35 dark:bg-[#2a1515] dark:text-[#f5a8a8]"
    >
      <strong className="font-semibold">Emergency?</strong>{" "}
      <Link href="/emergency" className="font-semibold underline underline-offset-2">
        Verified Emergency Services
      </Link>
      .
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-[#8b1e1e]/70 transition hover:bg-[#8b1e1e]/10 hover:text-[#8b1e1e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8b1e1e] dark:text-[#f5a8a8]/80 dark:hover:bg-[#f5a8a8]/10 dark:hover:text-[#f5a8a8]"
        aria-label="Dismiss emergency notice"
      >
        <span aria-hidden className="text-lg leading-none">
          ×
        </span>
      </button>
    </div>
  );
}

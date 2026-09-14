"use client";

import Link from "next/link";
import { type ReactNode } from "react";

export type NextUpTab<T extends string> = {
  id: T;
  label: string;
  count: number;
  hint?: string;
};

/** Quiet underline tabs used across admin desks. */
export function AdminUnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: NextUpTab<T>[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="flex shrink-0 gap-5 border-b border-mist/80 px-0.5"
    >
      {tabs.map((tab) => {
        const on = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(tab.id)}
            className={[
              "-mb-px border-b-2 pb-2 text-left text-sm transition",
              on
                ? "border-sage text-ink"
                : "border-transparent text-ink/40 hover:text-ink/65",
            ].join(" ")}
          >
            <span className={on ? "font-semibold" : "font-medium"}>
              {tab.label}
            </span>
            <span
              className={[
                "ml-1.5 text-[11px]",
                on ? "font-medium text-ink/50" : "text-ink/30",
              ].join(" ")}
            >
              {tab.hint ?? `· ${tab.count}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export type NextUpRow = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  href?: string;
};

/** Equal record cards — same treatment for every row. */
export function AdminNextUp({
  items,
  emptyMessage,
  ctaLabel = "Open",
  rowFooter,
}: {
  items: NextUpRow[];
  emptyMessage: string;
  ctaLabel?: string;
  rowFooter?: (item: NextUpRow) => ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center px-4">
        <p className="text-center text-sm text-ink/45">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pt-1">
      {items.map((row) => (
        <li key={row.id}>
          <AdminRecordCard
            item={row}
            ctaLabel={ctaLabel}
            footer={rowFooter?.(row)}
          />
        </li>
      ))}
    </ul>
  );
}

export function AdminRecordCard({
  item,
  ctaLabel,
  footer,
  onCta,
  ctaHref,
}: {
  item: NextUpRow;
  ctaLabel: string;
  footer?: ReactNode;
  onCta?: () => void;
  ctaHref?: string;
}) {
  const href = ctaHref ?? item.href;

  return (
    <div className="rounded-2xl border border-sage/30 bg-sage/[0.07] p-3.5 dark:bg-sage/[0.08]">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage text-sm font-bold text-white">
          {initials(item.title)}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate font-display text-xl leading-tight tracking-tight text-ink">
            {item.title}
          </p>
          {item.subtitle ? (
            <p className="mt-1 text-[11px] font-medium text-ink/50">
              {item.subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {href ? (
        <Link
          href={href}
          className="mt-3.5 flex min-h-11 items-center justify-center rounded-xl bg-sage text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
        >
          {ctaLabel}
        </Link>
      ) : onCta ? (
        <button
          type="button"
          onClick={onCta}
          className="mt-3.5 flex min-h-11 w-full items-center justify-center rounded-xl bg-sage text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
        >
          {ctaLabel}
        </button>
      ) : null}
      {footer}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

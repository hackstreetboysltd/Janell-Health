"use client";

import { type ReactNode } from "react";
import {
  RecordCard,
  type RecordMetaRow,
  type RecordTone,
} from "@/components/record-card";

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
  eyebrow?: string;
  status?: string;
  tone?: RecordTone;
  description?: string;
  meta?: RecordMetaRow[];
  tags?: string[];
  footerLeft?: ReactNode;
  /** @deprecated prefer status + meta */
  subtitle?: string;
  href?: string;
  ctaLabel?: string;
};

/** Equal record cards — same treatment for every row across portals. */
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
    <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pt-1">
      {items.map((row, index) => (
        <li key={row.id}>
          <AdminListRecord
            item={row}
            ctaLabel={row.ctaLabel ?? ctaLabel}
            footer={rowFooter?.(row)}
            index={index}
          />
        </li>
      ))}
    </ul>
  );
}

export function AdminListRecord({
  item,
  ctaLabel,
  footer,
  onCta,
  ctaHref,
  index = 0,
}: {
  item: NextUpRow;
  ctaLabel: string;
  footer?: ReactNode;
  onCta?: () => void;
  ctaHref?: string;
  index?: number;
}) {
  const href = ctaHref ?? item.href;
  const meta =
    item.meta ??
    (item.subtitle
      ? [{ label: "Detail", text: item.subtitle } satisfies RecordMetaRow]
      : []);

  return (
    <div>
      <RecordCard
        index={index}
        eyebrow={item.eyebrow}
        title={item.title}
        status={item.status}
        tone={item.tone ?? "sage"}
        description={item.description}
        meta={meta}
        tags={item.tags}
        footerLeft={item.footerLeft}
        cta={ctaLabel}
        href={href}
        onActivate={!href && onCta ? onCta : undefined}
      />
      {footer}
    </div>
  );
}

/** @deprecated Use AdminListRecord — kept as alias for call sites. */
export const AdminRecordCard = AdminListRecord;

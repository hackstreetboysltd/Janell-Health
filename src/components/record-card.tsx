import Link from "next/link";
import type { ReactNode } from "react";
import type { RecordTone } from "@/lib/booking-status-ui";

export type { RecordTone };

export type RecordMetaIcon = "calendar" | "pin" | "phone" | "person";

export type RecordMetaRow = {
  icon?: RecordMetaIcon;
  label: string;
  text: string;
};

export type RecordCardProps = {
  eyebrow?: string;
  title: string;
  status?: string;
  tone?: RecordTone;
  description?: string;
  meta?: RecordMetaRow[];
  tags?: string[];
  footerLeft?: ReactNode;
  cta?: string;
  href?: string | null;
  /** Button mode when there is no href (e.g. copy referral). */
  onActivate?: () => void;
  index?: number;
  className?: string;
};

export const toneRail: Record<RecordTone, string> = {
  sage: "bg-sage",
  warm: "bg-warm",
  alert: "bg-alert",
  muted: "bg-ink/25",
};

export const toneChip: Record<RecordTone, string> = {
  sage: "bg-sage/12 text-sage ring-sage/20",
  warm: "bg-warm/15 text-warm ring-warm/25",
  alert: "bg-alert/12 text-alert ring-alert/20",
  muted: "bg-ink/8 text-ink/55 ring-ink/10",
};

export const toneCta: Record<RecordTone, string> = {
  sage: "text-sage",
  warm: "text-warm",
  alert: "text-alert",
  muted: "text-ink/60",
};

function MetaIcon({ name }: { name: RecordMetaIcon }) {
  switch (name) {
    case "calendar":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect
            x="3.5"
            y="5"
            width="17"
            height="15.5"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path d="M3.5 10h17" stroke="currentColor" strokeWidth="1.75" />
          <path
            d="M8 3.5v3M16 3.5v3"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
    case "pin":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 21s6.5-5.2 6.5-10.2A6.5 6.5 0 0 0 12 4.3a6.5 6.5 0 0 0-6.5 6.5C5.5 15.8 12 21 12 21Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="10.8"
            r="2.1"
            stroke="currentColor"
            strokeWidth="1.75"
          />
        </svg>
      );
    case "phone":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M8.2 4.8c.4-.8 1.4-1.1 2.1-.6l1.6 1.1c.7.5.9 1.4.5 2.1l-.7 1.3c-.2.4-.1.9.2 1.2l2.4 2.4c.3.3.8.4 1.2.2l1.3-.7c.7-.4 1.6-.2 2.1.5l1.1 1.6c.5.7.2 1.7-.6 2.1l-1.3.6c-1.5.7-3.3.4-5.3-1.6-2-2-2.3-3.8-1.6-5.3l.6-1.3Z"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "person":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle
            cx="12"
            cy="8"
            r="3.25"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M5.5 19.2c1.6-2.6 3.8-3.9 6.5-3.9s4.9 1.3 6.5 3.9"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

/** Shared list-record shell — patient, giver, and admin portals. */
export function RecordCard({
  eyebrow,
  title,
  status,
  tone = "muted",
  description,
  meta = [],
  tags = [],
  footerLeft,
  cta,
  href,
  onActivate,
  index = 0,
  className = "",
}: RecordCardProps) {
  const interactive = Boolean(href || onActivate);
  const staggerDelay =
    index > 0 && index < 5
      ? ({ animationDelay: `${index * 0.05}s` } as const)
      : undefined;

  const body = (
    <>
      <span
        aria-hidden
        className={`absolute inset-y-3 left-0 w-1 rounded-full ${toneRail[tone]}`}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-ink/50">
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={`font-display text-xl leading-snug text-ink ${eyebrow ? "mt-1" : ""}`}
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 line-clamp-2 text-sm text-ink/60">{description}</p>
          ) : null}
        </div>
        {status ? (
          <span
            className={`max-w-[9.5rem] shrink-0 rounded-md px-2 py-1 text-center text-[0.6875rem] font-semibold leading-snug ring-1 ring-inset ${toneChip[tone]}`}
          >
            {status}
          </span>
        ) : null}
      </div>

      {meta.length > 0 ? (
        <dl className="mt-3.5 space-y-1.5 text-sm text-ink/65">
          {meta.map((row) => (
            <div key={`${row.label}-${row.text}`} className="flex items-start gap-2">
              {row.icon ? (
                <dt className="mt-0.5 shrink-0 text-ink/40">
                  <MetaIcon name={row.icon} />
                  <span className="sr-only">{row.label}</span>
                </dt>
              ) : (
                <dt className="sr-only">{row.label}</dt>
              )}
              <dd className="line-clamp-2">{row.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {tags.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Details">
          {tags.map((tag) => (
            <li
              key={tag}
              className="rounded-md bg-ink/[0.04] px-2 py-0.5 text-xs text-ink/60 dark:bg-ink/[0.08]"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      {footerLeft || (interactive && cta) ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-mist/80 pt-3">
          <div className="min-w-0 font-mono text-[0.6875rem] text-ink/45">
            {footerLeft}
          </div>
          {interactive && cta ? (
            <span className={`shrink-0 text-sm font-semibold ${toneCta[tone]}`}>
              {cta}
              <span aria-hidden> →</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const shellClass = [
    "record-card relative overflow-hidden py-3.5 pl-4 pr-4 stagger-fade",
    interactive ? "record-card--interactive" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const ariaLabel = [title, status, cta].filter(Boolean).join(". ");

  if (href) {
    return (
      <Link
        href={href}
        className={shellClass}
        style={staggerDelay}
        aria-label={ariaLabel}
      >
        {body}
      </Link>
    );
  }

  if (onActivate) {
    return (
      <button
        type="button"
        onClick={onActivate}
        className={`${shellClass} w-full text-left`}
        style={staggerDelay}
        aria-label={ariaLabel}
      >
        {body}
      </button>
    );
  }

  return (
    <article className={shellClass} style={staggerDelay}>
      {body}
    </article>
  );
}

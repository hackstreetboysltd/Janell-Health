import Link from "next/link";

type Action = {
  href: string;
  label: string;
};

type Props = {
  title: string;
  description?: string;
  action?: Action;
  className?: string;
};

export function EmptyState({ title, description, action, className = "" }: Props) {
  return (
    <div
      className={`empty-state ${className}`}
      role="status"
    >
      <p className="font-display text-lg text-ink/80">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink/50">{description}</p>
      ) : null}
      {action ? (
        <Link href={action.href} className="btn-secondary mt-5 inline-flex">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}

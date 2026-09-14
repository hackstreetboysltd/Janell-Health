type FormErrorAlertProps = {
  message: string | null;
  /** Set false for client-only validation errors before any network call. */
  showRetryHint?: boolean;
};

export function FormErrorAlert({
  message,
  showRetryHint = true,
}: FormErrorAlertProps) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="rounded-xl border border-alert/35 bg-alert/8 px-4 py-3 text-sm text-alert"
    >
      <p className="font-medium">{message}</p>
      {showRetryHint ? (
        <p className="mt-1 text-xs leading-relaxed text-ink/60">
          Your entries are kept — fix the issue and try again.
        </p>
      ) : null}
    </div>
  );
}

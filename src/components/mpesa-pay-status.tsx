"use client";

type PayPhase =
  | "idle"
  | "sending"
  | "prompt"
  | "confirming"
  | "success"
  | "failed"
  | "timeout";

type MpesaPayStatusProps = {
  phase: PayPhase;
  secondsLeft: number | null;
  message: string | null;
  onCancel?: () => void;
};

const PHASE_LABEL: Record<PayPhase, string | null> = {
  idle: null,
  sending: "Sending M-Pesa prompt…",
  prompt: "Waiting for your PIN",
  confirming: "Confirming payment…",
  success: "Payment confirmed",
  failed: null,
  timeout: null,
};

export function MpesaPayStatus({
  phase,
  secondsLeft,
  message,
  onCancel,
}: MpesaPayStatusProps) {
  if (phase === "idle") return null;

  const label = PHASE_LABEL[phase];
  const isWaiting = phase === "prompt" || phase === "sending" || phase === "confirming";
  const isError = phase === "failed" || phase === "timeout";

  return (
    <div
      className={`pay-status stagger-fade ${isWaiting ? "pay-status--waiting" : ""} ${isError ? "pay-status--error" : ""} ${phase === "success" ? "pay-status--success" : ""}`}
      role="status"
      aria-live="polite"
      aria-busy={isWaiting}
    >
      {isWaiting ? (
        <div className="pay-status-icon" aria-hidden>
          <span className="pay-status-phone">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
              <rect
                x="6"
                y="2"
                width="12"
                height="20"
                rx="2.5"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="18" r="1" fill="currentColor" />
            </svg>
          </span>
          <span className="pay-status-pulse" />
        </div>
      ) : null}

      {label ? <p className="pay-status-label">{label}</p> : null}

      {phase === "prompt" ? (
        <p className="pay-status-hint">
          Check your phone for the M-Pesa prompt, then enter your PIN.
        </p>
      ) : null}

      {phase === "prompt" && secondsLeft != null ? (
        <p className="pay-status-timer" aria-label={`${secondsLeft} seconds remaining`}>
          <span className="font-mono tabular-nums">{secondsLeft}s</span> left to approve
        </p>
      ) : null}

      {phase === "success" ? (
        <p className="pay-status-hint">Taking you to your booking…</p>
      ) : null}

      {message && isError ? (
        <p className="pay-status-error" role="alert">
          {message}
        </p>
      ) : null}

      {phase === "timeout" ? (
        <p className="pay-status-hint">
          No confirmation yet. If you already paid, wait a moment and tap{" "}
          <strong className="font-medium text-ink/80">Check again</strong>. Otherwise send a
          new prompt.
        </p>
      ) : null}

      {phase === "prompt" && onCancel ? (
        <button
          type="button"
          onClick={onCancel}
          className="pay-status-cancel min-h-11 rounded-lg px-3 text-sm font-medium text-ink/55 underline-offset-2 hover:text-ink/75 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
        >
          Cancel and edit number
        </button>
      ) : null}
    </div>
  );
}

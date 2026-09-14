type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function scrubFields(fields: LogFields): LogFields {
  const out: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const lower = key.toLowerCase();
    if (
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower === "code" ||
      lower.includes("otp")
    ) {
      out[key] = "[redacted]";
    } else if (typeof value === "string" && value.length > 240) {
      out[key] = `${value.slice(0, 240)}…`;
    } else {
      out[key] = value;
    }
  }
  return out;
}

function forwardToSentry(level: LogLevel, message: string, fields?: LogFields) {
  if (typeof window !== "undefined") return;
  if (level !== "error" && level !== "warn") return;
  if (!process.env.SENTRY_DSN?.trim()) return;

  void import("@sentry/nextjs")
    .then((Sentry) => {
      Sentry.captureMessage(message, {
        level: level === "error" ? "error" : "warning",
        extra: scrubFields(fields ?? {}),
      });
    })
    .catch(() => {
      // Sentry not initialized (tests, local without DSN wiring)
    });
}

function emit(level: LogLevel, message: string, fields?: LogFields) {
  const entry = {
    level,
    message,
    time: new Date().toISOString(),
    ...(fields ? scrubFields(fields) : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error" || level === "warn") {
    console.error(line);
    forwardToSentry(level, message, fields);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, fields?: LogFields) => emit("debug", message, fields),
  info: (message: string, fields?: LogFields) => emit("info", message, fields),
  warn: (message: string, fields?: LogFields) => emit("warn", message, fields),
  error: (message: string, fields?: LogFields) => emit("error", message, fields),
};

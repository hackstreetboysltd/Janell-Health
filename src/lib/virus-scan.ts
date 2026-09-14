import net from "node:net";
import { logger } from "@/lib/logger";

export type MalwareScanFailureReason = "infected" | "unavailable" | "error";

export type MalwareScanResult =
  | { ok: true }
  | { ok: false; reason: MalwareScanFailureReason; message: string };

export type MalwareScanner = (buffer: Buffer) => Promise<MalwareScanResult>;

const DEFAULT_CLAMD_HOST = "127.0.0.1";
const DEFAULT_CLAMD_PORT = 3310;
const DEFAULT_TIMEOUT_MS = 30_000;
const CHUNK_SIZE = 64 * 1024;

/** True when upload scanning is enabled (`CLAMAV_ENABLED=true`). */
export function clamavEnabled(): boolean {
  return process.env.CLAMAV_ENABLED === "true";
}

/**
 * When scanning is required, uploads fail closed if ClamAV is unreachable.
 * Defaults to required in production when scanning is enabled.
 */
export function clamavRequired(): boolean {
  if (!clamavEnabled()) return false;
  if (process.env.CLAMAV_REQUIRED === "false") return false;
  if (process.env.CLAMAV_REQUIRED === "true") return true;
  return process.env.NODE_ENV === "production";
}

function clamdHost(): string {
  return process.env.CLAMD_HOST?.trim() || DEFAULT_CLAMD_HOST;
}

function clamdPort(): number {
  const raw = process.env.CLAMD_PORT?.trim();
  if (!raw) return DEFAULT_CLAMD_PORT;
  const port = Number.parseInt(raw, 10);
  return Number.isFinite(port) && port > 0 ? port : DEFAULT_CLAMD_PORT;
}

function scanTimeoutMs(): number {
  const raw = process.env.CLAMAV_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const ms = Number.parseInt(raw, 10);
  return Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_TIMEOUT_MS;
}

/** Parse a clamd INSTREAM/PING response into a scan result. */
export function parseClamdResponse(response: string): MalwareScanResult {
  const normalized = response.trim();
  if (!normalized) {
    return {
      ok: false,
      reason: "error",
      message: "Unexpected scanner response",
    };
  }

  if (/\bFOUND\b/i.test(normalized)) {
    return {
      ok: false,
      reason: "infected",
      message: "File failed security scan",
    };
  }

  if (/\bOK\b/i.test(normalized) || /\bPONG\b/i.test(normalized)) {
    return { ok: true };
  }

  return {
    ok: false,
    reason: "error",
    message: "Unexpected scanner response",
  };
}

function sendClamdCommand(
  command: Buffer,
  payload?: Buffer,
): Promise<MalwareScanResult> {
  const host = clamdHost();
  const port = clamdPort();
  const timeoutMs = scanTimeoutMs();

  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (result: MalwareScanResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      resolve(result);
    };

    const timer = setTimeout(() => {
      finish({
        ok: false,
        reason: "error",
        message: "Scan timed out",
      });
    }, timeoutMs);

    socket.on("error", () => {
      finish({
        ok: false,
        reason: "unavailable",
        message: "Upload scanning is temporarily unavailable",
      });
    });

    socket.on("data", (data) => {
      chunks.push(data);
    });

    socket.on("connect", () => {
      socket.write(command);
      if (payload) socket.write(payload);
      socket.end();
    });

    socket.on("end", () => {
      finish(parseClamdResponse(Buffer.concat(chunks).toString("utf8")));
    });
  });
}

function buildInstreamPayload(buffer: Buffer): Buffer {
  const parts: Buffer[] = [];
  for (let offset = 0; offset < buffer.length; offset += CHUNK_SIZE) {
    const chunk = buffer.subarray(offset, offset + CHUNK_SIZE);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(chunk.length, 0);
    parts.push(len, chunk);
  }
  const end = Buffer.alloc(4);
  end.writeUInt32BE(0, 0);
  parts.push(end);
  return Buffer.concat(parts);
}

/** Scan bytes with clamd INSTREAM (no temp files). */
export async function scanWithClamd(buffer: Buffer): Promise<MalwareScanResult> {
  return sendClamdCommand(Buffer.from("zINSTREAM\0"), buildInstreamPayload(buffer));
}

/** Ping clamd — used by health checks. */
export async function pingClamd(): Promise<MalwareScanResult> {
  return sendClamdCommand(Buffer.from("zPING\0"));
}

/** Default scanner when ClamAV is enabled. */
export function defaultMalwareScanner(): MalwareScanner {
  return scanWithClamd;
}

/**
 * Scan an upload buffer when ClamAV is enabled.
 * Skips cleanly when disabled; fails closed when required and scanner is down.
 */
export async function scanUploadBuffer(
  buffer: Buffer,
  scanner: MalwareScanner = defaultMalwareScanner(),
): Promise<MalwareScanResult> {
  if (!clamavEnabled()) {
    return { ok: true };
  }

  const result = await scanner(buffer);
  if (!result.ok && result.reason === "infected") {
    logger.warn("upload.malware.blocked");
  } else if (!result.ok && clamavRequired()) {
    logger.error("upload.malware.scanner_unavailable", {
      reason: result.reason,
    });
  } else if (!result.ok) {
    logger.warn("upload.malware.scan_skipped", { reason: result.reason });
    return { ok: true };
  }

  if (!result.ok && clamavRequired()) {
    return result;
  }

  if (!result.ok) {
    return { ok: true };
  }

  return result;
}

/** Health probe — only meaningful when scanning is enabled. */
export async function clamavHealthCheck(): Promise<"ok" | "error" | "skipped"> {
  if (!clamavEnabled()) return "skipped";
  const ping = await pingClamd();
  return ping.ok ? "ok" : "error";
}

"use client";

import { signIn } from "next-auth/react";
import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  rememberDemoLogin,
  readDemoLogins,
  type DemoLogin,
} from "@/lib/demo-logins";
import { formatPhoneDisplay } from "@/lib/phone";
import { SIGN_IN_COPY, type SignInPortal } from "@/lib/sign-in-copy";

type Step = "phone" | "code";
type AuthMode = "otp" | "demo" | "google";

function resolveDefaultMode(
  otpEnabled: boolean,
  googleConfigured: boolean,
  devLoginEnabled: boolean,
): AuthMode {
  if (otpEnabled) return "otp";
  if (googleConfigured) return "google";
  if (devLoginEnabled) return "demo";
  return "otp";
}

export function SignInForm({
  portal,
  googleConfigured,
  otpEnabled,
  devLoginEnabled,
}: {
  portal: SignInPortal;
  googleConfigured: boolean;
  otpEnabled: boolean;
  devLoginEnabled: boolean;
}) {
  const copy = SIGN_IN_COPY[portal];
  const [pending, startTransition] = useTransition();
  const [authMode, setAuthMode] = useState<AuthMode>(() =>
    resolveDefaultMode(otpEnabled, googleConfigured, devLoginEnabled),
  );
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [normalizedPhone, setNormalizedPhone] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openField, setOpenField] = useState<"email" | "name" | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const savedLogins = useMemo(
    () => readDemoLogins().filter((login) => login.portal === portal),
    [portal],
  );

  const callbackUrl = portal === "admin" ? "/admin" : "/";
  const canUseDemo = devLoginEnabled && !googleConfigured;
  const canUseOtp = otpEnabled;
  const canUseGoogle = googleConfigured;
  const showDevToggle = canUseOtp && canUseDemo;

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!formRef.current?.contains(event.target as Node)) {
        setOpenField(null);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  async function setPortalCookie() {
    await fetch("/api/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ portal }),
    });
  }

  function pickLogin(login: DemoLogin) {
    setEmail(login.email);
    setName(login.name);
    setOpenField(null);
  }

  function switchAuthMode(next: AuthMode) {
    setAuthMode(next);
    setError(null);
    setStep("phone");
    setCode("");
  }

  function sendCode() {
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not send code");
        return;
      }
      setNormalizedPhone(data.phone);
      setStep("code");
    });
  }

  function verifyOtp() {
    setError(null);
    startTransition(async () => {
      await setPortalCookie();
      const result = await signIn("phone-otp", {
        phone: normalizedPhone || phone,
        code,
        portal,
        callbackUrl,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid or expired code. Try again or request a new one.");
        return;
      }
      window.location.assign(result?.url || callbackUrl);
    });
  }

  function demoLogIn() {
    setError(null);
    startTransition(async () => {
      if (!email.includes("@")) {
        setError("Enter your email.");
        return;
      }
      const resolvedName =
        name ||
        (portal === "giver"
          ? "Healthcare Giver"
          : portal === "admin"
            ? "Admin"
            : "Patient");
      await setPortalCookie();
      const result = await signIn("dev-google", {
        email,
        name: resolvedName,
        portal,
        callbackUrl,
        redirect: false,
      });
      if (result?.error) {
        setError("Could not log in. Check the server is running and try again.");
        return;
      }
      rememberDemoLogin({ email, name: resolvedName, portal });
      window.location.assign(result?.url || callbackUrl);
    });
  }

  function continueGoogle() {
    setError(null);
    startTransition(async () => {
      await setPortalCookie();
      await signIn("google", { callbackUrl });
    });
  }

  const showDropdown = openField !== null && savedLogins.length > 0;

  const hint =
    authMode === "demo"
      ? copy.demoHint
      : authMode === "google"
        ? "Continue with your Google account."
        : copy.otpHint;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl tracking-tight text-ink">{copy.title}</h1>
        <p className="mt-1 text-sm text-ink/50">{hint}</p>
      </div>
      {authMode === "otp" && canUseOtp ? (
        <div className="flex flex-col gap-4">
          {step === "phone" ? (
            <>
              <label className="block text-sm font-medium text-ink/80">
                Phone number
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 min-h-12 w-full rounded-lg border border-mist bg-white px-3 font-mono dark:border-ink/15 dark:bg-white/5"
                  placeholder="07XX XXX XXX"
                  inputMode="tel"
                  autoComplete="tel"
                />
              </label>
              <button
                type="button"
                disabled={pending || phone.replace(/\D/g, "").length < 9}
                onClick={sendCode}
                className="flex min-h-12 w-full items-center justify-center rounded-lg bg-sage font-medium text-white disabled:opacity-60"
              >
                {pending ? "Sending…" : "Send code"}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-ink/50">
                Sent to{" "}
                <span className="font-mono text-ink/75">
                  {formatPhoneDisplay(normalizedPhone)}
                </span>
              </p>
              <label className="block text-sm font-medium text-ink/80">
                Code
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="mt-1.5 min-h-12 w-full rounded-lg border border-mist bg-white px-3 text-center font-mono text-lg tracking-widest dark:border-ink/15 dark:bg-white/5"
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
              </label>
              <button
                type="button"
                disabled={pending || code.length !== 6}
                onClick={verifyOtp}
                className="flex min-h-12 w-full items-center justify-center rounded-lg bg-sage font-medium text-white disabled:opacity-60"
              >
                {pending ? "Verifying…" : "Continue"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  setStep("phone");
                  setCode("");
                  setError(null);
                }}
                className="text-sm text-ink/50 hover:text-sage"
              >
                Change number
              </button>
            </>
          )}
        </div>
      ) : null}

      {authMode === "demo" && canUseDemo ? (
        <div ref={formRef} className="flex flex-col gap-4">
          <label className="relative block text-sm font-medium text-ink/80">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setOpenField("email")}
              className="mt-1.5 min-h-12 w-full rounded-lg border border-mist bg-white px-3 dark:border-ink/15 dark:bg-white/5"
              placeholder="you@gmail.com"
              autoComplete="off"
              aria-controls={showDropdown && openField === "email" ? listId : undefined}
            />
            {showDropdown && openField === "email" ? (
              <SavedLoginsMenu id={listId} logins={savedLogins} onPick={pickLogin} />
            ) : null}
          </label>
          <label className="relative block text-sm font-medium text-ink/80">
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setOpenField("name")}
              className="mt-1.5 min-h-12 w-full rounded-lg border border-mist bg-white px-3 dark:border-ink/15 dark:bg-white/5"
              placeholder="Full name"
            />
          </label>
          <button
            type="button"
            disabled={pending}
            onClick={demoLogIn}
            className="flex min-h-12 w-full items-center justify-center rounded-lg bg-sage font-medium text-white disabled:opacity-60"
          >
            Continue
          </button>
        </div>
      ) : null}

      {authMode === "google" && canUseGoogle ? (
        <button
          type="button"
          disabled={pending}
          onClick={continueGoogle}
          className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-mist bg-white px-4 font-medium text-ink transition hover:bg-canvas/80 disabled:opacity-60 dark:border-ink/15 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <GoogleIcon />
          Continue with Google
        </button>
      ) : null}

      {canUseGoogle && authMode === "otp" ? (
        <>
          <p className="text-center text-xs text-ink/40">or</p>
          <button
            type="button"
            disabled={pending}
            onClick={continueGoogle}
            className="flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-mist bg-white px-4 font-medium text-ink transition hover:bg-canvas/80 disabled:opacity-60 dark:border-ink/15 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </>
      ) : null}

      {showDevToggle ? (
        <button
          type="button"
          onClick={() => switchAuthMode(authMode === "otp" ? "demo" : "otp")}
          className="text-center text-xs text-ink/40 hover:text-ink/60"
        >
          {authMode === "otp" ? "Dev: sign in with email instead" : "Back to phone sign in"}
        </button>
      ) : null}

      {error ? <p className="text-sm text-alert">{error}</p> : null}
    </div>
  );
}

function SavedLoginsMenu({
  id,
  logins,
  onPick,
}: {
  id: string;
  logins: DemoLogin[];
  onPick: (login: DemoLogin) => void;
}) {
  return (
    <ul
      id={id}
      role="listbox"
      className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-mist bg-white py-1 shadow-lg dark:border-ink/15 dark:bg-white/95"
    >
      {logins.map((login) => (
        <li key={login.id} role="option" aria-selected={false}>
          <button
            type="button"
            className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-canvas"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(login)}
          >
            <span className="text-sm font-medium text-ink">{login.email}</span>
            <span className="text-xs text-ink/55">{login.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.5 5.5-6.5 6.6l.1.1 6.2 5.2C36.9 41.1 44 36 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}

"use client";

import { signIn } from "next-auth/react";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  rememberDemoLogin,
  readDemoLogins,
  type DemoLogin,
} from "@/lib/demo-logins";

export function SignInForm({
  portal,
  googleConfigured,
}: {
  portal: "patient" | "giver";
  googleConfigured: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedLogins, setSavedLogins] = useState<DemoLogin[]>([]);
  const [openField, setOpenField] = useState<"email" | "name" | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Home routes by role + portal-specific onboarded state.
  const callbackUrl = "/";

  useEffect(() => {
    setSavedLogins(readDemoLogins().filter((login) => login.portal === portal));
  }, [portal]);

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

  function demoLogIn() {
    setError(null);
    startTransition(async () => {
      if (!email.includes("@")) {
        setError("Enter your email.");
        return;
      }
      const resolvedName =
        name || (portal === "giver" ? "Healthcare Giver" : "Patient");
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

      if (googleConfigured) {
        await signIn("google", { callbackUrl });
        return;
      }

      setError("Google OAuth is not configured yet — use Log in with email and name.");
    });
  }

  const showDropdown = openField !== null && savedLogins.length > 0;

  return (
    <div className="flex flex-col gap-4">
      {!googleConfigured ? (
        <div ref={formRef} className="rounded-lg border border-mist bg-white p-4">
          <p className="mb-3 text-sm text-ink/60">
            Temporary demo sign-in — email and name only until{" "}
            <span className="font-mono text-xs">AUTH_GOOGLE_*</span> is set.
          </p>
          <label className="relative block text-sm font-medium text-ink/80">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setOpenField("email")}
              onClick={() => setOpenField("email")}
              className="mt-1 min-h-12 w-full rounded-lg border border-mist bg-canvas px-3"
              placeholder="you@gmail.com"
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={showDropdown && openField === "email" ? listId : undefined}
              aria-expanded={showDropdown && openField === "email"}
            />
            {showDropdown && openField === "email" ? (
              <SavedLoginsMenu
                id={listId}
                logins={savedLogins}
                onPick={pickLogin}
              />
            ) : null}
          </label>
          <label className="relative mt-3 block text-sm font-medium text-ink/80">
            Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={() => setOpenField("name")}
              onClick={() => setOpenField("name")}
              className="mt-1 min-h-12 w-full rounded-lg border border-mist bg-canvas px-3"
              placeholder="Full name"
              autoComplete="off"
              aria-autocomplete="list"
              aria-controls={showDropdown && openField === "name" ? listId : undefined}
              aria-expanded={showDropdown && openField === "name"}
            />
            {showDropdown && openField === "name" ? (
              <SavedLoginsMenu
                id={listId}
                logins={savedLogins}
                onPick={pickLogin}
              />
            ) : null}
          </label>
        </div>
      ) : null}

      {!googleConfigured ? (
        <button
          type="button"
          disabled={pending}
          onClick={demoLogIn}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-sage px-4 text-base font-semibold text-white transition hover:bg-sage/90 disabled:opacity-60"
        >
          Log in
        </button>
      ) : null}

      <button
        type="button"
        disabled={pending || !googleConfigured}
        onClick={continueGoogle}
        className={
          googleConfigured
            ? "flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-sage px-4 text-base font-semibold text-white transition hover:bg-sage/90 disabled:opacity-60"
            : "flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-mist bg-white px-4 text-base font-semibold text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        <GoogleIcon />
        Continue with Google
      </button>
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
      className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-lg border border-mist bg-white py-1 shadow-[0_8px_24px_rgba(20,32,26,0.12)]"
    >
      {logins.map((login) => (
        <li key={login.id} role="option">
          <button
            type="button"
            className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left transition hover:bg-canvas"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(login)}
          >
            <span className="text-sm font-medium text-ink">{login.email}</span>
            <span className="text-xs text-ink/55">
              {login.name}
              <span className="text-ink/35">
                {" "}
                · {login.portal === "giver" ? "giver" : "patient"}
              </span>
            </span>
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

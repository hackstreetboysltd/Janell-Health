"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";
import { AuthLoadingStub } from "@/components/auth-loading-stub";
import {
  beginAuthTransition as persistBegin,
  clearAuthTransition,
  readAuthTransition,
  type AuthTransitionKind,
  type AuthTransitionState,
} from "@/lib/auth-transition";

type AuthTransitionApi = {
  /** Show the hold screen immediately (and persist across OAuth return). */
  begin: (kind: AuthTransitionKind, status?: string) => void;
  end: () => void;
  active: AuthTransitionState | null;
};

const AuthTransitionContext = createContext<AuthTransitionApi | null>(null);

export function AuthTransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status: sessionStatus } = useSession();
  const [active, setActive] = useState<AuthTransitionState | null>(() =>
    readAuthTransition(),
  );
  /** True when begin() ran in this JS realm (leaving for Google / awaiting signIn). */
  const outboundRef = useRef(false);

  const begin = useCallback((kind: AuthTransitionKind, status?: string) => {
    outboundRef.current = true;
    setActive(persistBegin(kind, status));
  }, []);

  const end = useCallback(() => {
    outboundRef.current = false;
    clearAuthTransition();
    setActive(null);
  }, []);

  useEffect(() => {
    if (!active) return;
    if (sessionStatus === "loading") return;

    const finishedIn =
      active.kind === "in" &&
      (sessionStatus === "authenticated" ||
        (sessionStatus === "unauthenticated" && !outboundRef.current));
    const finishedOut =
      active.kind === "out" && sessionStatus === "unauthenticated";
    if (!finishedIn && !finishedOut) return;

    // Defer so we don't setState synchronously inside the effect body.
    const t = window.setTimeout(() => {
      end();
    }, 0);
    return () => window.clearTimeout(t);
  }, [active, sessionStatus, end]);

  const api = useMemo(
    () => ({ begin, end, active }),
    [begin, end, active],
  );

  return (
    <AuthTransitionContext.Provider value={api}>
      {children}
      {active ? (
        <div className="auth-loading-portal" aria-busy="true">
          <AuthLoadingStub status={active.status} />
        </div>
      ) : null}
    </AuthTransitionContext.Provider>
  );
}

export function useAuthTransition(): AuthTransitionApi {
  const ctx = useContext(AuthTransitionContext);
  if (!ctx) {
    throw new Error("useAuthTransition must be used within AuthTransitionProvider");
  }
  return ctx;
}

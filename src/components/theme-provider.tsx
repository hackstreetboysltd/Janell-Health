"use client";

import { useEffect, useRef } from "react";
import { useServerInsertedHTML } from "next/navigation";
import { THEME_INIT_SCRIPT } from "@/lib/theme-init";

function applySystemTheme() {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.classList.add(dark ? "dark" : "light");
  root.dataset.theme = "system";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scriptInserted = useRef(false);

  // Inject FOUC-prevention script outside the React tree (avoids React 19
  // "Encountered a script tag while rendering React component" warning).
  useServerInsertedHTML(() => {
    if (scriptInserted.current) return null;
    scriptInserted.current = true;
    return (
      <script
        id="carelink-theme-init"
        dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
      />
    );
  });

  useEffect(() => {
    applySystemTheme();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", applySystemTheme);
    return () => mq.removeEventListener("change", applySystemTheme);
  }, []);

  return children;
}

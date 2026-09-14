"use client";

import { useEffect, useRef } from "react";
import {
  clearFormDraft,
  createDraftDebouncer,
  readFormDraft,
} from "@/lib/form-draft";

type UseFormDraftOptions = {
  /** When false, skip load/save (e.g. repeat-booking with server initial). */
  enabled?: boolean;
  debounceMs?: number;
};

/**
 * Restores field values from localStorage on mount and saves snapshots on change.
 * Call `clearDraft()` only after a successful submit.
 */
export function useFormDraft<T extends object>(
  storageKey: string,
  snapshot: T,
  applyDraft: (draft: Partial<T>) => void,
  options: UseFormDraftOptions = {},
): { clearDraft: () => void } {
  const { enabled = true, debounceMs = 400 } = options;
  const hydrated = useRef(false);
  const debounceRef = useRef<ReturnType<typeof createDraftDebouncer> | null>(null);
  const applyRef = useRef(applyDraft);

  useEffect(() => {
    applyRef.current = applyDraft;
  });

  useEffect(() => {
    if (!enabled || hydrated.current) return;
    hydrated.current = true;
    const draft = readFormDraft<Partial<T>>(storageKey);
    if (draft) applyRef.current(draft);
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!enabled) return;
    debounceRef.current ??= createDraftDebouncer(debounceMs);
    debounceRef.current(storageKey, snapshot);
  }, [enabled, storageKey, snapshot, debounceMs]);

  return {
    clearDraft: () => clearFormDraft(storageKey),
  };
}

"use client";

import { useEffect, useMemo, useRef } from "react";

/**
 * Tracks whether a form snapshot differs from the baseline captured when `ready` becomes true.
 * Baseline is re-captured when `ready` flips from false → true (e.g. after async prefill).
 */
export function useFormDirtySnapshot<T>(snapshot: T, options?: { ready?: boolean }): boolean {
  const ready = options?.ready ?? true;
  const baselineRef = useRef<string | null>(null);
  const snapshotKey = useMemo(() => JSON.stringify(snapshot), [snapshot]);

  useEffect(() => {
    if (!ready) {
      baselineRef.current = null;
      return;
    }
    if (baselineRef.current === null) {
      baselineRef.current = snapshotKey;
    }
  }, [ready, snapshotKey]);

  return useMemo(() => {
    if (!ready || baselineRef.current === null) return false;
    return snapshotKey !== baselineRef.current;
  }, [ready, snapshotKey]);
}

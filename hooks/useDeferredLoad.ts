"use client";

import { startTransition, useEffect, useState } from "react";

/**
 * Runs a sync loader after paint so route shell renders immediately.
 */
export function useDeferredLoad<T>(loader: () => T, deps: unknown[] = []): {
  data: T;
  ready: boolean;
} {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      startTransition(() => {
        setData(loader());
        setReady(true);
      });
    };
    const id = requestAnimationFrame(run);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    data: (data ?? loader()) as T,
    ready,
  };
}

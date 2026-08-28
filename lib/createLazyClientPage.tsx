"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Thin route entry: loads the heavy client module in its own chunk.
 * Page-level loading is intentionally omitted — each page handles its own UI state.
 */
export function createLazyClientPage<P extends object = Record<string, never>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
) {
  const Client = dynamic(importFn, {
    loading: () => null,
    ssr: false,
  });

  function LazyPage(props: P) {
    return <Client {...props} />;
  }

  return LazyPage;
}

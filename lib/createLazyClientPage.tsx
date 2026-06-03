"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { PageContentSkeleton } from "@/components/layout/PageContentSkeleton";

/**
 * Thin route entry: loads the heavy client module in its own chunk.
 * The app shell + loading.tsx render immediately; this chunk compiles on demand.
 */
export function createLazyClientPage<P extends object = Record<string, never>>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
) {
  const Client = dynamic(importFn, {
    loading: () => <PageContentSkeleton />,
    ssr: false,
  });

  function LazyPage(props: P) {
    return <Client {...props} />;
  }

  return LazyPage;
}

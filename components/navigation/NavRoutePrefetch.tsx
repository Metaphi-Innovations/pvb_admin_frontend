"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { collectNavHrefs } from "./nav-config";

const PREFETCH_BATCH_SIZE = 4;
const PREFETCH_BATCH_DELAY_MS = 250;
/** In dev, skip background prefetch — each route triggers a webpack/turbo compile and slows first paint. */
const MAX_DEV_PREFETCH = 0;

function prefetchInBatches(
  router: ReturnType<typeof useRouter>,
  hrefs: string[],
  cancelled: () => boolean,
) {
  let index = 0;

  const runBatch = () => {
    if (cancelled()) return;
    const slice = hrefs.slice(index, index + PREFETCH_BATCH_SIZE);
    index += PREFETCH_BATCH_SIZE;
    for (const href of slice) {
      try {
        router.prefetch(href);
      } catch {
        // ignore prefetch errors in dev
      }
    }
    if (index < hrefs.length) {
      window.setTimeout(runBatch, PREFETCH_BATCH_DELAY_MS);
    }
  };

  runBatch();
}

/**
 * Prefetch navbar routes in small batches during idle time.
 * Avoids freezing the tab in dev when dozens of routes compile at once.
 */
export function NavRoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const isCancelled = () => cancelled;

    const allHrefs = collectNavHrefs();
    const hrefs =
      process.env.NODE_ENV === "development"
        ? allHrefs.slice(0, MAX_DEV_PREFETCH)
        : allHrefs;

    const start = () => prefetchInBatches(router, hrefs, isCancelled);

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(start, { timeout: 4000 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const t = window.setTimeout(start, 1500);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [router]);

  return null;
}

/** Prefetch flyout links when a menu opens — capped to avoid dev freezes. */
export function prefetchNavChildren(
  router: ReturnType<typeof useRouter>,
  children: { href: string }[],
) {
  const limit = process.env.NODE_ENV === "development" ? 8 : children.length;
  children.slice(0, limit).forEach((c) => {
    try {
      router.prefetch(c.href);
    } catch {
      // ignore
    }
  });
}

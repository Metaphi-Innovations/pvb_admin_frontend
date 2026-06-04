"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { collectNavHrefs } from "./nav-config";

/**
 * Prefetch all navbar routes during idle time so first submenu click is faster.
 */
export function NavRoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    const hrefs = collectNavHrefs();
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      hrefs.forEach((href) => {
        try {
          router.prefetch(href);
        } catch {
          // ignore prefetch errors in dev
        }
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const t = window.setTimeout(run, 800);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [router]);

  return null;
}

/** Prefetch all links in a flyout when it opens. */
export function prefetchNavChildren(
  router: ReturnType<typeof useRouter>,
  children: { href: string }[],
) {
  children.forEach((c) => {
    try {
      router.prefetch(c.href);
    } catch {
      // ignore
    }
  });
}

"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type NavigationPendingContextValue = {
  pendingHref: string | null;
  pendingLabel: string | null;
  isNavigating: boolean;
  /** Track pending UI for Link clicks (native navigation). */
  trackNavigation: (href: string, label?: string) => void;
  /** preventDefault + router.push — for portaled mega-menu links. */
  navigateTo: (href: string, label?: string, e?: React.MouseEvent) => void;
  isHrefPending: (href: string) => boolean;
};

const NavigationPendingContext = createContext<NavigationPendingContextValue | null>(null);

function normalizePath(href: string): string {
  return href.split("?")[0].split("#")[0];
}

function hrefMatchesRoute(href: string, pathname: string, search: string): boolean {
  const path = normalizePath(href);
  if (pathname !== path && !pathname.startsWith(`${path}/`)) return false;
  const query = href.includes("?") ? href.split("?")[1] : "";
  if (!query) return true;
  const expected = new URLSearchParams(query);
  const current = new URLSearchParams(search.replace(/^\?/, ""));
  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) return false;
  }
  return true;
}

export function NavigationPendingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isTransitionPending, startTransition] = useTransition();
  const [target, setTarget] = useState<{ href: string; label: string | null } | null>(null);
  const inFlightRef = useRef<string | null>(null);

  const clearPending = useCallback(() => {
    setTarget(null);
    inFlightRef.current = null;
  }, []);

  useEffect(() => {
    if (!target) return;
    const search =
      typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";
    if (hrefMatchesRoute(target.href, pathname, search)) {
      clearPending();
    }
  }, [pathname, target, clearPending]);

  useEffect(() => {
    if (!target) return;
    const timeout = window.setTimeout(clearPending, 20000);
    return () => window.clearTimeout(timeout);
  }, [target, clearPending]);

  const readSearch = () =>
    typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : "";

  const trackNavigation = useCallback(
    (href: string, label?: string) => {
      if (!href || href === "#") return;
      if (inFlightRef.current === href) return;
      if (hrefMatchesRoute(href, pathname, readSearch())) return;
      inFlightRef.current = href;
      setTarget({ href, label: label ?? null });
    },
    [pathname],
  );

  const navigateTo = useCallback(
    (href: string, label?: string, e?: React.MouseEvent) => {
      if (!href || href === "#") return;
      e?.preventDefault();
      if (inFlightRef.current === href) return;
      if (hrefMatchesRoute(href, pathname, readSearch())) {
        return;
      }
      inFlightRef.current = href;
      setTarget({ href, label: label ?? null });
      startTransition(() => {
        router.push(href);
      });
    },
    [pathname, router],
  );

  const isHrefPending = useCallback(
    (href: string) => target?.href === href,
    [target],
  );

  const value = useMemo(
    (): NavigationPendingContextValue => ({
      pendingHref: target?.href ?? null,
      pendingLabel: target?.label ?? null,
      isNavigating: Boolean(target) || isTransitionPending,
      trackNavigation,
      navigateTo,
      isHrefPending,
    }),
    [target, isTransitionPending, trackNavigation, navigateTo, isHrefPending],
  );

  return (
    <NavigationPendingContext.Provider value={value}>{children}</NavigationPendingContext.Provider>
  );
}

export function useNavigationPending(): NavigationPendingContextValue {
  const ctx = useContext(NavigationPendingContext);
  if (!ctx) {
    throw new Error("useNavigationPending must be used within NavigationPendingProvider");
  }
  return ctx;
}

/** Safe hook for components outside the provider (returns no-op). */
export function useNavigationPendingOptional(): NavigationPendingContextValue | null {
  return useContext(NavigationPendingContext);
}

"use client";

/**
 * AppShell — persistent client-side chrome for all (app) routes.
 *
 * TopNavbar / AppHeader / progress / prefetch are client-only (dynamic ssr:false).
 * Static SSR of those modules was throwing "Element type is invalid … undefined"
 * during App Router RSC/SSR in this Next 14.2.35 setup; CSR still mounts them.
 *
 * Chrome (navbar + header) sits OUTSIDE the scroll container so it always stays
 * visible. Page content scrolls inside <main>.
 */

import React, { Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { FYProvider } from "@/lib/fy-store";
import { NavigationPendingProvider } from "@/components/navigation/NavigationPendingContext";

const NavRoutePrefetch = dynamic(
  () => import("@/components/navigation/NavRoutePrefetch").then((m) => m.NavRoutePrefetch),
  { ssr: false },
);

const NavigationProgress = dynamic(
  () => import("./NavigationProgress").then((m) => m.NavigationProgress),
  { ssr: false },
);

function NavbarFallback() {
  return (
    <nav className="h-[56px] bg-white border-b border-border/70 shadow-navbar flex items-center z-[100] flex-shrink-0">
      <div className="flex items-center px-4 border-r border-border h-full flex-shrink-0">
        <div className="h-8 w-[140px] rounded-md bg-brand-50 border border-brand-100" />
      </div>
      <div className="flex-1 px-3 flex items-center gap-2">
        <div className="h-7 w-16 rounded-lg bg-muted/60" />
        <div className="h-7 w-20 rounded-lg bg-muted/60" />
        <div className="h-7 w-16 rounded-lg bg-muted/60" />
      </div>
    </nav>
  );
}

function HeaderFallback() {
  return <div className="h-12 border-b border-border/60 bg-white flex-shrink-0" />;
}

const TopNavbar = dynamic(
  () => import("./TopNavbar").then((m) => m.TopNavbar),
  {
    ssr: false,
    loading: () => <NavbarFallback />,
  },
);

const AppHeader = dynamic(
  () => import("./AppHeader").then((m) => m.AppHeader),
  {
    ssr: false,
    loading: () => <HeaderFallback />,
  },
);

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const RELOAD_KEY = "ds_chunk_reload_count";
    const RELOAD_AT_KEY = "ds_chunk_reload_at";

    const isChunkError = (reason: unknown) => {
      const msg = reason instanceof Error ? reason.message : String(reason ?? "");
      const name = reason instanceof Error ? reason.name : "";
      return (
        name === "ChunkLoadError" ||
        msg.includes("ChunkLoadError") ||
        msg.includes("Loading chunk") ||
        msg.includes("Loading CSS chunk") ||
        msg.includes("Failed to fetch dynamically imported module")
      );
    };

    const hardRecover = () => {
      const count = Number(sessionStorage.getItem(RELOAD_KEY) || "0");
      const lastAt = Number(sessionStorage.getItem(RELOAD_AT_KEY) || "0");
      const now = Date.now();
      // Allow up to 2 auto-reloads, spaced so a still-corrupt cache can settle after a clean restart
      if (count >= 2 && now - lastAt < 60_000) return;
      sessionStorage.setItem(RELOAD_KEY, String(count >= 2 ? 1 : count + 1));
      sessionStorage.setItem(RELOAD_AT_KEY, String(now));
      const url = new URL(window.location.href);
      url.searchParams.set("_ds_cache", String(now));
      window.location.replace(url.toString());
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason)) hardRecover();
    };
    const onError = (event: ErrorEvent) => {
      if (isChunkError(event.error ?? event.message)) hardRecover();
    };

    /**
     * Production `.next` under `next dev` often serves HTML for CSS URLs
     * (200 + text/html). Stylesheets never apply → raw browser defaults.
     * Detect that and force a hard navigation once.
     */
    const probeStylesheets = async () => {
      const links = Array.from(
        document.querySelectorAll<HTMLLinkElement>(
          'link[rel="stylesheet"][href*="/_next/static/css/"]',
        ),
      );
      for (const link of links) {
        try {
          const res = await fetch(link.href, { cache: "no-store" });
          const ct = (res.headers.get("content-type") || "").toLowerCase();
          if (ct.includes("text/html")) {
            console.warn(
              "[AppShell] Next CSS asset returned HTML — likely corrupt/production `.next`. Reloading…",
            );
            hardRecover();
            return;
          }
        } catch {
          /* network blip — ignore; chunk error handlers cover hard failures */
        }
      }
    };

    void probeStylesheets();

    // Clear reload counter once the app has been healthy for a few seconds
    const clearTimer = window.setTimeout(() => {
      sessionStorage.removeItem(RELOAD_KEY);
      sessionStorage.removeItem(RELOAD_AT_KEY);
      const url = new URL(window.location.href);
      if (url.searchParams.has("_ds_cache")) {
        url.searchParams.delete("_ds_cache");
        window.history.replaceState({}, "", url.toString());
      }
    }, 4000);

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.clearTimeout(clearTimer);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return (
    <FYProvider>
      <NavigationPendingProvider>
        <NavRoutePrefetch />
        <NavigationProgress />
        <div className="h-dvh max-h-dvh bg-background flex flex-col overflow-hidden">
          {/* Persistent chrome — never scrolls away with page content */}
          <div className="flex-shrink-0 z-[100]">
            <Suspense fallback={<NavbarFallback />}>
              <TopNavbar />
            </Suspense>
          </div>
          <div className="flex-shrink-0 z-[90]">
            <Suspense fallback={<HeaderFallback />}>
              <AppHeader />
            </Suspense>
          </div>
          <main className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden flex flex-col bg-muted/30">
            {children}
          </main>
        </div>
      </NavigationPendingProvider>
    </FYProvider>
  );
}

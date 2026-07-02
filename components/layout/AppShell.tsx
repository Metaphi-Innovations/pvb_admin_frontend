"use client";

/**
 * AppShell — persistent client-side chrome for all (app) routes.
 *
 * Renders once and persists across page navigations (via app/(app)/layout.tsx).
 * TopNavbar, AppHeader, and FYProvider are mounted exactly once, so:
 *   - Dropdown state is never destroyed mid-click
 *   - FY context is never reset on navigation
 *   - No layout flash between pages
 */

import React, { Suspense, useEffect } from "react";
import { FYProvider } from "@/lib/fy-store";
import { NavRoutePrefetch } from "@/components/navigation/NavRoutePrefetch";
import { NavigationProgress } from "./NavigationProgress";
import { TopNavbar } from "./TopNavbar";
import { AppHeader } from "./AppHeader";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  // Dev: after `dev:clean` or server restart, the browser may still reference old chunk URLs.
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const isChunkError = (reason: unknown) => {
      const msg = reason instanceof Error ? reason.message : String(reason ?? "");
      const name = reason instanceof Error ? reason.name : "";
      return name === "ChunkLoadError" || msg.includes("ChunkLoadError") || msg.includes("Loading chunk");
    };

    const reloadOnce = () => {
      const key = "ds_chunk_reload";
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      window.location.reload();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkError(event.reason)) reloadOnce();
    };
    const onError = (event: ErrorEvent) => {
      if (isChunkError(event.error ?? event.message)) reloadOnce();
    };

    window.addEventListener("unhandledrejection", onRejection);
    window.addEventListener("error", onError);
    return () => {
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("error", onError);
    };
  }, []);

  return (
    <FYProvider>
      <NavRoutePrefetch />
      <NavigationProgress />
      <div className="min-h-screen bg-background flex flex-col">
        <Suspense
          fallback={
            <nav className="h-[56px] bg-white border-b border-border/70 shadow-navbar flex items-center z-[100] sticky top-0" />
          }
        >
          <TopNavbar />
        </Suspense>

        <AppHeader />

        <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col bg-muted/30">
          {children}
        </main>
      </div>
    </FYProvider>
  );
}

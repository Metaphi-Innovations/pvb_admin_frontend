"use client";

/**
 * AppShell — persistent chrome for all (app) routes.
 *
 * TopNavbar / AppHeader are statically imported so they can SSR.
 * Progress + nav prefetch stay client-only (dynamic ssr:false).
 */

import React, { useEffect } from "react";
import dynamic from "next/dynamic";
import { FYProvider } from "@/lib/fy-store";
import { NavigationPendingProvider } from "@/components/navigation/NavigationPendingContext";
import { TopNavbar } from "./TopNavbar";
import { AppHeader } from "./AppHeader";

const NavRoutePrefetch = dynamic(
  () => import("@/components/navigation/NavRoutePrefetch").then((m) => m.NavRoutePrefetch),
  { ssr: false },
);

const NavigationProgress = dynamic(
  () => import("./NavigationProgress").then((m) => m.NavigationProgress),
  { ssr: false },
);

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
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
      <NavigationPendingProvider>
        <NavRoutePrefetch />
        <NavigationProgress />
        <div className="min-h-screen bg-background flex flex-col">
          {/* 56px — sticky, z-50 — persists across all navigations */}
          <TopNavbar />

          {/* 48px — sticky below navbar — does not re-render on route change */}
          <AppHeader />

          {/* Page content area — only this part swaps on navigation */}
          <main className="flex-1 min-h-0 w-full bg-muted/30">{children}</main>
        </div>
      </NavigationPendingProvider>
    </FYProvider>
  );
}

"use client";

/**
 * AppShell — persistent client-side chrome for all (app) routes.
 *
 * TopNavbar / AppHeader / progress / prefetch are client-only (dynamic ssr:false).
 * Static SSR of those modules was throwing "Element type is invalid … undefined"
 * during App Router RSC/SSR in this Next 14.2.35 setup; CSR still mounts them.
 */

import React, { useEffect } from "react";
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

const TopNavbar = dynamic(
  () => import("./TopNavbar").then((m) => m.TopNavbar),
  {
    ssr: false,
    loading: () => (
      <nav className="h-[56px] bg-white border-b border-border/70 shadow-navbar flex items-center z-[100] sticky top-0" />
    ),
  },
);

const AppHeader = dynamic(
  () => import("./AppHeader").then((m) => m.AppHeader),
  {
    ssr: false,
    loading: () => <div className="h-12 border-b border-border/60 bg-white" />,
  },
);

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  // #region agent log
  fetch("http://127.0.0.1:7502/ingest/b60215f3-a2ea-4dec-b0ac-4488ce88b732", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "8fbc9e" },
    body: JSON.stringify({
      sessionId: "8fbc9e",
      runId: "post-fix",
      hypothesisId: "H23",
      location: "AppShell.tsx",
      message: "AppShell dynamic-chrome render",
      data: {
        TopNavbar: typeof TopNavbar,
        AppHeader: typeof AppHeader,
        NavigationProgress: typeof NavigationProgress,
        NavRoutePrefetch: typeof NavRoutePrefetch,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

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
          <TopNavbar />
          <AppHeader />
          <main className="flex-1 min-h-0 w-full overflow-hidden flex flex-col bg-muted/30">
            {children}
          </main>
        </div>
      </NavigationPendingProvider>
    </FYProvider>
  );
}

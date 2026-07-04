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

import React, { Suspense } from "react";
import { FYProvider } from "@/lib/fy-store";
import { QueryProvider } from "@/lib/query/query-provider";
import { NavRoutePrefetch } from "@/components/navigation/NavRoutePrefetch";
import { NavigationProgress } from "./NavigationProgress";
import { TopNavbar } from "./TopNavbar";
import { AppHeader } from "./AppHeader";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <QueryProvider>
      <FYProvider>
        <NavRoutePrefetch />
        <NavigationProgress />
        <div className="min-h-screen bg-background flex flex-col">
          {/* 56px — sticky, z-50 — persists across all navigations */}
          <Suspense
            fallback={
              <nav className="h-[56px] bg-white border-b border-border/70 shadow-navbar flex items-center z-[100] sticky top-0" />
            }
          >
            <TopNavbar />
          </Suspense>

          {/* 48px — sticky below navbar — does not re-render on route change */}
          <AppHeader />

          {/* Page content area — only this part swaps on navigation */}
          <main className="flex-1 min-h-0 w-full bg-muted/30">{children}</main>
        </div>
      </FYProvider>
    </QueryProvider>
  );
}

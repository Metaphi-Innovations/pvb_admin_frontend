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

import React from "react";
import { FYProvider } from "@/lib/fy-store";
import { TopNavbar } from "./TopNavbar";
import { AppHeader } from "./AppHeader";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <FYProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* 56px — sticky, z-50 — persists across all navigations */}
        <TopNavbar />

        {/* 48px — sticky below navbar — persists across all navigations */}
        <AppHeader />

        {/* Page content area — only this part changes on navigation */}
        <main className="flex-1 bg-muted/30">
          {children}
        </main>
      </div>
    </FYProvider>
  );
}

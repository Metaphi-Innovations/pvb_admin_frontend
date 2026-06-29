"use client";

/**
 * AppLayout — content padding wrapper for (app) pages.
 *
 * FYProvider, TopNavbar, and AppHeader are now in app/(app)/layout.tsx via
 * AppShell and mount exactly once across all navigations. AppLayout is now
 * a thin padding wrapper that all 38 existing page.tsx files continue to use
 * without any changes required.
 */

import React from "react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function AppLayout({ children, className, noPadding = false }: AppLayoutProps) {
  return (
    <div
      className={cn(
        "w-full min-w-0",
        !noPadding && "px-5 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

// ── Page shell (max width + spacing) ─────────────────────────────────────────
export function PageShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-[1440px] mx-auto w-full space-y-5", className)}>
      {children}
    </div>
  );
}

// ── Two-column layout ─────────────────────────────────────────────────────────
export function TwoColumnLayout({
  main,
  side,
  sideWidth = "320px",
  reversedOnMobile = false,
}: {
  main: React.ReactNode;
  side: React.ReactNode;
  sideWidth?: string;
  reversedOnMobile?: boolean;
}) {
  return (
    <div className={cn("flex gap-5 items-start", reversedOnMobile && "flex-col-reverse md:flex-row")}>
      <div className="flex-1 min-w-0">{main}</div>
      <div className="flex-shrink-0 w-full md:w-auto" style={{ width: sideWidth }}>
        {side}
      </div>
    </div>
  );
}

// ── Grid layout ───────────────────────────────────────────────────────────────
export function GridLayout({
  children,
  cols = 4,
  className,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const colClass = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  }[cols];

  return (
    <div className={cn("grid gap-3", colClass, className)}>
      {children}
    </div>
  );
}

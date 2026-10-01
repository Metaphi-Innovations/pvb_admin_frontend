"use client";

import React, { memo, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HR_MAIN_PANEL_CLASS,
  HR_SIDEBAR_COLLAPSED_WIDTH_PX,
  HR_SIDEBAR_EXPANDED_WIDTH_PX,
} from "@/lib/hr/hr-layout-constants";
import { hrSectionShowsContextualSidebar, resolveHrNavLabel } from "@/lib/hr/hr-nav";
import { HrSectionSidebar, useActiveHrSectionId } from "./HrSectionSidebar";
import { useHrSidebar } from "./HrSidebarContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNavigationPendingOptional } from "@/components/navigation/NavigationPendingContext";

function HrNavigationOverlay() {
  const pending = useNavigationPendingOptional();
  if (!pending?.isNavigating) return null;
  const label =
    pending.pendingLabel ??
    (pending.pendingHref ? resolveHrNavLabel(pending.pendingHref) : "page");

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-white/75 backdrop-blur-[1px] pointer-events-none"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="w-5 h-5 text-brand-600 animate-spin" aria-hidden />
      <p className="text-xs font-medium text-muted-foreground">Loading {label}…</p>
    </div>
  );
}

/**
 * HR module shell — left contextual rail + main content (Settings, Employees, etc.).
 * Sections may opt out via `showContextualSidebar: false` on HrNavGroup; Employees keeps the rail.
 */
export const HrModuleShell = memo(function HrModuleShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const sectionId = useActiveHrSectionId();
  const { collapsed } = useHrSidebar();
  const showSidebar = hrSectionShowsContextualSidebar(sectionId);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="hr-module-shell flex h-full min-h-0 w-full overflow-hidden">
        {showSidebar && (
          <aside
            className={cn(
              "hr-module-sidebar relative flex flex-col flex-shrink-0 h-full min-h-0 overflow-hidden",
              "bg-card border-r border-border",
              collapsed && "is-collapsed",
            )}
            style={{
              width: collapsed ? HR_SIDEBAR_COLLAPSED_WIDTH_PX : HR_SIDEBAR_EXPANDED_WIDTH_PX,
              minWidth: collapsed ? HR_SIDEBAR_COLLAPSED_WIDTH_PX : HR_SIDEBAR_EXPANDED_WIDTH_PX,
            }}
          >
            <Suspense
              fallback={
                <div className="p-3 space-y-2">
                  <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-8 bg-muted/60 animate-pulse rounded-[10px]" />
                  <div className="h-8 bg-muted/60 animate-pulse rounded-[10px]" />
                </div>
              }
            >
              <HrSectionSidebar sectionId={sectionId} collapsed={collapsed} />
            </Suspense>
          </aside>
        )}

        <main
          className={cn(
            "hr-module-main relative flex flex-1 flex-col min-w-0 min-h-0 h-full overflow-hidden",
            "bg-background",
          )}
        >
          <HrNavigationOverlay />
          <div className={cn(HR_MAIN_PANEL_CLASS, "px-4 py-3 min-h-0 flex-1 flex flex-col")}>
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
});

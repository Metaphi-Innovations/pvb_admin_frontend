"use client";

import React, { memo, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCOUNTS_MAIN_PANEL_CLASS } from "@/lib/accounts/accounts-layout-constants";
import { resolveAccountsNavLabel } from "@/lib/accounts/accounts-nav";
import {
  AccountsSectionSidebar,
  useActiveAccountsSectionId,
} from "./AccountsSectionSidebar";
import { useAccountsSidebar } from "./AccountsSidebarContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useNavigationPendingOptional } from "@/components/navigation/NavigationPendingContext";
import { AccountsModuleErrorBoundary } from "./AccountsModuleErrorBoundary";

function AccountsNavigationOverlay() {
  const pending = useNavigationPendingOptional();
  if (!pending?.isNavigating) return null;

  const label =
    pending.pendingLabel ??
    (pending.pendingHref ? resolveAccountsNavLabel(pending.pendingHref) : "page");

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
 * Accounts two-panel shell. Left rail shows only the active section
 * (from route / top Accounts mega-menu) — never the full six-section mega-sidebar.
 */
export const AccountsModuleShell = memo(function AccountsModuleShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const sectionId = useActiveAccountsSectionId();
  const { collapsed } = useAccountsSidebar();

  return (
    <TooltipProvider delayDuration={200}>
      <div className="accounts-module-shell flex h-full min-h-0 w-full overflow-hidden">
        <aside
          className={cn(
            "accounts-module-sidebar relative",
            collapsed && "is-collapsed",
            sectionId === "coa" && !collapsed && "is-coa-section",
          )}
        >
          <AccountsSectionSidebar sectionId={sectionId} collapsed={collapsed} />
        </aside>

        <main className="accounts-module-main accounts-ui-dense relative flex-1 min-w-0 min-h-0 h-full overflow-hidden flex flex-col bg-slate-50/40">
          <AccountsNavigationOverlay />
          {/* overflow-y-auto comes from ACCOUNTS_MAIN_PANEL_CLASS — do not append overflow-hidden (it overrides and blocks page scroll) */}
          <div className={cn(ACCOUNTS_MAIN_PANEL_CLASS, "px-3 py-1.5 min-h-0 flex-1 flex flex-col")}>
            <AccountsModuleErrorBoundary>
              <Suspense fallback={null}>{children}</Suspense>
            </AccountsModuleErrorBoundary>
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
});

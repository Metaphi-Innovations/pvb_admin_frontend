"use client";

import React, { memo } from "react";
import { cn } from "@/lib/utils";
import { ACCOUNTS_MAIN_PANEL_CLASS } from "@/lib/accounts/accounts-layout-constants";
import {
  AccountsSectionSidebar,
  useActiveAccountsSectionId,
} from "./AccountsSectionSidebar";
import { useAccountsSidebar } from "./AccountsSidebarContext";
import { TooltipProvider } from "@/components/ui/tooltip";

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
          <AccountsSectionSidebar key={sectionId} sectionId={sectionId} collapsed={collapsed} />
        </aside>

        <main className="accounts-module-main flex-1 min-w-0 min-h-0 h-full overflow-hidden flex flex-col bg-slate-50/40">
          <div className={cn(ACCOUNTS_MAIN_PANEL_CLASS, "px-3 py-2")}>{children}</div>
        </main>
      </div>
    </TooltipProvider>
  );
});

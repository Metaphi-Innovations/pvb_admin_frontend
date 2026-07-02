"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, FolderTree, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CoaExplorerTree } from "@/app/(app)/accounts/masters/chart-of-accounts/components/CoaExplorerTree";
import { requestCoaAddLedger } from "@/app/(app)/accounts/masters/chart-of-accounts/coa-add-ledger-bridge";
import { canCoa } from "@/lib/accounts/permissions";
import { useCoaNavigation } from "./CoaNavigationContext";

/** COA hierarchy panel — collapsible header, search, expandable tree. */
export function CoaSidebarNav() {
  const pathname = usePathname();
  const {
    records,
    selectedId,
    expandedIds,
    search,
    setSearch,
    selectNode,
    toggleExpand,
    isCoaRoute,
    highlightedLedgerId,
  } = useCoaNavigation();

  const canCreate = canCoa("create");

  const [panelOpen, setPanelOpen] = useState(isCoaRoute);

  // Collapse COA when leaving COA routes; expand only on COA routes (not on Reports, etc.)
  useEffect(() => {
    setPanelOpen(isCoaRoute);
  }, [pathname, isCoaRoute]);

  return (
    <div
      className={cn(
        "mb-2 rounded-lg border border-border/60 bg-white shadow-sm overflow-hidden",
        "border-l-[3px] border-l-brand-500",
        isCoaRoute && "ring-1 ring-brand-200/60",
      )}
    >
      <button
        type="button"
        onClick={() => setPanelOpen((o) => !o)}
        aria-expanded={panelOpen}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-2 border-b border-border/50 transition-colors",
          panelOpen ? "bg-brand-50/50" : "bg-white hover:bg-brand-50/40",
        )}
      >
        <span className="w-7 h-7 rounded-md bg-brand-100 border border-brand-200/80 flex items-center justify-center flex-shrink-0">
          <FolderTree className="w-4 h-4 text-brand-600" />
        </span>
        <span className="flex-1 text-left text-xs font-semibold text-brand-800">Chart of Accounts</span>
        <ChevronDown
          className={cn(
            "w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200",
            panelOpen ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>

      {panelOpen && (
        <>
          <div className="relative px-2.5 py-2 border-b border-border/40 bg-white">
            <Search className="w-3.5 h-3.5 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              className="h-8 pl-8 text-xs bg-muted/20 border-border/60 rounded-lg"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-[min(56vh,32rem)] overflow-y-auto overscroll-contain px-1 py-2">
            <CoaExplorerTree
              variant="sidebar"
              records={records}
              selectedId={selectedId}
              expandedIds={expandedIds}
              search={search}
              canCreate={canCreate}
              highlightedLedgerId={highlightedLedgerId}
              onSelect={selectNode}
              onToggle={toggleExpand}
              onAddLedger={requestCoaAddLedger}
            />
          </div>
        </>
      )}
    </div>
  );
}

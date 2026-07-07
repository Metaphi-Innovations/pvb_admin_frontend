"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CoaExplorerTree } from "@/app/(app)/accounts/masters/chart-of-accounts/components/CoaExplorerTree";
import { requestCoaAddLedger } from "@/app/(app)/accounts/masters/chart-of-accounts/coa-add-ledger-bridge";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useCoaNavigation } from "./CoaNavigationContext";

/** COA tree + search — rendered only when the COA accordion section is expanded. */
export function CoaSidebarNavTree() {
  const {
    records,
    selectedId,
    expandedIds,
    treeSearchTerm,
    setTreeSearchTerm,
    selectNode,
    toggleExpand,
    coaReady,
    highlightedLedgerId,
  } = useCoaNavigation();

  const canCreate = useCanCoa("create");

  return (
    <>
      <div className="relative px-2.5 py-2 border-b border-border/40 bg-white">
        <Search className="w-4 h-4 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          className="h-[34px] pl-8 text-sm bg-white border-[#E5E7EB] rounded-md"
          placeholder="Search accounts..."
          value={treeSearchTerm}
          onChange={(e) => setTreeSearchTerm(e.target.value)}
        />
      </div>

      <div className="max-h-[min(36vh,18rem)] overflow-y-auto overscroll-contain px-1 py-1">
        {!coaReady ? (
          <div className="px-2 py-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-3 bg-muted/60 animate-pulse rounded"
                style={{ width: `${70 - i * 8}%` }}
              />
            ))}
          </div>
        ) : (
          <CoaExplorerTree
            variant="sidebar"
            records={records}
            selectedId={selectedId}
            expandedIds={expandedIds}
            search={treeSearchTerm}
            canCreate={canCreate}
            highlightedLedgerId={highlightedLedgerId}
            onSelect={selectNode}
            onToggle={toggleExpand}
            onAddLedger={requestCoaAddLedger}
          />
        )}
      </div>
    </>
  );
}

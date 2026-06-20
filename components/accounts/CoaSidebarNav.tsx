"use client";

import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CoaSidebarAccordion } from "@/app/(app)/accounts/masters/chart-of-accounts/components/CoaSidebarAccordion";
import { useCoaNavigation } from "./CoaNavigationContext";

/** COA hierarchy nested under Chart of Accounts — own scroll region within the sidebar */
export function CoaSidebarNav() {
  const {
    records,
    selectedId,
    expandedIds,
    search,
    setSearch,
    selectNode,
    toggleExpand,
  } = useCoaNavigation();

  return (
    <div className="mt-0.5 mb-1.5 ml-0.5 border-l border-border/50 pl-1 flex flex-col min-h-0">
      <div className="relative px-0.5 pt-1 pb-1.5 flex-shrink-0">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          className="h-7 pl-7 text-xs bg-muted/25 border-border/60"
          placeholder="Search accounts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="max-h-[min(52vh,28rem)] overflow-y-auto overscroll-contain pb-1 pr-0.5">
        <CoaSidebarAccordion
          records={records}
          selectedId={selectedId}
          expandedIds={expandedIds}
          search={search}
          onSelect={selectNode}
          onToggle={toggleExpand}
        />
      </div>
    </div>
  );
}

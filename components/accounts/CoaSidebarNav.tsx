"use client";

import React, { useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CoaExplorerTree } from "@/app/(app)/accounts/masters/chart-of-accounts/components/CoaExplorerTree";
import { requestCoaAddLedger } from "@/app/(app)/accounts/masters/chart-of-accounts/coa-add-ledger-bridge";
import { requestCoaAddSubGroup } from "@/app/(app)/accounts/masters/chart-of-accounts/coa-add-group-bridge";
import { useCoaNavigation } from "./CoaNavigationContext";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { AccountsSidebarModuleHeader } from "./AccountsSidebarModuleHeader";
import { ACCOUNTS_SIDEBAR_STICKY_HEAD_CLASS } from "@/lib/accounts/accounts-typography";
import { useAccountsSidebar } from "./AccountsSidebarContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { CoaHierarchyLegend } from "@/app/(app)/accounts/masters/chart-of-accounts/components/CoaHierarchyLegend";
import { resolveCoaSidebarIcon, coaSidebarNodeIconClass } from "@/app/(app)/accounts/masters/chart-of-accounts/components/coa-tree-visual";

/** Icon-only primary heads when sidebar is collapsed. */
function CoaCollapsedPrimaryHeads() {
  const { records, selectedId, selectNode, coaReady } = useCoaNavigation();

  const roots = useMemo(
    () =>
      records
        .filter((r) => r.nodeLevel === "primary_head")
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
    [records],
  );

  if (!coaReady || roots.length === 0) {
    return <div className="py-2 px-1.5 space-y-2">{/* skeleton handled by parent */}</div>;
  }

  return (
    <nav aria-label="Chart of Accounts" className="flex flex-col items-center gap-1 py-2 px-1.5">
      {roots.map((root) => {
        const active = selectedId === root.id;
        const Icon = resolveCoaSidebarIcon(root, "primary_head");
        const btn = (
          <button
            type="button"
            onClick={() => selectNode(root)}
            aria-label={root.accountName}
            className={cn("accounts-sidebar-coa-icon-btn", active && "is-active")}
          >
            <Icon
              className={cn(
                "w-4 h-4",
                coaSidebarNodeIconClass(root, "primary_head", active),
              )}
              strokeWidth={2.25}
            />
          </button>
        );

        return (
          <Tooltip key={root.id}>
            <TooltipTrigger asChild>{btn}</TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              {root.accountName}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );
}

/** COA search + scrollable tree — only mounted for the Chart of Accounts section. */
export function CoaSidebarNavTree({
  moduleTitle,
  collapsed = false,
}: {
  moduleTitle?: string;
  collapsed?: boolean;
}) {
  const {
    records,
    selectedId,
    expandedIds,
    treeSearchTerm,
    setTreeSearchTerm,
    selectNode,
    toggleExpand,
    expandAll,
    collapseAll,
    coaReady,
    highlightedLedgerId,
  } = useCoaNavigation();

  const canCreate = useCanCoa("create");
  const canEdit = useCanCoa("edit");

  const { setCollapsed, toggleCollapsed } = useAccountsSidebar();

  if (collapsed) {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <div className={cn(ACCOUNTS_SIDEBAR_STICKY_HEAD_CLASS, "pb-1")}>
          {moduleTitle ? (
            <AccountsSidebarModuleHeader
              title={moduleTitle}
              collapsed
              onToggleCollapse={toggleCollapsed}
            />
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                aria-label="Search accounts"
                className="accounts-sidebar-coa-icon-btn mx-auto my-2"
              >
                <Search className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="text-xs">
              Expand to search accounts
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="accounts-sidebar-tree-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {!coaReady ? (
            <div className="px-1.5 py-2 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 w-10 bg-muted/60 animate-pulse rounded-md mx-auto" />
              ))}
            </div>
          ) : (
            <CoaCollapsedPrimaryHeads />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      <div className={ACCOUNTS_SIDEBAR_STICKY_HEAD_CLASS}>
        {moduleTitle ? (
          <AccountsSidebarModuleHeader
            title={moduleTitle}
            collapsed={false}
            onToggleCollapse={toggleCollapsed}
          />
        ) : null}
        <div className="relative px-3 pb-2">
          <Search className="w-3.5 h-3.5 absolute left-[1.35rem] top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none" />
          <Input
            className="h-8 pl-8 text-xs bg-muted/20 border-border/70 rounded-md placeholder:text-muted-foreground/70"
            placeholder="Search accounts..."
            value={treeSearchTerm}
            onChange={(e) => setTreeSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 px-3 pb-2">
          <button
            type="button"
            onClick={expandAll}
            className="text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            Expand All
          </button>
          <span className="text-muted-foreground/40 text-[10px]">|</span>
          <button
            type="button"
            onClick={collapseAll}
            className="text-[11px] font-medium text-brand-600 hover:text-brand-700 hover:underline"
          >
            Collapse All
          </button>
          <CoaHierarchyLegend />
        </div>
      </div>

      <div className="accounts-sidebar-tree-scroll accounts-coa-tree flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-1 py-0.5 pb-2">
        {!coaReady ? (
          <div className="px-2 py-3 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-3 bg-muted/60 animate-pulse rounded"
                style={{ width: `${70 - i * 8}%` }}
              />
            ))}
          </div>
        ) : records.length === 0 ? (
          <p className="px-3 py-3 text-xs text-muted-foreground">Loading chart of accounts…</p>
        ) : (
          <CoaExplorerTree
            variant="sidebar"
            records={records}
            selectedId={selectedId}
            expandedIds={expandedIds}
            search={treeSearchTerm}
            canCreate={canCreate}
            canEdit={canEdit}
            highlightedLedgerId={highlightedLedgerId}
            onSelect={selectNode}
            onToggle={toggleExpand}
            onAddLedger={requestCoaAddLedger}
            onAddSubGroup={requestCoaAddSubGroup}
          />
        )}
      </div>
    </div>
  );
}

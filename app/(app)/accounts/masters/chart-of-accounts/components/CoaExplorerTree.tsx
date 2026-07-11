"use client";

import React, { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import type { ChartOfAccount } from "../../../data";
import {
  canAddLedgerUnder,
  canAddSubGroupUnder,
  canDeleteGroup,
  canEditGroup,
  countLedgersUnder,
  getSearchVisibleIds,
  nodeMatchesSearch,
} from "../chart-of-accounts-data";
import { coaTreeNodeHasChildren, getCoaTreeChildren } from "@/lib/accounts/coa-tree-children";
import { isAddLedgerBlocked } from "@/lib/accounts/coa-add-ledger-policy";
import { requestCoaAddSubGroup, requestCoaDeleteGroup, requestCoaEditGroup } from "../coa-add-group-bridge";
import { CoaNodeHoverActions } from "./CoaNodeHoverActions";
import { CoaLevelBadge } from "./CoaLevelBadge";
import {
  LEVEL_SELECTED_ROW_CLASS,
  COA_TREE_CHEVRON_WIDTH_CLASS,
  coaNodeAccessibleLabel,
  coaNodeShowsExpandChevron,
  coaSidebarIconSizeClass,
  coaSidebarIndentPx,
  coaSidebarNodeIconClass,
  coaSidebarRowClass,
  coaSidebarShowsNodeIcon,
  coaVisualRowClass,
  resolveCoaSidebarIcon,
  resolveCoaVisualLevel,
} from "./coa-tree-visual";
import { CoaTreeNodeLabel } from "./CoaTreeNodeLabel";
import { TooltipProvider } from "@/components/ui/tooltip";

interface TreeNodeProps {
  node: ChartOfAccount;
  depth: number;
  isFirstRoot?: boolean;
  records: ChartOfAccount[];
  expandedIds: Set<number>;
  selectedId: number | null;
  visibleIds: Set<number> | null;
  searchQuery: string;
  variant: "panel" | "sidebar";
  canCreate?: boolean;
  canEdit?: boolean;
  highlightedLedgerId?: number | null;
  onToggle: (id: number) => void;
  onSelect: (node: ChartOfAccount) => void;
  onLedgerOpen?: (node: ChartOfAccount) => void;
  onAddLedger?: (parentGroupId: number) => void;
  onAddSubGroup?: (parentGroupId: number) => void;
}

const TreeNode = memo(function TreeNodeComponent({
  node,
  depth,
  isFirstRoot = false,
  records,
  expandedIds,
  selectedId,
  visibleIds,
  searchQuery,
  variant,
  canCreate = false,
  canEdit = false,
  highlightedLedgerId = null,
  onToggle,
  onSelect,
  onLedgerOpen,
  onAddLedger,
  onAddSubGroup,
}: TreeNodeProps) {
  const isSidebar = variant === "sidebar";
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const visualLevel = resolveCoaVisualLevel(node, records);
  const Icon = resolveCoaSidebarIcon(node, visualLevel, records);
  const isLedger = node.nodeLevel === "ledger";
  const isPrimaryHead = node.nodeLevel === "primary_head";
  const isSystemLocked = node.isSystem && node.nodeLevel !== "ledger";
  const hasChildren = coaTreeNodeHasChildren(records, node.id);
  const children = useMemo(
    () => (isExpanded && hasChildren ? getCoaTreeChildren(records, node.id) : []),
    [isExpanded, hasChildren, records, node.id],
  );
  const ledgerCount = !isSidebar && !isLedger ? countLedgersUnder(records, node.id) : 0;
  const showExpandChevron = coaNodeShowsExpandChevron(node, records, hasChildren);
  const allowAddSubGroup =
    canCreate && onAddSubGroup != null && canAddSubGroupUnder(node, records);
  const allowAddLedger =
    canCreate &&
    onAddLedger != null &&
    canAddLedgerUnder(node, records) &&
    !isAddLedgerBlocked(node, records);
  const allowEdit = canEdit && canEditGroup(node);
  const allowDelete = canEdit && canDeleteGroup(node, records);
  const isHighlighted = highlightedLedgerId === node.id;
  const isSearchMatch =
    Boolean(searchQuery.trim()) && nodeMatchesSearch(records, node, searchQuery);
  const sidebarShowsIcon = isSidebar && coaSidebarShowsNodeIcon(visualLevel);
  const showRowIcon = isSidebar ? sidebarShowsIcon : true;

  if (visibleIds && !visibleIds.has(node.id)) return null;

  const handleClick = () => {
    onSelect(node);
    if (isLedger && onLedgerOpen) onLedgerOpen(node);
  };

  return (
    <div>
      <div
        data-coa-tree-row
        className={cn(
          "group flex w-full min-w-0 items-stretch transition-colors duration-100",
          isSidebar ? "mx-0 rounded-sm" : "rounded-md mx-1",
          isSidebar &&
            isPrimaryHead &&
            depth === 0 &&
            !isFirstRoot &&
            "border-t border-border/50 mt-1.5 pt-0.5",
          isSelected
            ? cn(isSidebar ? "bg-brand-50" : "bg-brand-50/90 ring-1 ring-brand-200/90")
            : cn(isSidebar ? "hover:bg-muted/40" : "hover:bg-muted/30"),
          isHighlighted && !isSidebar && "bg-brand-50/80 ring-1 ring-brand-300/70",
          isSearchMatch && !isSelected && "bg-brand-50/50",
        )}
        style={{ minHeight: isSidebar ? 30 : 32 }}
      >
        <div
          className="shrink-0"
          style={{ width: coaSidebarIndentPx(depth) }}
          aria-hidden
        />
        <div
          className={cn(
            "flex flex-1 min-w-0 items-center gap-0.5",
            isSidebar ? "pr-0.5" : "pr-2",
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (showExpandChevron) onToggle(node.id);
            }}
            className={cn(
              "flex items-center justify-center rounded transition-colors h-5",
              COA_TREE_CHEVRON_WIDTH_CLASS,
              showExpandChevron
                ? "text-muted-foreground/70 hover:text-foreground"
                : "opacity-0 pointer-events-none",
            )}
            tabIndex={showExpandChevron ? 0 : -1}
            aria-label={showExpandChevron ? (isExpanded ? "Collapse" : "Expand") : undefined}
          >
            {showExpandChevron &&
              (isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" strokeWidth={2} />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
              ))}
          </button>

          <button
            type="button"
            onClick={handleClick}
            aria-label={coaNodeAccessibleLabel(node, records)}
            className={cn(
              "flex flex-1 min-w-0 text-left items-center gap-1",
              isSidebar ? "py-1 pr-1" : "py-1.5 pr-1",
            )}
          >
            {showRowIcon && (
              <Icon
                className={cn(
                  "shrink-0",
                  coaSidebarIconSizeClass(node, records),
                  coaSidebarNodeIconClass(node, visualLevel, isSelected, records),
                )}
                strokeWidth={visualLevel === "primary_head" ? 2 : 1.75}
              />
            )}
            {isSidebar ? (
              <CoaTreeNodeLabel
                name={node.accountName}
                className={cn(
                  isSelected
                    ? "font-semibold text-brand-800"
                    : coaSidebarRowClass(visualLevel),
                )}
              />
            ) : (
              <span
                className={cn(
                  "flex-1 min-w-0 whitespace-normal break-words leading-snug",
                  isSelected
                    ? cn(LEVEL_SELECTED_ROW_CLASS[node.nodeLevel])
                    : coaVisualRowClass(visualLevel),
                )}
              >
                {node.accountName}
                {isSystemLocked && (
                  <Lock className="inline w-3 h-3 ml-1 text-amber-600 opacity-80" aria-label="System locked" />
                )}
                {!isLedger && ledgerCount > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums whitespace-nowrap">
                    ({ledgerCount})
                  </span>
                )}
              </span>
            )}
            {!isSidebar && (
              <CoaLevelBadge level={visualLevel} size="sm" className="flex-shrink-0" />
            )}
          </button>

          <CoaNodeHoverActions
            compact={isSidebar}
            showAddSubGroup={allowAddSubGroup}
            showAddLedger={allowAddLedger}
            showEdit={allowEdit}
            showDelete={allowDelete}
            onAddSubGroup={() => (onAddSubGroup ?? requestCoaAddSubGroup)(node.id)}
            onAddLedger={() => onAddLedger!(node.id)}
            onEdit={() => requestCoaEditGroup(node.id)}
            onDelete={() => requestCoaDeleteGroup(node.id)}
            className={isSidebar ? "mr-0.5 shrink-0" : "mr-0.5 shrink-0"}
          />
        </div>
      </div>

      {hasChildren && isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              records={records}
              expandedIds={expandedIds}
              selectedId={selectedId}
              visibleIds={visibleIds}
              searchQuery={searchQuery}
              variant={variant}
              canCreate={canCreate}
              canEdit={canEdit}
              highlightedLedgerId={highlightedLedgerId}
              onToggle={onToggle}
              onSelect={onSelect}
              onLedgerOpen={onLedgerOpen}
              onAddLedger={onAddLedger}
              onAddSubGroup={onAddSubGroup}
            />
          ))}
        </div>
      )}
    </div>
  );
});

interface CoaExplorerTreeProps {
  variant?: "panel" | "sidebar";
  records: ChartOfAccount[];
  selectedId: number | null;
  expandedIds: Set<number>;
  search: string;
  canCreate?: boolean;
  canEdit?: boolean;
  highlightedLedgerId?: number | null;
  onSelect: (node: ChartOfAccount) => void;
  onToggle: (id: number) => void;
  onLedgerOpen?: (node: ChartOfAccount) => void;
  onAddLedger?: (parentGroupId: number) => void;
  onAddSubGroup?: (parentGroupId: number) => void;
}

export function CoaExplorerTree({
  variant = "panel",
  records,
  selectedId,
  expandedIds,
  search,
  canCreate = false,
  canEdit = false,
  highlightedLedgerId = null,
  onSelect,
  onToggle,
  onLedgerOpen,
  onAddLedger,
  onAddSubGroup,
}: CoaExplorerTreeProps) {
  const roots = useMemo(
    () =>
      records
        .filter((r) => r.nodeLevel === "primary_head")
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
    [records],
  );

  const visibleIds = useMemo(
    () => (search.trim() ? getSearchVisibleIds(records, search) : null),
    [records, search],
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex flex-col min-h-0",
          variant === "sidebar" ? "bg-transparent" : "h-full bg-white",
        )}
      >
        <div
          className={cn(
            "flex-1 min-h-0",
            variant === "sidebar" ? "py-1 px-0.5 accounts-coa-tree" : "py-2 px-1",
            variant === "panel" && "min-w-[260px]",
          )}
        >
          {roots.length === 0 ? (
            <p className="px-4 text-sm text-muted-foreground">Loading chart…</p>
          ) : (
            roots.map((root, idx) => (
              <TreeNode
                key={root.id}
                node={root}
                depth={0}
                isFirstRoot={idx === 0}
                records={records}
                expandedIds={expandedIds}
                selectedId={selectedId}
                visibleIds={visibleIds}
                searchQuery={search}
                variant={variant}
                canCreate={canCreate}
                canEdit={canEdit}
                highlightedLedgerId={highlightedLedgerId}
                onToggle={onToggle}
                onSelect={onSelect}
                onLedgerOpen={onLedgerOpen}
                onAddLedger={onAddLedger}
                onAddSubGroup={onAddSubGroup}
              />
            ))
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

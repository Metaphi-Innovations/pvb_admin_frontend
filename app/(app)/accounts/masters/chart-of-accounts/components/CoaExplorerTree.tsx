"use client";

import React, { memo, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import type { ChartOfAccount } from "../../../data";
import {
  canAddLedgerUnder,
  countLedgersUnder,
  getSearchVisibleIds,
  nodeMatchesSearch,
} from "../chart-of-accounts-data";
import { coaTreeNodeHasChildren, getCoaTreeChildren } from "@/lib/accounts/coa-tree-children";
import { CoaAddLedgerHoverAction } from "./CoaAddLedgerHoverAction";
import { isAddLedgerBlocked } from "@/lib/accounts/coa-add-ledger-policy";
import { CoaLevelBadge } from "./CoaLevelBadge";
import {
  COA_TREE_ICON_SIZE_CLASS,
  COA_SIDEBAR_ROW_CLASS,
  GUIDE_WIDTH_PX,
  LEVEL_SELECTED_ROW_CLASS,
  VISUAL_ICON,
  VISUAL_ROW_CLASS,
  coaNodeShowsExpandChevron,
  coaSidebarIconSizeClass,
  coaSidebarIndentPx,
  coaSidebarNodeIconClass,
  coaSidebarShowsNodeIcon,
  coaTreeIconClass,
  resolveCoaSidebarIcon,
  resolveCoaVisualLevel,
} from "./coa-tree-visual";

/** Vertical guides + branch elbow for tree connectors */
function TreeGuides({
  depth,
  ancestorHasNext,
  isLastSibling,
}: {
  depth: number;
  ancestorHasNext: boolean[];
  isLastSibling: boolean;
}) {
  if (depth === 0) return null;

  return (
    <div className="flex flex-shrink-0 self-stretch" aria-hidden>
      {ancestorHasNext.map((hasNext, i) => (
        <div
          key={i}
          className="relative flex-shrink-0"
          style={{ width: GUIDE_WIDTH_PX }}
        >
          {hasNext && (
            <div className="absolute left-[7px] top-0 bottom-0 w-px bg-border/80" />
          )}
        </div>
      ))}
      <div className="relative flex-shrink-0" style={{ width: GUIDE_WIDTH_PX }}>
        <div className="absolute left-[7px] top-0 h-1/2 w-px bg-border/80" />
        <div className="absolute left-[7px] top-1/2 w-[9px] h-px bg-border/80" />
        {!isLastSibling && (
          <div className="absolute left-[7px] top-1/2 bottom-0 w-px bg-border/80" />
        )}
      </div>
    </div>
  );
}

interface TreeNodeProps {
  node: ChartOfAccount;
  depth: number;
  isLastSibling: boolean;
  isFirstRoot?: boolean;
  ancestorHasNext: boolean[];
  records: ChartOfAccount[];
  expandedIds: Set<number>;
  selectedId: number | null;
  visibleIds: Set<number> | null;
  searchQuery: string;
  variant: "panel" | "sidebar";
  canCreate?: boolean;
  highlightedLedgerId?: number | null;
  onToggle: (id: number) => void;
  onSelect: (node: ChartOfAccount) => void;
  onLedgerOpen?: (node: ChartOfAccount) => void;
  onAddLedger?: (parentGroupId: number) => void;
}

const TreeNode = memo(function TreeNode({
  node,
  depth,
  isLastSibling,
  isFirstRoot = false,
  ancestorHasNext,
  records,
  expandedIds,
  selectedId,
  visibleIds,
  searchQuery,
  variant,
  canCreate = false,
  highlightedLedgerId = null,
  onToggle,
  onSelect,
  onLedgerOpen,
  onAddLedger,
}: TreeNodeProps) {
  const isSidebar = variant === "sidebar";
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const visualLevel = resolveCoaVisualLevel(node, records);
  const Icon = isSidebar ? resolveCoaSidebarIcon(node, visualLevel) : VISUAL_ICON[visualLevel];
  const isLedger = node.nodeLevel === "ledger";
  const isSystemLocked = node.isSystem && node.nodeLevel !== "ledger";
  const isPrimaryHead = node.nodeLevel === "primary_head";
  const hasChildren = coaTreeNodeHasChildren(records, node.id);
  /** Children allocated only when expanded (lazy DOM). */
  const children = useMemo(
    () => (isExpanded && hasChildren ? getCoaTreeChildren(records, node.id) : []),
    [isExpanded, hasChildren, records, node.id],
  );
  /** Ledger counts are panel-only — skip expensive walk in sidebar. */
  const ledgerCount = !isSidebar && !isLedger ? countLedgersUnder(records, node.id) : 0;
  const showExpandChevron = coaNodeShowsExpandChevron(node, records, hasChildren);
  const allowAdd =
    canCreate &&
    onAddLedger != null &&
    canAddLedgerUnder(node, records) &&
    !isAddLedgerBlocked(node, records);
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
        className={cn(
          "group flex items-stretch transition-colors duration-100",
          isSidebar ? "mx-0 rounded-sm" : "rounded-md pr-2 mx-1",
          isSidebar &&
            isPrimaryHead &&
            depth === 0 &&
            !isFirstRoot &&
            "border-t border-border/50 mt-1.5 pt-0.5",
          isSelected
            ? cn(
                isSidebar
                  ? "bg-brand-50"
                  : "bg-brand-50/90 ring-1 ring-brand-200/90",
                !isSidebar && isPrimaryHead && "border-l-2 border-orange-500",
                !isSidebar && !isPrimaryHead && isLedger && "border-l-2 border-emerald-500",
                !isSidebar && !isPrimaryHead && !isLedger && "border-l-2 border-brand-600",
              )
            : cn(
                isSidebar ? "hover:bg-muted/40" : "hover:bg-slate-50/90 border-l-2 border-transparent",
                !isSidebar && isPrimaryHead && "hover:border-l-orange-300",
              ),
          isHighlighted && !isSidebar && "bg-brand-50/80 ring-1 ring-brand-300/70",
          isSearchMatch && !isSelected && "bg-brand-50/50",
        )}
        style={{
          minHeight: isSidebar ? 30 : undefined,
          paddingLeft: isSidebar ? coaSidebarIndentPx(depth) : undefined,
        }}
      >
        {!isSidebar && (
          <TreeGuides
            depth={depth}
            ancestorHasNext={ancestorHasNext}
            isLastSibling={isLastSibling}
          />
        )}

        <div
          className={cn(
            "flex gap-0.5 flex-1 min-w-0",
            isSidebar ? "items-center pl-0" : "items-start pl-1",
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (showExpandChevron) onToggle(node.id);
            }}
            className={cn(
              "flex items-center justify-center flex-shrink-0 rounded transition-colors",
              isSidebar ? "w-5 h-5 -ml-0.5" : "w-6 h-6",
              showExpandChevron
                ? "text-muted-foreground/70 hover:text-foreground"
                : isSidebar
                  ? "w-5 opacity-0 pointer-events-none"
                  : "w-4 opacity-0 pointer-events-none",
            )}
            tabIndex={showExpandChevron ? 0 : -1}
            aria-label={showExpandChevron ? (isExpanded ? "Collapse" : "Expand") : undefined}
          >
            {showExpandChevron &&
              (isExpanded ? (
                <ChevronDown className={cn(isSidebar ? "w-3.5 h-3.5" : "w-4 h-4")} strokeWidth={2} />
              ) : (
                <ChevronRight className={cn(isSidebar ? "w-3.5 h-3.5" : "w-4 h-4")} strokeWidth={2} />
              ))}
          </button>

          <button
            type="button"
            onClick={handleClick}
            title={isSidebar ? node.accountName : undefined}
            className={cn(
              "flex flex-1 min-w-0 text-left items-center",
              isSidebar ? "gap-1 py-1 pr-2" : "items-start gap-2 py-1.5 pr-2",
            )}
          >
            {showRowIcon && (
              <Icon
                className={cn(
                  "flex-shrink-0",
                  isSidebar ? coaSidebarIconSizeClass(visualLevel) : COA_TREE_ICON_SIZE_CLASS,
                  !isSidebar && "mt-0.5",
                  isSidebar
                    ? coaSidebarNodeIconClass(node, visualLevel, isSelected, records)
                    : coaTreeIconClass(visualLevel, isSelected),
                )}
                strokeWidth={isSidebar && visualLevel === "primary_head" ? 2.25 : 2}
              />
            )}
            <span
              className={cn(
                "flex-1 min-w-0",
                isSidebar ? "truncate leading-tight" : "whitespace-normal break-words leading-snug",
                isSelected
                  ? isSidebar
                    ? "font-semibold text-brand-800"
                    : cn(LEVEL_SELECTED_ROW_CLASS[node.nodeLevel], visualLevel === "sub_group" && "text-xs")
                  : isSidebar
                    ? COA_SIDEBAR_ROW_CLASS[visualLevel]
                    : VISUAL_ROW_CLASS[visualLevel],
              )}
            >
              {node.accountName}
              {isSystemLocked && !isSidebar && (
                <Lock className="inline w-3 h-3 ml-1 text-amber-600 opacity-80" aria-label="System locked" />
              )}
              {!isLedger && ledgerCount > 0 && !isSidebar && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums whitespace-nowrap">
                  ({ledgerCount})
                </span>
              )}
            </span>
            {!isSidebar && (
              <CoaLevelBadge level={visualLevel} size="sm" className="flex-shrink-0 mt-0.5" />
            )}
          </button>

          {allowAdd && !isSidebar && (
            <CoaAddLedgerHoverAction
              onClick={() => onAddLedger!(node.id)}
              className="mt-1.5 mr-1"
            />
          )}
        </div>
      </div>

      {hasChildren && isExpanded && children.length > 0 && (
        <div>
          {children.map((child, idx) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isLastSibling={idx === children.length - 1}
              ancestorHasNext={[...ancestorHasNext, !isLastSibling]}
              records={records}
              expandedIds={expandedIds}
              selectedId={selectedId}
              visibleIds={visibleIds}
              searchQuery={searchQuery}
              variant={variant}
              canCreate={canCreate}
              highlightedLedgerId={highlightedLedgerId}
              onToggle={onToggle}
              onSelect={onSelect}
              onLedgerOpen={onLedgerOpen}
              onAddLedger={onAddLedger}
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
  highlightedLedgerId?: number | null;
  onSelect: (node: ChartOfAccount) => void;
  onToggle: (id: number) => void;
  onLedgerOpen?: (node: ChartOfAccount) => void;
  onAddLedger?: (parentGroupId: number) => void;
}

export function CoaExplorerTree({
  variant = "panel",
  records,
  selectedId,
  expandedIds,
  search,
  canCreate = false,
  highlightedLedgerId = null,
  onSelect,
  onToggle,
  onLedgerOpen,
  onAddLedger,
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
              isLastSibling={idx === roots.length - 1}
              ancestorHasNext={[]}
              records={records}
              expandedIds={expandedIds}
              selectedId={selectedId}
              visibleIds={visibleIds}
              searchQuery={search}
              variant={variant}
              canCreate={canCreate}
              highlightedLedgerId={highlightedLedgerId}
              onToggle={onToggle}
              onSelect={onSelect}
              onLedgerOpen={onLedgerOpen}
              onAddLedger={onAddLedger}
            />
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Lock } from "lucide-react";
import type { ChartOfAccount } from "../../../data";
import {
  canAddLedgerUnder,
  countLedgersUnder,
  getDirectChildren,
  getSearchVisibleIds,
  nodeMatchesSearch,
} from "../chart-of-accounts-data";
import { CoaAddLedgerHoverAction } from "./CoaAddLedgerHoverAction";
import { CoaLevelBadge } from "./CoaLevelBadge";
import {
  COA_TREE_ICON_SIZE_CLASS,
  GUIDE_WIDTH_PX,
  LEVEL_SELECTED_ROW_CLASS,
  VISUAL_ICON,
  VISUAL_ROW_CLASS,
  coaNodeShowsExpandChevron,
  coaSidebarIndentPx,
  coaTreeIconClass,
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

function TreeNode({
  node,
  depth,
  isLastSibling,
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
  const children = getDirectChildren(records, node.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const visualLevel = resolveCoaVisualLevel(node, records);
  const Icon = VISUAL_ICON[visualLevel];
  const isLedger = node.nodeLevel === "ledger";
  const isSystemLocked = node.isSystem && node.nodeLevel !== "ledger";
  const ledgerCount = !isLedger ? countLedgersUnder(records, node.id) : 0;
  const isPrimaryHead = node.nodeLevel === "primary_head";
  const showExpandChevron = coaNodeShowsExpandChevron(node, records, hasChildren);
  const allowAdd = canCreate && onAddLedger != null && canAddLedgerUnder(node, records);
  const isHighlighted = highlightedLedgerId === node.id;
  const isSearchMatch =
    Boolean(searchQuery.trim()) && nodeMatchesSearch(records, node, searchQuery);

  if (visibleIds && !visibleIds.has(node.id)) return null;

  const handleClick = () => {
    onSelect(node);
    if (isLedger && onLedgerOpen) onLedgerOpen(node);
  };

  return (
    <div>
      <div
        className={cn(
          "group flex items-stretch rounded-md transition-all duration-150",
          isSidebar ? "mx-0.5" : "pr-2 mx-1",
          isSelected
            ? cn(
                isSidebar
                  ? "bg-brand-50/90 border-l-2 border-brand-500"
                  : "bg-brand-50/90 ring-1 ring-brand-200/90",
                !isSidebar && isPrimaryHead && "border-l-2 border-orange-500",
                !isSidebar && !isPrimaryHead && isLedger && "border-l-2 border-emerald-500",
                !isSidebar && !isPrimaryHead && !isLedger && "border-l-2 border-brand-600",
              )
            : cn(
                "border-l-2 border-transparent",
                isSidebar ? "hover:bg-muted/30" : "hover:bg-slate-50/90",
                !isSidebar && isPrimaryHead && "hover:border-l-orange-300",
              ),
          isHighlighted && "bg-brand-50/80 ring-1 ring-brand-300/70",
          isSearchMatch && !isSelected && "bg-brand-50/60",
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
              isSidebar ? "w-4 h-4" : "w-6 h-6",
              showExpandChevron
                ? "text-muted-foreground hover:text-brand-700"
                : "w-4 opacity-0 pointer-events-none",
            )}
            tabIndex={showExpandChevron ? 0 : -1}
            aria-label={showExpandChevron ? (isExpanded ? "Collapse" : "Expand") : undefined}
          >
            {showExpandChevron &&
              (isExpanded ? (
                <ChevronDown className="w-4 h-4" strokeWidth={1.75} />
              ) : (
                <ChevronRight className="w-4 h-4" strokeWidth={1.75} />
              ))}
          </button>

          <button
            type="button"
            onClick={handleClick}
            className={cn(
              "flex flex-1 min-w-0 text-left items-center",
              isSidebar ? "gap-1.5 py-1 pr-1" : "items-start gap-2 py-1.5 pr-2",
            )}
          >
            <Icon
              className={cn(
                "flex-shrink-0",
                COA_TREE_ICON_SIZE_CLASS,
                !isSidebar && "mt-0.5",
                coaTreeIconClass(visualLevel, isSelected),
              )}
              strokeWidth={1.75}
            />
            <span
              className={cn(
                "flex-1 min-w-0 whitespace-normal break-words",
                isSidebar ? "text-xs leading-[1.35]" : "leading-snug",
                isSelected
                  ? cn(LEVEL_SELECTED_ROW_CLASS[node.nodeLevel], visualLevel === "sub_group" && "text-xs")
                  : VISUAL_ROW_CLASS[visualLevel],
                isSidebar && isSelected && "font-semibold text-brand-800",
                isSidebar && !isSelected && isPrimaryHead && "font-semibold text-foreground",
              )}
            >
              {node.accountName}
              {isSystemLocked && (
                <Lock className="inline w-3 h-3 ml-1 text-amber-600 opacity-80" aria-label="System locked" />
              )}
              {!isLedger && ledgerCount > 0 && !isSidebar && (
                <span className="ml-1.5 text-[10px] font-normal text-muted-foreground tabular-nums whitespace-nowrap">
                  ({ledgerCount})
                </span>
              )}
            </span>
            {!isSidebar && (
              <CoaLevelBadge level={visualLevel} size="sm" className="flex-shrink-0 mt-0.5" />
            )}
          </button>

          {allowAdd && (
            <CoaAddLedgerHoverAction
              onClick={() => onAddLedger!(node.id)}
              className={cn("mr-1", isSidebar ? "self-center" : "mt-1.5")}
            />
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
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
}

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
          variant === "sidebar" ? "py-0.5" : "py-2 px-1",
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

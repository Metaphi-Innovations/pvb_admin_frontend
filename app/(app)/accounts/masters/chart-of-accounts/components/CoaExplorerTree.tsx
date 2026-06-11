"use client";

import React, { useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { ChartOfAccount } from "../../../data";
import {
  countLedgersUnder,
  getDirectChildren,
  getSearchVisibleIds,
} from "../chart-of-accounts-data";
import { CoaLevelBadge } from "./CoaLevelBadge";
import {
  GUIDE_WIDTH_PX,
  LEVEL_ROW_CLASS,
  LEVEL_SELECTED_ROW_CLASS,
  VISUAL_ICON,
  VISUAL_ICON_CLASS,
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
  variant: "panel" | "sidebar";
  onToggle: (id: number) => void;
  onSelect: (node: ChartOfAccount) => void;
  onLedgerOpen?: (node: ChartOfAccount) => void;
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
  variant,
  onToggle,
  onSelect,
  onLedgerOpen,
}: TreeNodeProps) {
  const isSidebar = variant === "sidebar";
  const children = getDirectChildren(records, node.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const visualLevel = resolveCoaVisualLevel(node, records);
  const Icon = VISUAL_ICON[visualLevel];
  const isLedger = node.nodeLevel === "ledger";
  const ledgerCount = !isLedger ? countLedgersUnder(records, node.id) : 0;
  const isPrimaryHead = node.nodeLevel === "primary_head";

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
          isSidebar ? "pr-0.5 mx-0" : "pr-2 mx-1",
          isSelected
            ? cn(
                isSidebar ? "bg-brand-50/80" : "bg-brand-50/90 ring-1 ring-brand-200/90",
                isPrimaryHead && "border-l-2 border-orange-500",
                !isPrimaryHead && isLedger && "border-l-2 border-emerald-500",
                !isPrimaryHead && !isLedger && "border-l-2 border-brand-600",
              )
            : cn(
                "border-l-2 border-transparent hover:bg-slate-50/90",
                isPrimaryHead && "hover:border-l-orange-300",
              ),
        )}
        style={{
          minHeight: isSidebar ? (isPrimaryHead ? 30 : 28) : undefined,
        }}
      >
        <TreeGuides
          depth={depth}
          ancestorHasNext={ancestorHasNext}
          isLastSibling={isLastSibling}
        />

        <div
          className={cn(
            "flex gap-0.5 flex-1 min-w-0 pl-1",
            isSidebar ? "items-center" : "items-start",
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) onToggle(node.id);
            }}
            className={cn(
              "flex items-center justify-center flex-shrink-0 rounded transition-colors",
              isSidebar ? "w-5 h-5" : "w-6 h-6",
              hasChildren
                ? "text-slate-500 hover:bg-white hover:text-brand-700"
                : "opacity-0 pointer-events-none",
            )}
            tabIndex={hasChildren ? 0 : -1}
            aria-label={hasChildren ? (isExpanded ? "Collapse" : "Expand") : undefined}
          >
            {hasChildren &&
              (isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              ))}
          </button>

          <button
            type="button"
            onClick={handleClick}
            className={cn(
              "flex flex-1 min-w-0 text-left",
              isSidebar
                ? "items-start gap-1.5 py-1 pr-1"
                : "items-start gap-2 py-1.5 pr-2",
            )}
          >
            <Icon
              className={cn(
                "flex-shrink-0",
                !isSidebar && "mt-0.5",
                isSidebar
                  ? isPrimaryHead
                    ? "w-3.5 h-3.5"
                    : "w-3 h-3"
                  : isPrimaryHead
                    ? "w-[18px] h-[18px]"
                    : "w-4 h-4",
                VISUAL_ICON_CLASS[visualLevel],
                isPrimaryHead && !isSelected && "text-orange-600",
              )}
            />
            <span
              className={cn(
                "flex-1 min-w-0 whitespace-normal break-words leading-snug",
                isSidebar && "text-[11px]",
                isSelected
                  ? LEVEL_SELECTED_ROW_CLASS[node.nodeLevel]
                  : LEVEL_ROW_CLASS[node.nodeLevel],
                isSidebar && isSelected && "font-semibold",
              )}
            >
              {node.accountName}
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
              variant={variant}
              onToggle={onToggle}
              onSelect={onSelect}
              onLedgerOpen={onLedgerOpen}
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
  onSelect: (node: ChartOfAccount) => void;
  onToggle: (id: number) => void;
  onLedgerOpen?: (node: ChartOfAccount) => void;
}

export function CoaExplorerTree({
  variant = "panel",
  records,
  selectedId,
  expandedIds,
  search,
  onSelect,
  onToggle,
  onLedgerOpen,
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
              variant={variant}
              onToggle={onToggle}
              onSelect={onSelect}
              onLedgerOpen={onLedgerOpen}
            />
          ))
        )}
      </div>
    </div>
  );
}

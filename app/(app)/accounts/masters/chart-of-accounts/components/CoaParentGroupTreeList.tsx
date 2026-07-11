"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChartOfAccount } from "../../../data";
import {
  getAncestorPath,
  getParentGroupSearchVisibleIds,
  getParentGroupTreeChildren,
  parentGroupNodeHasChildren,
} from "../chart-of-accounts-data";
import {
  COA_TREE_CHEVRON_WIDTH_CLASS,
  coaNodeShowsExpandChevron,
  coaSidebarIconSizeClass,
  coaSidebarIndentPx,
  coaSidebarNodeIconClass,
  coaSidebarRowClass,
  resolveCoaSidebarIcon,
  resolveCoaVisualLevel,
} from "./coa-tree-visual";
import { CoaTreeNodeLabel } from "./CoaTreeNodeLabel";
import { TooltipProvider } from "@/components/ui/tooltip";

interface ParentGroupTreeNodeProps {
  node: ChartOfAccount;
  depth: number;
  isFirstRoot?: boolean;
  isLastSibling: boolean;
  records: ChartOfAccount[];
  expandedIds: Set<number>;
  selectedId: number | null;
  selectableIds: Set<number>;
  visibleIds: Set<number> | null;
  onToggle: (id: number) => void;
  onSelect: (id: number) => void;
}

const ParentGroupTreeNode = memo(function ParentGroupTreeNodeComponent({
  node,
  depth,
  isFirstRoot = false,
  isLastSibling: _isLastSibling,
  records,
  expandedIds,
  selectedId,
  selectableIds,
  visibleIds,
  onToggle,
  onSelect,
}: ParentGroupTreeNodeProps) {
  const isExpanded = expandedIds.has(node.id);
  const isLedger = node.nodeLevel === "ledger";
  const isSelectable = !isLedger && selectableIds.has(node.id);
  const isSelected = isSelectable && selectedId === node.id;
  const visualLevel = resolveCoaVisualLevel(node, records);
  const Icon = resolveCoaSidebarIcon(node, visualLevel, records);
  const isPrimaryHead = node.nodeLevel === "primary_head";
  const hasChildren = parentGroupNodeHasChildren(records, node.id);
  const showExpandChevron = coaNodeShowsExpandChevron(node, records, hasChildren);

  const children = useMemo(
    () =>
      isExpanded && hasChildren
        ? getParentGroupTreeChildren(records, node.id).sort((a, b) => {
            if (a.nodeLevel !== b.nodeLevel) {
              return a.nodeLevel === "ledger" ? 1 : -1;
            }
            return a.accountName.localeCompare(b.accountName);
          })
        : [],
    [isExpanded, hasChildren, records, node.id],
  );

  if (visibleIds && !visibleIds.has(node.id)) return null;

  const handleRowClick = () => {
    if (isLedger) return;
    if (isSelectable) {
      onSelect(node.id);
      return;
    }
    if (showExpandChevron) onToggle(node.id);
  };

  return (
    <div>
      <div
        data-coa-tree-row
        className={cn(
          "group flex w-full min-w-0 items-stretch transition-colors duration-100 mx-0 rounded-sm",
          isPrimaryHead && depth === 0 && !isFirstRoot && "border-t border-border/50 mt-1.5 pt-0.5",
          isSelected ? "bg-brand-50" : isLedger ? "hover:bg-muted/20" : "hover:bg-muted/40",
        )}
        style={{ minHeight: 30 }}
      >
        <div
          className="shrink-0"
          style={{ width: coaSidebarIndentPx(depth) }}
          aria-hidden
        />
        <div className="flex flex-1 min-w-0 items-center gap-0.5 pr-0.5">
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
            role={isSelectable ? "option" : undefined}
            aria-selected={isSelectable ? isSelected : undefined}
            data-parent-option-selected={isSelected ? "true" : undefined}
            onClick={handleRowClick}
            className={cn(
              "flex flex-1 min-w-0 text-left items-center gap-1 py-1 pr-1",
              isLedger
                ? "cursor-default"
                : isSelectable
                  ? "cursor-pointer"
                  : showExpandChevron
                    ? "cursor-pointer"
                    : "cursor-default",
            )}
          >
            <Icon
              className={cn(
                "shrink-0",
                coaSidebarIconSizeClass(node, records),
                coaSidebarNodeIconClass(node, visualLevel, isSelected, records),
              )}
              strokeWidth={visualLevel === "primary_head" ? 2.25 : 2}
            />
            <CoaTreeNodeLabel
              name={node.accountName}
              className={cn(
                isSelected
                  ? "font-semibold text-brand-800"
                  : coaSidebarRowClass(visualLevel),
                !isSelectable && !isLedger && "text-foreground/80",
                isLedger && "text-foreground/75",
              )}
            />
            {isSelected && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
          </button>
        </div>
      </div>

      {hasChildren && isExpanded && children.length > 0 && (
        <div>
          {children.map((child, idx) => (
            <ParentGroupTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isLastSibling={idx === children.length - 1}
              records={records}
              expandedIds={expandedIds}
              selectedId={selectedId}
              selectableIds={selectableIds}
              visibleIds={visibleIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
});

export interface CoaParentGroupTreeListProps {
  records: ChartOfAccount[];
  selectedId: number | null;
  selectableIds: Set<number>;
  search: string;
  emptyMessage?: string;
  onSelect: (id: number) => void;
}

export function CoaParentGroupTreeList({
  records,
  selectedId,
  selectableIds,
  search,
  emptyMessage = "No ledger groups found.",
  onSelect,
}: CoaParentGroupTreeListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(
    () => new Set(records.filter((r) => r.nodeLevel === "primary_head").map((r) => r.id)),
  );

  const roots = useMemo(
    () =>
      records
        .filter((r) => r.nodeLevel === "primary_head")
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
    [records],
  );

  const visibleIds = useMemo(
    () => (search.trim() ? getParentGroupSearchVisibleIds(records, search) : null),
    [records, search],
  );

  const toggle = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!search.trim()) return;
    const visible = getParentGroupSearchVisibleIds(records, search);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      visible.forEach((id) => {
        if (!next.has(id)) {
          next.add(id);
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [search, records]);

  useEffect(() => {
    if (selectedId == null) return;
    const path = getAncestorPath(records, selectedId);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      for (const ancestor of path) {
        if (!next.has(ancestor.id)) {
          next.add(ancestor.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedId, records]);

  const hasVisibleRoots = useMemo(() => {
    if (!visibleIds) return roots.length > 0;
    return roots.some((r) => visibleIds.has(r.id));
  }, [roots, visibleIds]);

  if (!hasVisibleRoots) {
    return (
      <p className="px-3 py-6 text-xs text-center text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="py-1 px-0.5 accounts-coa-tree" role="listbox">
        {roots.map((root, idx) => (
          <ParentGroupTreeNode
            key={root.id}
            node={root}
            depth={0}
            isFirstRoot={idx === 0}
            isLastSibling={idx === roots.length - 1}
            records={records}
            expandedIds={expandedIds}
            selectedId={selectedId}
            selectableIds={selectableIds}
            visibleIds={visibleIds}
            onToggle={toggle}
            onSelect={onSelect}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}

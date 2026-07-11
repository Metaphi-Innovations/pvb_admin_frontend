"use client";

import React, { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChartOfAccount } from "../../../data";
import { getDirectChildren, getSearchVisibleIds } from "../chart-of-accounts-data";
import {
  COA_SIDEBAR_ROW_CLASS,
  COA_TREE_CHEVRON_WIDTH_CLASS,
  coaNodeShowsExpandChevron,
  coaSidebarIconSizeClass,
  coaSidebarIndentPx,
  coaSidebarNodeIconClass,
  resolveCoaSidebarIcon,
  resolveCoaVisualLevel,
} from "./coa-tree-visual";
import { CoaTreeNodeLabel } from "./CoaTreeNodeLabel";
import { TooltipProvider } from "@/components/ui/tooltip";

const CHEVRON_BTN = cn(
  "h-5 flex items-center justify-center rounded text-muted-foreground/70 hover:text-foreground transition-colors outline-none focus:outline-none focus-visible:outline-none",
  COA_TREE_CHEVRON_WIDTH_CLASS,
);

function hasChildren(records: ChartOfAccount[], nodeId: number): boolean {
  return getDirectChildren(records, nodeId).length > 0;
}

interface NavRowProps {
  node: ChartOfAccount;
  records: ChartOfAccount[];
  selectedId: number | null;
  depth: number;
  onSelect: (node: ChartOfAccount) => void;
  onToggle?: (id: number) => void;
  expanded?: boolean;
  showChevron?: boolean;
}

function NavRow({
  node,
  records,
  selectedId,
  depth,
  onSelect,
  onToggle,
  expanded,
  showChevron,
}: NavRowProps) {
  const visual = resolveCoaVisualLevel(node, records);
  const Icon = resolveCoaSidebarIcon(node, visual, records);
  const isSelected = selectedId === node.id;

  return (
    <div
      data-coa-tree-row
      className={cn(
        "flex w-full min-w-0 items-stretch rounded-sm transition-colors",
        isSelected ? "bg-brand-50" : "hover:bg-muted/30",
      )}
    >
      <div
        className="shrink-0"
        style={{ width: coaSidebarIndentPx(depth) }}
        aria-hidden
      />
      <div className="flex flex-1 min-w-0 items-center gap-0.5 pr-0.5">
        {showChevron ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle?.(node.id);
            }}
            className={CHEVRON_BTN}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronDown
              className={cn("w-3.5 h-3.5 transition-transform duration-150", !expanded && "-rotate-90")}
              strokeWidth={2}
            />
          </button>
        ) : (
          <span className={COA_TREE_CHEVRON_WIDTH_CLASS} aria-hidden />
        )}
        <button
          type="button"
          onClick={() => onSelect(node)}
          className={cn(
            "flex flex-1 min-w-0 items-center gap-1 py-1 pr-1 text-left leading-snug",
            COA_SIDEBAR_ROW_CLASS[visual],
            isSelected && "font-semibold text-brand-800",
          )}
        >
          <Icon
            className={cn(
              coaSidebarIconSizeClass(node, records),
              "shrink-0",
              coaSidebarNodeIconClass(node, visual, isSelected, records),
            )}
            strokeWidth={visual === "primary_head" ? 2 : 1.75}
          />
          <CoaTreeNodeLabel
            name={node.accountName}
            className={isSelected ? "font-semibold text-brand-800" : undefined}
          />
        </button>
      </div>
    </div>
  );
}

function TreeChildren({
  parentId,
  records,
  selectedId,
  expandedIds,
  visibleIds,
  depth,
  onSelect,
  onToggle,
}: {
  parentId: number;
  records: ChartOfAccount[];
  selectedId: number | null;
  expandedIds: Set<number>;
  visibleIds: Set<number> | null;
  depth: number;
  onSelect: (node: ChartOfAccount) => void;
  onToggle: (id: number) => void;
}) {
  const children = getDirectChildren(records, parentId).filter(
    (c) => !visibleIds || visibleIds.has(c.id),
  );

  return (
    <>
      {children.map((child) => {
        const childHasChildren = hasChildren(records, child.id);
        const showChevron = coaNodeShowsExpandChevron(child, records, childHasChildren);
        const isExpanded = expandedIds.has(child.id);

        return (
          <div key={child.id}>
            <NavRow
              node={child}
              records={records}
              selectedId={selectedId}
              depth={depth}
              onSelect={onSelect}
              onToggle={showChevron ? onToggle : undefined}
              expanded={isExpanded}
              showChevron={showChevron}
            />
            {showChevron && isExpanded && (
              <TreeChildren
                parentId={child.id}
                records={records}
                selectedId={selectedId}
                expandedIds={expandedIds}
                visibleIds={visibleIds}
                depth={depth + 1}
                onSelect={onSelect}
                onToggle={onToggle}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

interface CoaSidebarAccordionProps {
  records: ChartOfAccount[];
  selectedId: number | null;
  expandedIds: Set<number>;
  search: string;
  onSelect: (node: ChartOfAccount) => void;
  onToggle: (id: number) => void;
}

export function CoaSidebarAccordion({
  records,
  selectedId,
  expandedIds,
  search,
  onSelect,
  onToggle,
}: CoaSidebarAccordionProps) {
  const primaryHeads = useMemo(
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

  const filteredHeads = visibleIds
    ? primaryHeads.filter((h) => visibleIds.has(h.id))
    : primaryHeads;

  if (filteredHeads.length === 0) {
    return (
      <p className="px-2 py-3 text-xs text-muted-foreground text-center">
        No accounts match your search.
      </p>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-1 px-0.5 accounts-coa-tree">
        {filteredHeads.map((head) => {
          const isHeadExpanded = expandedIds.has(head.id);
          const isHeadSelected = selectedId === head.id;
          const HeadIcon = resolveCoaSidebarIcon(head, "primary_head", records);
          const groups = getDirectChildren(records, head.id).filter(
            (c) => !visibleIds || visibleIds.has(c.id),
          );
          const headHasChildren = groups.length > 0;

          return (
            <section
              key={head.id}
              className={cn(
                "rounded-md border border-border/40 overflow-hidden",
                isHeadExpanded && headHasChildren && "border-border/50",
              )}
            >
              <div
                data-coa-tree-row
                className={cn(
                  "flex w-full min-w-0 items-stretch px-0.5 transition-colors",
                  isHeadSelected ? "bg-brand-50" : "hover:bg-muted/30",
                )}
              >
                <div
                  className="shrink-0"
                  style={{ width: coaSidebarIndentPx(0) }}
                  aria-hidden
                />
                <div className="flex flex-1 min-w-0 items-center gap-0.5 pr-0.5">
                  {headHasChildren ? (
                    <button
                      type="button"
                      onClick={() => onToggle(head.id)}
                      className={CHEVRON_BTN}
                      aria-label={isHeadExpanded ? "Collapse section" : "Expand section"}
                    >
                      <ChevronDown
                        className={cn(
                          "w-3.5 h-3.5 transition-transform duration-150",
                          !isHeadExpanded && "-rotate-90",
                        )}
                        strokeWidth={2}
                      />
                    </button>
                  ) : (
                    <span className={COA_TREE_CHEVRON_WIDTH_CLASS} aria-hidden />
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(head)}
                    className={cn(
                      "flex flex-1 min-w-0 items-center gap-1 py-1 pr-1 text-left leading-snug",
                      COA_SIDEBAR_ROW_CLASS.primary_head,
                      isHeadSelected && "font-semibold text-brand-800",
                    )}
                  >
                    <HeadIcon
                      className={cn(
                        coaSidebarIconSizeClass(head, records),
                        "shrink-0",
                        coaSidebarNodeIconClass(head, "primary_head", isHeadSelected, records),
                      )}
                      strokeWidth={2}
                    />
                    <CoaTreeNodeLabel
                      name={head.accountName}
                      className={cn("font-semibold", isHeadSelected && "text-brand-800")}
                    />
                  </button>
                </div>
              </div>

              {isHeadExpanded && headHasChildren && (
                <div className="border-t border-border/30 px-0.5 pb-1 pt-0.5">
                  <TreeChildren
                    parentId={head.id}
                    records={records}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                    visibleIds={visibleIds}
                    depth={1}
                    onSelect={onSelect}
                    onToggle={onToggle}
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

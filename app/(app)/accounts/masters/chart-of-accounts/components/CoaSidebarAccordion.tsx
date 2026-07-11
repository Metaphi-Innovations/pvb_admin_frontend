"use client";

import React, { useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChartOfAccount } from "../../../data";
import { getDirectChildren, getSearchVisibleIds } from "../chart-of-accounts-data";
import {
  COA_SIDEBAR_ROW_CLASS,
  coaNodeShowsExpandChevron,
  coaSidebarIconSizeClass,
  coaSidebarIndentPx,
  coaSidebarNodeIconClass,
  coaTreeIconClass,
  resolveCoaSidebarIcon,
  resolveCoaVisualLevel,
  type CoaVisualLevel,
} from "./coa-tree-visual";

const CHEVRON_BTN =
  "w-5 h-5 flex-shrink-0 flex items-center justify-center rounded text-muted-foreground/70 hover:text-foreground transition-colors outline-none focus:outline-none focus-visible:outline-none";

function hasChildren(records: ChartOfAccount[], nodeId: number): boolean {
  return getDirectChildren(records, nodeId).length > 0;
}

function navRowClass(visual: CoaVisualLevel, selected: boolean) {
  return cn(
    "w-full flex items-center gap-1.5 px-1 py-1 rounded-md text-left leading-snug transition-colors cursor-pointer",
    COA_SIDEBAR_ROW_CLASS[visual],
    selected ? "bg-brand-50/80 text-brand-800 font-semibold" : "hover:bg-muted/30",
  );
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
    <div className="flex items-center gap-0" style={{ paddingLeft: coaSidebarIndentPx(depth) }}>
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
        <span className="w-5 flex-shrink-0" aria-hidden />
      )}
      <button
        type="button"
        onClick={() => onSelect(node)}
        className={cn(navRowClass(visual, isSelected), "flex-1 min-w-0")}
      >
        <Icon
          className={cn(
            coaSidebarIconSizeClass(node, records),
            "flex-shrink-0",
            coaSidebarNodeIconClass(node, visual, isSelected, records),
          )}
          strokeWidth={visual === "primary_head" ? 2 : 1.75}
        />
        <span className="flex-1 min-w-0 whitespace-normal break-words truncate">{node.accountName}</span>
      </button>
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
            <div className="flex items-center gap-0 px-0.5" style={{ paddingLeft: coaSidebarIndentPx(0) }}>
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
                <span className="w-5 flex-shrink-0" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => onSelect(head)}
                className={cn(navRowClass("primary_head", isHeadSelected), "flex-1 min-w-0")}
              >
                <HeadIcon
                  className={cn(
                    coaSidebarIconSizeClass(head, records),
                    "flex-shrink-0",
                    coaSidebarNodeIconClass(head, "primary_head", isHeadSelected, records),
                  )}
                  strokeWidth={2}
                />
                <span className="flex-1 whitespace-normal break-words font-semibold truncate">
                  {head.accountName}
                </span>
              </button>
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
  );
}

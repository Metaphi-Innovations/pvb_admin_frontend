"use client";

import React, { memo, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import type { ChartOfAccount } from "../../../data";
import {
  canAddLedgerUnder,
  canAddSubGroupUnder,
  canDeleteGroup,
  canEditGroup,
  countLedgersUnder,
  getLedgerDeleteBlockReason,
  getSearchVisibleIds,
  nodeMatchesSearch,
  saveChartOfAccounts,
} from "../chart-of-accounts-data";
import {
  isCustomerOrSupplierLinkedLedger,
  resolveCoaMasterLink,
} from "@/lib/accounts/coa-master-link";
import { removeErpPartyLink } from "@/lib/accounts/erp-party-links";
import { deleteLedgerMeta } from "@/lib/accounts/ledger-metadata";
import { coaTreeNodeHasChildren, getCoaTreeChildren } from "@/lib/accounts/coa-tree-children";
import {
  canCoaSidebarAddLedgerUnder,
  canCoaSidebarDeleteNode,
  canCoaSidebarEditNode,
  coaSidebarNodeHasChildren,
  coaSidebarNodeShowsExpandChevron,
  getCoaSidebarSearchVisibleIds,
  getCoaSidebarTreeChildren,
  resolveCoaSidebarVisualLevel,
} from "@/lib/accounts/coa-sidebar-tree";
import { isAddLedgerBlocked } from "@/lib/accounts/coa-add-ledger-policy";
import { requestCoaAddSubGroup, requestCoaDeleteGroup, requestCoaEditGroup } from "../coa-add-group-bridge";
import { requestCoaEditLedger } from "../coa-edit-ledger-bridge";
import { CoaNodeHoverActions } from "./CoaNodeHoverActions";
import { CoaLevelBadge } from "./CoaLevelBadge";
import {
  CoaSystemManagedLock,
  isSystemManagedStatutoryNode,
} from "./CoaSystemManagedLock";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";

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
  onDeleteLedger?: (ledgerId: number) => void;
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
  onDeleteLedger,
}: TreeNodeProps) {
  const isSidebar = variant === "sidebar";
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const visualLevel = isSidebar
    ? resolveCoaSidebarVisualLevel(node, records)
    : resolveCoaVisualLevel(node, records);
  const Icon = resolveCoaSidebarIcon(node, visualLevel, records);
  const isLedger = node.nodeLevel === "ledger";
  const isPrimaryHead = node.nodeLevel === "primary_head";
  const isStatutoryManaged = isSystemManagedStatutoryNode(node);
  const hasChildren = isSidebar
    ? coaSidebarNodeHasChildren(records, node.id)
    : coaTreeNodeHasChildren(records, node.id);
  const children = useMemo(
    () =>
      isExpanded && hasChildren
        ? isSidebar
          ? getCoaSidebarTreeChildren(records, node.id)
          : getCoaTreeChildren(records, node.id)
        : [],
    [isExpanded, hasChildren, isSidebar, records, node.id],
  );
  const ledgerCount = !isSidebar && !isLedger ? countLedgersUnder(records, node.id) : 0;
  const showExpandChevron = isSidebar
    ? coaSidebarNodeShowsExpandChevron(node, records)
    : coaNodeShowsExpandChevron(node, records, hasChildren);
  const allowAddSubGroup =
    !isSidebar &&
    canCreate &&
    onAddSubGroup != null &&
    canAddSubGroupUnder(node, records);
  const allowAddLedger = isSidebar
    ? canCreate && onAddLedger != null && canCoaSidebarAddLedgerUnder(node, records)
    : canCreate &&
      onAddLedger != null &&
      canAddLedgerUnder(node, records) &&
      !isAddLedgerBlocked(node, records);
  const allowEdit = isSidebar
    ? canEdit && canCoaSidebarEditNode(node, records)
    : canEdit && canEditGroup(node);
  const allowDelete = isSidebar
    ? canEdit && canCoaSidebarDeleteNode(node, records)
    : canEdit && canDeleteGroup(node, records);
  const isHighlighted = highlightedLedgerId === node.id;
  const isSearchMatch =
    Boolean(searchQuery.trim()) && nodeMatchesSearch(records, node, searchQuery);
  const sidebarShowsIcon = isSidebar && coaSidebarShowsNodeIcon(visualLevel);
  const showRowIcon = isSidebar ? sidebarShowsIcon : true;

  if (visibleIds && !visibleIds.has(node.id)) return null;

  const handleClick = () => {
    if (isLedger && onLedgerOpen) {
      onLedgerOpen(node);
      return;
    }
    onSelect(node);
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
                {!isLedger && ledgerCount > 0 && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground tabular-nums whitespace-nowrap">
                    ({ledgerCount})
                  </span>
                )}
              </span>
            )}
            {isStatutoryManaged && (
              <CoaSystemManagedLock className="mx-0.5 shrink-0" />
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
            onEdit={() =>
              isSidebar && isLedger
                ? requestCoaEditLedger(node.id)
                : requestCoaEditGroup(node.id)
            }
            onDelete={() =>
              isSidebar && isLedger
                ? onDeleteLedger?.(node.id)
                : requestCoaDeleteGroup(node.id)
            }
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
              onDeleteLedger={onDeleteLedger}
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
  onRecordsChange?: (records: ChartOfAccount[]) => void;
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
  onRecordsChange,
}: CoaExplorerTreeProps) {
  const [deleteTarget, setDeleteTarget] = useState<ChartOfAccount | null>(null);
  const [deleteBlockReason, setDeleteBlockReason] = useState<string | null>(null);
  const isSidebar = variant === "sidebar";

  const handleDeleteLedger = (ledgerId: number) => {
    const ledger = records.find((r) => r.id === ledgerId);
    if (!ledger || !canCoaSidebarDeleteNode(ledger, records)) return;
    const block = getLedgerDeleteBlockReason(ledger, records);
    if (block) {
      setDeleteBlockReason(block);
      setDeleteTarget(ledger);
      return;
    }
    setDeleteBlockReason(null);
    setDeleteTarget(ledger);
  };

  const closeDeleteDialog = () => {
    setDeleteTarget(null);
    setDeleteBlockReason(null);
  };

  const confirmDeleteLedger = () => {
    if (!deleteTarget) return;
    const block = getLedgerDeleteBlockReason(deleteTarget, records);
    if (block) {
      setDeleteBlockReason(block);
      return;
    }

    const link = resolveCoaMasterLink(deleteTarget, records);
    if (link && (link.category === "customer" || link.category === "vendor")) {
      removeErpPartyLink(link.sourceModule, link.sourceId);
    }
    deleteLedgerMeta(deleteTarget.id);

    const next = records.filter((r) => r.id !== deleteTarget.id);
    saveChartOfAccounts(next);
    onRecordsChange?.(next);
    dispatchAccountsDataChanged("ledgers", {
      operation: "delete",
      recordId: deleteTarget.id,
    });
    closeDeleteDialog();
  };

  const roots = useMemo(
    () =>
      records
        .filter((r) => r.nodeLevel === "primary_head")
        .sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
    [records],
  );

  const visibleIds = useMemo(
    () =>
      search.trim()
        ? isSidebar
          ? getCoaSidebarSearchVisibleIds(records, search)
          : getSearchVisibleIds(records, search)
        : null,
    [records, search, isSidebar],
  );

  const onDeleteLedger = isSidebar ? handleDeleteLedger : undefined;

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
                onDeleteLedger={onDeleteLedger}
              />
            ))
          )}
        </div>
      </div>

      {isSidebar && (
        <Dialog open={deleteTarget != null} onOpenChange={() => closeDeleteDialog()}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
                    deleteBlockReason
                      ? "bg-amber-50 border-amber-200"
                      : "bg-red-50 border-red-200",
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      "w-4 h-4",
                      deleteBlockReason ? "text-amber-500" : "text-red-500",
                    )}
                  />
                </div>
                {deleteBlockReason ? "Cannot delete ledger" : "Delete ledger?"}
              </DialogTitle>
              <DialogDescription className="pt-1">
                {deleteBlockReason
                  ? deleteBlockReason
                  : deleteTarget
                    ? isCustomerOrSupplierLinkedLedger(deleteTarget, records)
                      ? `"${deleteTarget.accountName}" is linked to a customer/supplier master. Removing it from the chart of accounts cannot be undone.`
                      : `"${deleteTarget.accountName}" will be removed from the chart of accounts. This cannot be undone.`
                    : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-2 pt-2">
              {deleteBlockReason ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={closeDeleteDialog}
                >
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={closeDeleteDialog}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                    onClick={confirmDeleteLedger}
                  >
                    Delete
                  </Button>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </TooltipProvider>
  );
}

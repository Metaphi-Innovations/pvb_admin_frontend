"use client";

import React, { useCallback, useMemo } from "react";
import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { isPostableNode } from "@/lib/accounts/coa-hierarchy";
import { isTdsCoaNode } from "@/lib/accounts/tds-coa-utils";
import { resolveCoaAddLedgerPolicy } from "@/lib/accounts/coa-add-ledger-policy";
import type { ChartOfAccount } from "../../../data";
import {
  canAddLedgerUnder,
  canAddSubGroupUnder,
  canDeleteGroup,
  canEditGroup,
} from "../chart-of-accounts-data";
import type { CoaLedgerListingRow, CoaListingRow } from "../coa-listing-data";
import { CoaNodeHoverActions } from "./CoaNodeHoverActions";
import { CoaHierarchyLevelIcon } from "./CoaLevelBadge";
import {
  CoaSystemManagedLock,
  isSystemManagedStatutoryNode,
} from "./CoaSystemManagedLock";
import { requestCoaAddSubGroup, requestCoaDeleteGroup, requestCoaEditGroup } from "../coa-add-group-bridge";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsFilteredRows,
} from "../../../components/AccountsUI";

interface CoaHierarchyListingTableProps {
  variant?: "hierarchy";
  rows: CoaListingRow[];
  ledgerRows?: never;
  records: ChartOfAccount[];
  canCreate: boolean;
  highlightedLedgerId?: number | null;
  isSearchMode?: boolean;
  onDrillInto: (node: ChartOfAccount) => void;
  onAddLedger?: (parentGroupId: number) => void;
  onAddSubGroup?: (parentGroupId: number) => void;
  canEdit?: boolean;
  emptyMessage?: string;
}

interface CoaLedgerListingTableProps {
  variant: "ledger";
  ledgerRows: CoaLedgerListingRow[];
  rows?: never;
  records?: ChartOfAccount[];
  canCreate?: boolean;
  highlightedLedgerId?: number | null;
  isSearchMode?: boolean;
  onDrillInto: (node: ChartOfAccount) => void;
  onAddLedger?: (parentGroupId: number) => void;
  emptyMessage?: string;
}

type CoaListingTableProps = CoaHierarchyListingTableProps | CoaLedgerListingTableProps;

export function CoaListingTable(props: CoaListingTableProps) {
  const {
    highlightedLedgerId = null,
    isSearchMode = false,
    onDrillInto,
    emptyMessage = "No accounts at this level.",
  } = props;

  if (props.variant === "ledger") {
    return (
      <CoaLedgerListingTableBody
        ledgerRows={props.ledgerRows}
        highlightedLedgerId={highlightedLedgerId}
        isSearchMode={isSearchMode}
        onSelectLedger={onDrillInto}
        emptyMessage={emptyMessage}
      />
    );
  }

  const { rows, records, canCreate, canEdit = false, onAddLedger, onAddSubGroup } = props;

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4">
        <p className="text-xs font-medium text-foreground">{emptyMessage}</p>
        {!isSearchMode && (
          <p className="text-sm text-muted-foreground mt-1">
            Select a group in the sidebar or clear search to browse accounts.
          </p>
        )}
      </div>
    );
  }

  return (
    <CoaHierarchyListingTable
      rows={rows}
      records={records}
      canCreate={canCreate}
      highlightedLedgerId={highlightedLedgerId}
      isSearchMode={isSearchMode}
      onDrillInto={onDrillInto}
      onAddLedger={onAddLedger}
      onAddSubGroup={onAddSubGroup}
      canEdit={canEdit}
    />
  );
}

function CoaHierarchyListingTable({
  rows,
  records,
  canCreate,
  canEdit = false,
  highlightedLedgerId,
  isSearchMode,
  onDrillInto,
  onAddLedger,
  onAddSubGroup,
}: {
  rows: CoaListingRow[];
  records: ChartOfAccount[];
  canCreate: boolean;
  canEdit?: boolean;
  highlightedLedgerId: number | null;
  isSearchMode: boolean;
  onDrillInto: (node: ChartOfAccount) => void;
  onAddLedger?: (parentGroupId: number) => void;
  onAddSubGroup?: (parentGroupId: number) => void;
}) {
  const getCellValue = useCallback((row: CoaListingRow, key: string) => {
    switch (key) {
      case "accountCode":
        return row.node.accountCode;
      case "accountName":
        return row.node.accountName;
      case "parentGroupName":
        return row.parentGroupName;
      case "hierarchyPath":
        return row.hierarchyPath;
      case "openingAmount":
        return row.openingAmount;
      case "periodDebit":
        return row.periodDebit;
      case "periodCredit":
        return row.periodCredit;
      case "closingAmount":
        return row.closingAmount;
      default:
        return "";
    }
  }, []);

  const columnConfig = useMemo(() => {
    const cfg: Record<string, { type: "text" | "amount" }> = {
      accountCode: { type: "text" },
      accountName: { type: "text" },
      openingAmount: { type: "amount" },
      periodDebit: { type: "amount" },
      periodCredit: { type: "amount" },
      closingAmount: { type: "amount" },
    };
    if (isSearchMode) {
      cfg.parentGroupName = { type: "text" };
      cfg.hierarchyPath = { type: "text" };
    }
    return cfg;
  }, [isSearchMode]);

  return (
    <AccountsColumnFilterProvider
      rows={rows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="accountCode"
      defaultSortDir="asc"
    >
      <CoaHierarchyTableContent
        records={records}
        canCreate={canCreate}
        canEdit={canEdit}
        highlightedLedgerId={highlightedLedgerId}
        isSearchMode={isSearchMode}
        onDrillInto={onDrillInto}
        onAddLedger={onAddLedger}
        onAddSubGroup={onAddSubGroup}
        minWidth={isSearchMode ? 1080 : 860}
      />
    </AccountsColumnFilterProvider>
  );
}

function CoaHierarchyTableContent({
  records,
  canCreate,
  highlightedLedgerId,
  isSearchMode,
  onDrillInto,
  onAddLedger,
  onAddSubGroup,
  canEdit = false,
  minWidth,
}: {
  records: ChartOfAccount[];
  canCreate: boolean;
  canEdit?: boolean;
  highlightedLedgerId: number | null;
  isSearchMode: boolean;
  onDrillInto: (node: ChartOfAccount) => void;
  onAddLedger?: (parentGroupId: number) => void;
  onAddSubGroup?: (parentGroupId: number) => void;
  minWidth: number;
}) {
  const visible = useAccountsFilteredRows<CoaListingRow>([]);

  return (
    <AccountsTableScroll>
      <AccountsTable minWidth={minWidth}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Ledger Code" colKey="accountCode" className="w-28" />
            <SortTh label="Ledger Name" colKey="accountName" className="min-w-[200px]" />
            {isSearchMode && (
              <>
                <SortTh label="Parent Group" colKey="parentGroupName" className="min-w-[160px]" />
                <SortTh label="Hierarchy Path" colKey="hierarchyPath" className="min-w-[220px]" />
              </>
            )}
            <SortTh label="Opening Balance" colKey="openingAmount" filterType="amount" align="right" className="w-36" />
            <SortTh label="Debit" colKey="periodDebit" filterType="amount" align="right" className="w-28" />
            <SortTh label="Credit" colKey="periodCredit" filterType="amount" align="right" className="w-28" />
            <SortTh label="Closing Balance" colKey="closingAmount" filterType="amount" align="right" className="w-36" />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {visible.map((row) => {
            const { node } = row;
            const isLedger = node.nodeLevel === "ledger";
            const isStatutoryManaged = isSystemManagedStatutoryNode(node);
            const allowAddSubGroup =
              canCreate && onAddSubGroup && canAddSubGroupUnder(node, records);
            const allowAddLedger =
              canCreate &&
              onAddLedger &&
              canAddLedgerUnder(node, records) &&
              !resolveCoaAddLedgerPolicy(node, records).blocked;
            const allowEdit = canEdit && canEditGroup(node);
            const allowDelete = canEdit && canDeleteGroup(node, records);
            const isPostableLedger =
              isLedger &&
              !node.bankGroupFlag &&
              !isTdsCoaNode(node, records) &&
              isPostableNode(node, records);
            const drillable = row.hasChildren || isPostableLedger;
            const isHighlighted = highlightedLedgerId === node.id;

            return (
              <AccountsTableRow
                key={node.id}
                className={cn(
                  "group",
                  drillable && "cursor-pointer",
                  isHighlighted && "is-selected",
                )}
                onClick={() => drillable && onDrillInto(node)}
              >
                <AccountsTableCell className="font-mono text-xs font-semibold text-brand-700 whitespace-nowrap">
                  {node.accountCode}
                </AccountsTableCell>
                <AccountsTableCell wrap className="min-w-[200px]">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <CoaHierarchyLevelIcon node={node} records={records} className="mt-0.5" />
                    <p
                      className={cn(
                        "flex-1 min-w-0 text-xs leading-snug",
                        drillable && "group-hover:text-brand-700",
                      )}
                    >
                      {node.accountName}
                      {isStatutoryManaged && (
                        <CoaSystemManagedLock className="ml-1" />
                      )}
                    </p>
                    {allowAddSubGroup || allowAddLedger || allowEdit || allowDelete ? (
                      <CoaNodeHoverActions
                        compact
                        showAddSubGroup={allowAddSubGroup}
                        showAddLedger={allowAddLedger}
                        showEdit={allowEdit}
                        showDelete={allowDelete}
                        onAddSubGroup={() => (onAddSubGroup ?? requestCoaAddSubGroup)(node.id)}
                        onAddLedger={() => onAddLedger!(node.id)}
                        onEdit={() => requestCoaEditGroup(node.id)}
                        onDelete={() => requestCoaDeleteGroup(node.id)}
                        className="mt-0.5"
                      />
                    ) : null}
                  </div>
                </AccountsTableCell>
                {isSearchMode && (
                  <>
                    <AccountsTableCell wrap className="text-xs text-foreground/90">
                      {row.parentGroupName || "—"}
                    </AccountsTableCell>
                    <AccountsTableCell wrap className="text-xs text-muted-foreground leading-snug">
                      {row.hierarchyPath}
                    </AccountsTableCell>
                  </>
                )}
                <AccountsTableCell align="right">
                  {row.openingAmount > 0 ? (
                    <MoneyAmount amount={row.openingAmount} side={row.openingSide} className="text-xs" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs">
                  {formatMoney(row.periodDebit)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="text-xs">
                  {formatMoney(row.periodCredit)}
                </AccountsTableCell>
                <AccountsTableCell align="right">
                  {row.closingAmount > 0 ? (
                    <MoneyAmount
                      amount={row.closingAmount}
                      side={row.closingSide}
                      className="text-xs font-medium"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </AccountsTableCell>
              </AccountsTableRow>
            );
          })}
        </AccountsTableBody>
      </AccountsTable>
    </AccountsTableScroll>
  );
}

function CoaLedgerListingTableBody({
  ledgerRows,
  highlightedLedgerId,
  isSearchMode,
  onSelectLedger,
  emptyMessage,
}: {
  ledgerRows: CoaLedgerListingRow[];
  highlightedLedgerId: number | null;
  isSearchMode: boolean;
  onSelectLedger: (ledger: ChartOfAccount) => void;
  emptyMessage: string;
}) {
  if (ledgerRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4">
        <p className="text-xs font-medium text-foreground">{emptyMessage}</p>
        {!isSearchMode && (
          <p className="text-sm text-muted-foreground mt-1">
            Add a ledger under this group or clear search to see all ledgers.
          </p>
        )}
      </div>
    );
  }

  return (
    <CoaLedgerListingTableInner
      ledgerRows={ledgerRows}
      highlightedLedgerId={highlightedLedgerId}
      onSelectLedger={onSelectLedger}
    />
  );
}

function CoaLedgerListingTableInner({
  ledgerRows,
  highlightedLedgerId,
  onSelectLedger,
}: {
  ledgerRows: CoaLedgerListingRow[];
  highlightedLedgerId: number | null;
  onSelectLedger: (ledger: ChartOfAccount) => void;
}) {
  const getCellValue = useCallback((row: CoaLedgerListingRow, key: string) => {
    switch (key) {
      case "accountName":
        return row.ledger.accountName;
      case "accountCode":
        return row.ledger.accountCode;
      case "parentGroupName":
        return row.parentGroupName;
      case "source":
        return row.source;
      case "openingAmount":
        return row.openingAmount;
      case "currentAmount":
        return row.currentAmount;
      case "status":
        return row.ledger.status;
      default:
        return "";
    }
  }, []);

  return (
    <AccountsColumnFilterProvider
      rows={ledgerRows}
      getCellValue={getCellValue}
      columnConfig={{
        accountName: { type: "text" },
        accountCode: { type: "text" },
        parentGroupName: { type: "text" },
        source: { type: "text" },
        openingAmount: { type: "amount" },
        currentAmount: { type: "amount" },
      }}
      defaultSortKey="accountName"
      defaultSortDir="asc"
    >
      <CoaLedgerTableContent
        highlightedLedgerId={highlightedLedgerId}
        onSelectLedger={onSelectLedger}
      />
    </AccountsColumnFilterProvider>
  );
}

function CoaLedgerTableContent({
  highlightedLedgerId,
  onSelectLedger,
}: {
  highlightedLedgerId: number | null;
  onSelectLedger: (ledger: ChartOfAccount) => void;
}) {
  const visible = useAccountsFilteredRows<CoaLedgerListingRow>([]);

  return (
    <TooltipProvider delayDuration={200}>
      <AccountsTableScroll>
        <AccountsTable minWidth={760}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <SortTh label="Ledger Name" colKey="accountName" className="w-[40%] min-w-[260px]" />
              <SortTh label="Ledger Code" colKey="accountCode" className="w-[18%] min-w-[140px]" />
              <SortTh label="Opening Balance" colKey="openingAmount" filterType="amount" align="right" className="w-[18%] min-w-[150px]" />
              <SortTh label="Current Balance" colKey="currentAmount" filterType="amount" align="right" className="w-[18%] min-w-[150px]" />
              <AccountsColumnHeader label="Actions" colKey="actions" sortable={false} align="center" className="w-16" />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {visible.map((row) => {
              const { ledger } = row;
              const isHighlighted = highlightedLedgerId === ledger.id;

              return (
                <AccountsTableRow
                  key={ledger.id}
                  className={cn("group cursor-pointer", isHighlighted && "is-selected")}
                  onClick={() => onSelectLedger(ledger)}
                >
                  <AccountsTableCell wrap className="w-[40%] min-w-[260px]">
                    <p className="flex items-center gap-1 text-xs font-semibold text-foreground leading-snug group-hover:text-brand-700">
                      {ledger.accountName}
                      {isSystemManagedStatutoryNode(ledger) && (
                        <CoaSystemManagedLock className="shrink-0" />
                      )}
                    </p>
                    {row.tdsSection ? (
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Sec {row.tdsSection} · {row.tdsRate} · {row.tdsKind}
                        {row.tdsDeductee ? ` · ${row.tdsDeductee}` : ""}
                      </p>
                    ) : null}
                  </AccountsTableCell>
                  <AccountsTableCell className="w-[18%] min-w-[140px] font-mono text-xs font-semibold text-brand-700 whitespace-nowrap">
                    {ledger.accountCode}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="w-[18%] min-w-[150px]">
                    {row.openingAmount > 0 ? (
                      <MoneyAmount amount={row.openingAmount} side={row.openingSide} className="text-xs" />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="w-[18%] min-w-[150px]">
                    {row.currentAmount > 0 ? (
                      <MoneyAmount
                        amount={row.currentAmount}
                        side={row.currentSide}
                        className="text-xs font-medium"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </AccountsTableCell>
                  <AccountsTableCell align="center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span
                          aria-label="View Ledger Transactions"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors group-hover:bg-brand-50 group-hover:text-brand-700"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">View Ledger Transactions</TooltipContent>
                    </Tooltip>
                  </AccountsTableCell>
                </AccountsTableRow>
              );
            })}
          </AccountsTableBody>
        </AccountsTable>
      </AccountsTableScroll>
    </TooltipProvider>
  );
}

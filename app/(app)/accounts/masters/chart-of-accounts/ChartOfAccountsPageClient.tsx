"use client";

import React, { useCallback, useEffect, useMemo, useState, useDeferredValue } from "react";
import dynamic from "next/dynamic";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { CoaListingToolbar } from "./components/CoaListingToolbar";
import { useCoaNavigation } from "@/components/accounts/CoaNavigationContext";
import { isGroupingLedger } from "@/lib/accounts/coa-hierarchy";
import { buildCoaLedgerDetailSummary } from "./coa-demo-accounting";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { defaultLedgerDateRangeState } from "@/lib/accounts/ledger-transaction-date-filter";
import { type DateRangePresetId } from "@/lib/accounts/report-date-presets";
import { isTdsCoaNode } from "@/lib/accounts/tds-coa-utils";
import {
  isLandBuildingGroup,
  isSundryCreditorsGroup,
  isSundryDebtorsGroup,
  resolveCoaAddActionLabel,
  resolveCoaAddLedgerPolicy,
} from "@/lib/accounts/coa-add-ledger-policy";
import {
  getCoaDisplayPath,
} from "@/lib/accounts/coa-tree-children";
import { useFY } from "@/lib/fy-store";
import { useClientMounted } from "@/lib/use-client-mounted";
import { ACCOUNTS_HOME_HREF } from "@/lib/accounts/accounts-nav";
import type { ChartOfAccount } from "../../data";
import { loadChartOfAccounts } from "../../data";
import {
  canAddLedgerUnder,
  getAncestorPath,
  isAccountingGroupNode,
} from "./chart-of-accounts-data";
import { CHART_OF_ACCOUNTS_LIST_PATH } from "./chart-of-accounts-utils";
import {
  buildCoaLedgerListingRows,
  buildCoaListingRows,
  computeCoaLedgerListingSummary,
  computeCoaListingSummary,
} from "./coa-listing-data";
import {
  exportCoaLedgerListingToExcel,
  exportCoaLedgerListingToPdf,
  exportCoaLedgerStatementToExcel,
  exportCoaLedgerStatementToPdf,
  exportCoaListingToExcel,
  exportCoaListingToPdf,
} from "./coa-export";
import { filterLedgerStatementRows } from "./coa-ledger-utils";
import {
  requestCoaAddLedger,
  requestCoaGlobalAddLedger,
} from "./coa-add-ledger-bridge";
import { registerSundryDebtorCustomerFormHandler } from "./coa-sundry-debtor-form-bridge";
import { registerSundryCreditorVendorFormHandler } from "./coa-sundry-creditor-form-bridge";
import { registerWarehouseFormHandler } from "./coa-warehouse-form-bridge";
import { CoaListingTable } from "./components/CoaListingTable";
import { CoaListingSummaryBar, CoaLedgerListingSummaryBar } from "./components/CoaListingSummaryBar";
import { CoaLedgerDetailTable } from "./components/CoaLedgerDetailTable";
import { CoaLedgerDetailHeader } from "./components/CoaLedgerDetailHeader";

const AccountsSundryDebtorCustomerFormClient = dynamic(
  () => import("./sundry-debtors/new/AccountsSundryDebtorCustomerFormClient"),
  { ssr: false },
);

const AccountsSundryCreditorVendorFormClient = dynamic(
  () => import("./sundry-creditors/new/AccountsSundryCreditorVendorFormClient"),
  { ssr: false },
);

const AccountsWarehouseFormClient = dynamic(
  () => import("./land-building/new/AccountsWarehouseFormClient"),
  { ssr: false },
);

const HIGHLIGHT_MS = 4000;

/** Ledger detail view for posting ledgers (TDS and bank name containers excluded). */
function isCoaLedgerDetailView(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (node.nodeLevel !== "ledger") return false;
  if (node.bankGroupFlag) return false;
  if (isTdsCoaNode(node, records)) return false;
  return true;
}

export default function ChartOfAccountsPageClient() {
  const mounted = useClientMounted();
  const { selectedFY } = useFY();
  const {
    records,
    setRecords,
    selectedNode,
    selectNode,
    highlightedLedgerId,
    setHighlightedLedgerId,
    ensureExpanded,
  } = useCoaNavigation();

  const deferredRecords = useDeferredValue(records);

  const [showRoot, setShowRoot] = useState(false);
  const [contentSearch, setContentSearch] = useState("");
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datesReady, setDatesReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  /** Inline Customer Master form under Sundry Debtors (Accounts-only save). */
  const [sundryDebtorFormParentId, setSundryDebtorFormParentId] = useState<number | null>(null);
  /** Inline Supplier Master form under Sundry Creditors (Accounts-only save). */
  const [sundryCreditorFormParentId, setSundryCreditorFormParentId] = useState<number | null>(null);
  /** Inline Warehouse Master form under Land & Building (ERP save + COA ledger). */
  const [warehouseFormParentId, setWarehouseFormParentId] = useState<number | null>(null);

  const canCreate = useCanCoa("create");

  useEffect(() => {
    registerSundryDebtorCustomerFormHandler((parentGroupId) => {
      setSundryDebtorFormParentId(parentGroupId);
    });
    registerSundryCreditorVendorFormHandler((parentGroupId) => {
      setSundryCreditorFormParentId(parentGroupId);
    });
    registerWarehouseFormHandler((parentGroupId) => {
      setWarehouseFormParentId(parentGroupId);
    });
    return () => {
      registerSundryDebtorCustomerFormHandler(null);
      registerSundryCreditorVendorFormHandler(null);
      registerWarehouseFormHandler(null);
    };
  }, []);

  const isLedgerStatementView = Boolean(
    !showRoot && selectedNode && isCoaLedgerDetailView(selectedNode, records),
  );

  const isAccountingGroupLedgerListing = Boolean(
    !showRoot && selectedNode && isAccountingGroupNode(selectedNode, records),
  );

  const isGroupingLedgerView = Boolean(
    !showRoot &&
      selectedNode &&
      selectedNode.nodeLevel === "ledger" &&
      isGroupingLedger(selectedNode, records),
  );

  /** Parent whose immediate children are shown in the hierarchy listing table */
  const tableParentId =
    showRoot || isLedgerStatementView || isAccountingGroupLedgerListing
      ? null
      : (selectedNode?.id ?? null);

  useEffect(() => {
    const { from, to, preset: initialPreset } = defaultLedgerDateRangeState(selectedFY.id);
    setPreset(initialPreset);
    setDateFrom(from);
    setDateTo(to);
    setDatesReady(true);
  }, [selectedFY.id]);

  useEffect(() => {
    if (selectedNode) setShowRoot(false);
  }, [selectedNode]);

  useEffect(() => {
    setContentSearch("");
  }, [selectedNode?.id, showRoot]);

  useEffect(() => {
    if (!highlightedLedgerId) return;
    const timer = window.setTimeout(() => setHighlightedLedgerId(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlightedLedgerId, setHighlightedLedgerId]);

  const ledgerAccounting = useMemo(() => {
    if (!isLedgerStatementView || !selectedNode || !datesReady) return null;
    return buildCoaLedgerDetailSummary(selectedNode, deferredRecords, dateFrom, dateTo);
  }, [isLedgerStatementView, selectedNode, deferredRecords, dateFrom, dateTo, datesReady]);

  const filteredTransactions = useMemo(() => {
    if (!ledgerAccounting) return [];
    return filterLedgerStatementRows(ledgerAccounting.transactions, contentSearch);
  }, [ledgerAccounting, contentSearch]);

  const ledgerListingRows = useMemo(() => {
    if (!selectedNode || !isAccountingGroupLedgerListing) return [];
    return buildCoaLedgerListingRows(deferredRecords, selectedNode.id, {
      search: contentSearch,
    });
  }, [deferredRecords, selectedNode, contentSearch, isAccountingGroupLedgerListing]);

  const listingRows = useMemo(() => {
    if (!datesReady || isLedgerStatementView || isAccountingGroupLedgerListing) return [];
    return buildCoaListingRows(deferredRecords, tableParentId, dateFrom, dateTo, {
      search: contentSearch,
    });
  }, [
    deferredRecords,
    tableParentId,
    dateFrom,
    dateTo,
    contentSearch,
    datesReady,
    isLedgerStatementView,
    isAccountingGroupLedgerListing,
  ]);

  const ledgerListingSummary = useMemo(() => {
    if (!isAccountingGroupLedgerListing) return null;
    return computeCoaLedgerListingSummary(ledgerListingRows);
  }, [ledgerListingRows, isAccountingGroupLedgerListing]);

  const summary = useMemo(() => {
    if (!datesReady || isAccountingGroupLedgerListing) return null;

    if (ledgerAccounting) {
      const transactionCount = filteredTransactions.filter((row) => !row.isOpeningRow).length;
      return {
        totalAccounts: transactionCount,
        openingAmount: ledgerAccounting.openingBalance,
        openingSide: ledgerAccounting.openingBalanceType,
        periodDebit: ledgerAccounting.totalDebit,
        periodCredit: ledgerAccounting.totalCredit,
        closingAmount: ledgerAccounting.currentBalance,
        closingSide: ledgerAccounting.balanceType,
      };
    }

    return computeCoaListingSummary(
      records,
      listingRows,
      selectedNode,
      showRoot,
      dateFrom,
      dateTo,
      Boolean(contentSearch.trim()),
    );
  }, [
    records,
    listingRows,
    selectedNode,
    showRoot,
    dateFrom,
    dateTo,
    contentSearch,
    datesReady,
    ledgerAccounting,
    filteredTransactions,
    isAccountingGroupLedgerListing,
  ]);

  const pageBreadcrumbs = useMemo(() => {
    const base = [
      { label: "Accounts", href: ACCOUNTS_HOME_HREF },
      { label: "Chart of Accounts", href: CHART_OF_ACCOUNTS_LIST_PATH },
    ];
    if (showRoot || !selectedNode) return base;
    const path = getCoaDisplayPath(records, selectedNode.id);
    return [
      ...base,
      ...path.map((node, index) => ({
        label: node.accountName,
        href:
          index < path.length - 1
            ? `${CHART_OF_ACCOUNTS_LIST_PATH}?node=${node.id}`
            : undefined,
      })),
    ];
  }, [selectedNode, showRoot, records]);

  const ledgerParentGroup = useMemo(() => {
    if (!selectedNode || !isLedgerStatementView) return "";
    const path = getAncestorPath(records, selectedNode.id);
    return (
      [...path].reverse().find((n) => n.nodeLevel === "account_group")?.accountName ??
      selectedNode.parentAccount ??
      ""
    );
  }, [selectedNode, records, isLedgerStatementView]);

  const exportMeta = useMemo(() => ({ dateFrom, dateTo }), [dateFrom, dateTo]);

  const handleDrillInto = useCallback(
    (node: ChartOfAccount) => {
      const ancestorIds = getAncestorPath(records, node.id).map((a) => a.id);
      ensureExpanded(ancestorIds);
      selectNode(node);
    },
    [selectNode, records, ensureExpanded],
  );

  const handleExcelExport = async () => {
    if (!mounted) return;
    setExporting(true);
    try {
      if (isLedgerStatementView && selectedNode && ledgerAccounting) {
        await exportCoaLedgerStatementToExcel(filteredTransactions, {
          ledger: selectedNode,
          parentGroup: ledgerParentGroup,
          dateFrom,
          dateTo,
          openingAmount: ledgerAccounting.openingBalance,
          openingSide: ledgerAccounting.openingBalanceType,
          closingAmount: ledgerAccounting.currentBalance,
          closingSide: ledgerAccounting.balanceType,
        });
      } else if (isAccountingGroupLedgerListing && ledgerListingRows.length > 0) {
        await exportCoaLedgerListingToExcel(ledgerListingRows, {
          groupName: selectedNode?.accountName ?? "",
        });
      } else if (listingRows.length > 0) {
        await exportCoaListingToExcel(listingRows, exportMeta);
      }
    } finally {
      setExporting(false);
    }
  };

  const handlePdfExport = () => {
    if (!mounted) return;
    if (isLedgerStatementView && selectedNode && ledgerAccounting) {
      exportCoaLedgerStatementToPdf(filteredTransactions, {
        ledger: selectedNode,
        parentGroup: ledgerParentGroup,
        dateFrom,
        dateTo,
        openingAmount: ledgerAccounting.openingBalance,
        openingSide: ledgerAccounting.openingBalanceType,
        closingAmount: ledgerAccounting.currentBalance,
        closingSide: ledgerAccounting.balanceType,
      });
    } else if (isAccountingGroupLedgerListing && ledgerListingRows.length > 0) {
      exportCoaLedgerListingToPdf(ledgerListingRows, {
        groupName: selectedNode?.accountName ?? "",
      });
    } else if (listingRows.length > 0) {
      exportCoaListingToPdf(listingRows, exportMeta);
    }
  };

  const handleNewLedger = useCallback(() => {
    // When viewing Sundry Debtors, open the Customer Master form (Accounts-only save).
    if (
      selectedNode &&
      !showRoot &&
      selectedNode.nodeLevel === "account_group" &&
      isSundryDebtorsGroup(selectedNode, records)
    ) {
      setSundryDebtorFormParentId(selectedNode.id);
      return;
    }

    // When viewing Sundry Creditors, open the Supplier Master form (Accounts-only save).
    if (
      selectedNode &&
      !showRoot &&
      selectedNode.nodeLevel === "account_group" &&
      isSundryCreditorsGroup(selectedNode, records)
    ) {
      setSundryCreditorFormParentId(selectedNode.id);
      return;
    }

    // When viewing Land & Building, open the ERP Warehouse Master form.
    if (
      selectedNode &&
      !showRoot &&
      selectedNode.nodeLevel === "account_group" &&
      isLandBuildingGroup(selectedNode, records)
    ) {
      setWarehouseFormParentId(selectedNode.id);
      return;
    }

    const parentId =
      selectedNode &&
      !showRoot &&
      selectedNode.nodeLevel === "account_group" &&
      canAddLedgerUnder(selectedNode, records) &&
      !resolveCoaAddLedgerPolicy(selectedNode, records).blocked
        ? selectedNode.id
        : null;
    requestCoaGlobalAddLedger(parentId);
  }, [selectedNode, showRoot, records]);

  const handlePartyLedgerSaved = useCallback(
    (ledgerId: number, parentId: number | null, clearForm: () => void) => {
      const next = loadChartOfAccounts();
      setRecords(next);
      if (parentId != null) {
        const parent = next.find((r) => r.id === parentId);
        if (parent) {
          const ancestorIds = getAncestorPath(next, parent.id).map((a) => a.id);
          ensureExpanded([...ancestorIds, parent.id]);
          selectNode(parent);
        }
      }
      setHighlightedLedgerId(ledgerId);
      clearForm();
    },
    [setRecords, ensureExpanded, selectNode, setHighlightedLedgerId],
  );

  const handleSundryDebtorSaved = useCallback(
    (ledgerId: number, parentId: number | null) => {
      handlePartyLedgerSaved(ledgerId, parentId, () => setSundryDebtorFormParentId(null));
    },
    [handlePartyLedgerSaved],
  );

  const handleSundryCreditorSaved = useCallback(
    (ledgerId: number, parentId: number | null) => {
      handlePartyLedgerSaved(ledgerId, parentId, () => setSundryCreditorFormParentId(null));
    },
    [handlePartyLedgerSaved],
  );

  const handleWarehouseSaved = useCallback(
    (ledgerId: number, parentId: number | null) => {
      handlePartyLedgerSaved(ledgerId, parentId, () => setWarehouseFormParentId(null));
    },
    [handlePartyLedgerSaved],
  );

  const newLedgerLabel = useMemo(() => {
    if (
      selectedNode &&
      !showRoot &&
      selectedNode.nodeLevel === "account_group"
    ) {
      return resolveCoaAddActionLabel(selectedNode, records);
    }
    return "New Ledger";
  }, [selectedNode, showRoot, records]);

  const canShowNewLedger =
    canCreate &&
    !isLedgerStatementView &&
    selectedNode?.nodeLevel !== "ledger" &&
    (isAccountingGroupLedgerListing ||
      showRoot ||
      !selectedNode ||
      !resolveCoaAddLedgerPolicy(selectedNode, records).blocked);

  const exportDisabled =
    exporting ||
    (isLedgerStatementView
      ? filteredTransactions.length === 0
      : isAccountingGroupLedgerListing
        ? ledgerListingRows.length === 0
        : listingRows.length === 0);

  // Keep Accounts sidebar; swap only the main panel content for the tabbed Customer form.
  if (sundryDebtorFormParentId != null) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <AccountsSundryDebtorCustomerFormClient
          parentGroupId={sundryDebtorFormParentId}
          onClose={() => setSundryDebtorFormParentId(null)}
          onSaved={handleSundryDebtorSaved}
        />
      </div>
    );
  }

  if (sundryCreditorFormParentId != null) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <AccountsSundryCreditorVendorFormClient
          parentGroupId={sundryCreditorFormParentId}
          onClose={() => setSundryCreditorFormParentId(null)}
          onSaved={handleSundryCreditorSaved}
        />
      </div>
    );
  }

  if (warehouseFormParentId != null) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <AccountsWarehouseFormClient
          parentGroupId={warehouseFormParentId}
          onClose={() => setWarehouseFormParentId(null)}
          onSaved={handleWarehouseSaved}
        />
      </div>
    );
  }

  return (
    <>
      <AccountsPageShell
        layout="split"
        hideDescription
        breadcrumbs={pageBreadcrumbs}
        title="Chart of Accounts"
        description="View account hierarchy and create ledgers under permitted groups."
        className="h-full"
      >
        <div className="flex flex-col flex-1 min-h-0 gap-3">
          <CoaListingToolbar
            search={contentSearch}
            onSearchChange={setContentSearch}
            searchPlaceholder={
              isLedgerStatementView
                ? "Search voucher no., type, narration…"
                : isAccountingGroupLedgerListing
                  ? "Search ledger name, code, source…"
                  : "Search accounts in this view…"
            }
            hideDateRange={isAccountingGroupLedgerListing}
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onExcel={handleExcelExport}
            onPdf={handlePdfExport}
            exportDisabled={exportDisabled}
            showNewLedger={canShowNewLedger}
            canCreate={canCreate}
            onNewLedger={canShowNewLedger ? handleNewLedger : undefined}
            newLedgerLabel={newLedgerLabel}
          />

          <AccountsListingTableCard className="flex-1 min-h-0">
          {isLedgerStatementView && selectedNode && ledgerAccounting && (
            <CoaLedgerDetailHeader
              ledger={selectedNode}
              records={records}
              openingAmount={ledgerAccounting.openingBalance}
              openingSide={ledgerAccounting.openingBalanceType}
              closingAmount={ledgerAccounting.currentBalance}
              closingSide={ledgerAccounting.balanceType}
            />
          )}

          {ledgerListingSummary && (
            <CoaLedgerListingSummaryBar summary={ledgerListingSummary} />
          )}

          {summary && !isLedgerStatementView && !isAccountingGroupLedgerListing && (
            <CoaListingSummaryBar summary={summary} />
          )}

          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {isLedgerStatementView && selectedNode ? (
              datesReady && ledgerAccounting ? (
                <CoaLedgerDetailTable
                  rows={filteredTransactions}
                  footer={{
                    totalDebit: ledgerAccounting.totalDebit,
                    totalCredit: ledgerAccounting.totalCredit,
                    closingBalance: ledgerAccounting.currentBalance,
                    closingBalanceType: ledgerAccounting.balanceType,
                  }}
                />
              ) : (
                <div className="flex flex-1 items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">Loading ledger transactions…</p>
                </div>
              )
            ) : isAccountingGroupLedgerListing ? (
              <CoaListingTable
                variant="ledger"
                ledgerRows={ledgerListingRows}
                highlightedLedgerId={highlightedLedgerId}
                isSearchMode={Boolean(contentSearch.trim())}
                onDrillInto={handleDrillInto}
                emptyMessage={
                  contentSearch.trim()
                    ? "No ledgers match your search."
                    : "No ledgers under this accounting group."
                }
              />
            ) : (
              <CoaListingTable
                rows={listingRows}
                records={records}
                canCreate={canCreate}
                highlightedLedgerId={highlightedLedgerId}
                isSearchMode={Boolean(contentSearch.trim())}
                onDrillInto={handleDrillInto}
                onAddLedger={requestCoaAddLedger}
                emptyMessage={
                  contentSearch.trim()
                    ? "No accounts match your search."
                    : isGroupingLedgerView
                      ? "No child ledgers under this group."
                      : "No accounts at this level."
                }
              />
            )}
          </div>

          <div className="flex-shrink-0 px-4 py-2 border-t border-border bg-muted/20">
            <p className="text-xs text-muted-foreground">
              {isLedgerStatementView && selectedNode ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-foreground">
                    {filteredTransactions.filter((row) => !row.isOpeningRow).length}
                  </span>{" "}
                  transactions for{" "}
                  <span className="font-medium text-foreground">{selectedNode.accountName}</span>
                  {contentSearch.trim() ? (
                    <>
                      {" "}
                      matching &ldquo;{contentSearch.trim()}&rdquo;
                    </>
                  ) : null}
                </>
              ) : isAccountingGroupLedgerListing ? (
                <>
                  Showing{" "}
                  <span className="font-medium text-foreground">{ledgerListingRows.length}</span>{" "}
                  {contentSearch.trim() ? (
                    <>ledgers matching &ldquo;{contentSearch.trim()}&rdquo;</>
                  ) : (
                    <>
                      ledgers under{" "}
                      <span className="font-medium text-foreground">
                        {selectedNode?.accountName}
                      </span>
                    </>
                  )}
                </>
              ) : (
                <>
                  Showing <span className="font-medium text-foreground">{listingRows.length}</span>{" "}
                  {contentSearch.trim() ? (
                    <>matching accounts for &ldquo;{contentSearch.trim()}&rdquo;</>
                  ) : (
                    <>
                      accounts
                      {selectedNode && !showRoot && (
                        <>
                          {" "}
                          under{" "}
                          <span className="font-medium text-foreground">
                            {selectedNode.accountName}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </p>
          </div>
          </AccountsListingTableCard>
        </div>
      </AccountsPageShell>
    </>
  );
}

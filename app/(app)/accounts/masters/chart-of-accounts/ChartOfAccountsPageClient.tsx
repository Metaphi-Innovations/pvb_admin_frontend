"use client";

import React, { useCallback, useEffect, useMemo, useState, useDeferredValue } from "react";
import dynamic from "next/dynamic";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { CoaListingToolbar } from "./components/CoaListingToolbar";
import { useCoaNavigation } from "@/components/accounts/CoaNavigationContext";
import { isGroupingLedger, isPostingLedger } from "@/lib/accounts/coa-hierarchy";
import { buildCoaLedgerDetailSummary } from "./coa-demo-accounting";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { defaultLedgerDateRangeState } from "@/lib/accounts/ledger-transaction-date-filter";
import { type DateRangePresetId } from "@/lib/accounts/report-date-presets";
import { isTdsCoaNode } from "@/lib/accounts/tds-coa-utils";
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
  showCoaMaxHierarchyMessage,
} from "./chart-of-accounts-data";
import { CHART_OF_ACCOUNTS_LIST_PATH } from "./chart-of-accounts-utils";
import {
  buildCoaLedgerListingRows,
  buildCoaListingRows,
  computeCoaLedgerListingSummary,
  computeCoaListingSummary,
  computeCoaGroupDetailSummary,
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
import { requestCoaAddSubGroup } from "./coa-add-group-bridge";
import { registerSundryDebtorCustomerFormHandler } from "./coa-sundry-debtor-form-bridge";
import { registerSundryCreditorVendorFormHandler } from "./coa-sundry-creditor-form-bridge";
import { registerWarehouseFormHandler } from "./coa-warehouse-form-bridge";
import { registerTdsLedgerFormHandler } from "./coa-tds-form-bridge";
import {
  registerCoaMasterLinkedFormHandler,
  type CoaMasterLinkedFormKind,
} from "./coa-master-linked-form-bridge";
import { AccountsMasterLinkedLedgerForm } from "./components/AccountsMasterLinkedLedgerForm";
import { registerCoaBankFormHandler } from "./coa-bank-form-bridge";
import { CoaListingTable } from "./components/CoaListingTable";
import { CoaListingSummaryBar, CoaLedgerListingSummaryBar } from "./components/CoaListingSummaryBar";
import { CoaLedgerDetailTable } from "./components/CoaLedgerDetailTable";
import { CoaLedgerDetailHeader } from "./components/CoaLedgerDetailHeader";
import { useTransactionDetailsDrawer } from "@/components/accounts/TransactionDetailsDrawer";
import type { CoaLedgerDetailRow } from "./coa-demo-accounting";
import { CoaGroupDetailHeader } from "./components/CoaGroupDetailHeader";
import { CoaTdsLedgerDetailHeader } from "./components/CoaTdsLedgerDetailHeader";
import { CoaDrillDownEmptyState } from "./components/CoaDrillDownEmptyState";
import { CoaMaxHierarchyNotice } from "./components/CoaMaxHierarchyNotice";
import { computeLedgerCurrentBalance } from "../ledgers/ledgers-utils";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { ensureCoaPostingLedgerTransactionsOnPageLoad } from "@/lib/accounts/coa-ledger-transactions-seed";

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

const AccountsTdsLedgerFormClient = dynamic(
  () => import("./tds/new/AccountsTdsLedgerFormClient"),
  { ssr: false },
);

const BankAccountFormClient = dynamic(
  () => import("../../banking/bank-accounts/BankAccountFormClient"),
  { ssr: false },
);

const HIGHLIGHT_MS = 4000;

/** Ledger detail view for posting ledgers only (TDS and bank name containers excluded). */
function isCoaLedgerDetailView(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (!isPostingLedger(node, records)) return false;
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
  const ledgerDataTick = useAccountsSectionRefresh([
    "ledgers",
    "receipt-vouchers",
    "payment-vouchers",
    "contra-vouchers",
    "journal-vouchers",
  ]);

  const [showRoot, setShowRoot] = useState(false);
  const [contentSearch, setContentSearch] = useState("");
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datesReady, setDatesReady] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [sundryDebtorFormParentId, setSundryDebtorFormParentId] = useState<number | null>(null);
  const [sundryCreditorFormParentId, setSundryCreditorFormParentId] = useState<number | null>(null);
  const [warehouseFormParentId, setWarehouseFormParentId] = useState<number | null>(null);
  const [tdsFormParentId, setTdsFormParentId] = useState<number | null>(null);
  const [masterLinkedForm, setMasterLinkedForm] = useState<{
    kind: CoaMasterLinkedFormKind;
    parentGroupId: number;
  } | null>(null);
  const [bankFormParentId, setBankFormParentId] = useState<number | null>(null);

  const canCreate = useCanCoa("create");
  const canEdit = useCanCoa("edit");
  const { openTransaction, drawer: voucherDetailDrawer } = useTransactionDetailsDrawer();

  const handleLedgerStatementVoucherClick = useCallback((row: CoaLedgerDetailRow) => {
    if (row.isOpeningRow) return;
    openTransaction({ type: "general_ledger", row });
  }, [openTransaction]);

  useEffect(() => {
    ensureCoaPostingLedgerTransactionsOnPageLoad();
  }, []);

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
    registerTdsLedgerFormHandler((parentGroupId) => {
      setTdsFormParentId(parentGroupId);
    });
    registerCoaMasterLinkedFormHandler((kind, parentGroupId) => {
      setMasterLinkedForm({ kind, parentGroupId });
    });
    registerCoaBankFormHandler(setBankFormParentId);
    return () => {
      registerSundryDebtorCustomerFormHandler(null);
      registerSundryCreditorVendorFormHandler(null);
      registerWarehouseFormHandler(null);
      registerTdsLedgerFormHandler(null);
      registerCoaMasterLinkedFormHandler(null);
      registerCoaBankFormHandler(null);
    };
  }, []);

  const isLedgerStatementView = Boolean(
    !showRoot && selectedNode && isCoaLedgerDetailView(selectedNode, records),
  );

  const isAccountingGroupLedgerListing = Boolean(
    !showRoot && selectedNode && isAccountingGroupNode(selectedNode, records),
  );

  const isGroupView = Boolean(
    !showRoot && selectedNode && selectedNode.nodeLevel === "account_group",
  );

  const showEmptyState = !showRoot && !selectedNode;

  const isGroupingLedgerView = Boolean(
    !showRoot &&
      selectedNode &&
      selectedNode.nodeLevel === "ledger" &&
      isGroupingLedger(selectedNode, records),
  );

  const isTdsLedgerSummaryView = Boolean(
    !showRoot &&
      selectedNode &&
      selectedNode.nodeLevel === "ledger" &&
      isTdsCoaNode(selectedNode, records),
  );

  const tdsLedgerBalance = useMemo(() => {
    if (!isTdsLedgerSummaryView || !selectedNode) return null;
    return computeLedgerCurrentBalance(selectedNode);
  }, [isTdsLedgerSummaryView, selectedNode, ledgerDataTick]);

  const groupDetailSummary = useMemo(() => {
    if (!isGroupView || !selectedNode || !datesReady) return null;
    return computeCoaGroupDetailSummary(deferredRecords, selectedNode.id, dateFrom, dateTo);
  }, [isGroupView, selectedNode, deferredRecords, dateFrom, dateTo, datesReady, ledgerDataTick]);
  /** Parent whose immediate children are shown in the hierarchy listing table */
  const tableParentId =
    showEmptyState || isLedgerStatementView || isAccountingGroupLedgerListing
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

  /** Dismiss full-page add forms when the user picks another node in the COA tree. */
  useEffect(() => {
    setSundryDebtorFormParentId(null);
    setSundryCreditorFormParentId(null);
    setWarehouseFormParentId(null);
    setTdsFormParentId(null);
    setMasterLinkedForm(null);
    setBankFormParentId(null);
  }, [selectedNode?.id]);

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
  }, [
    isLedgerStatementView,
    selectedNode,
    deferredRecords,
    dateFrom,
    dateTo,
    datesReady,
    ledgerDataTick,
  ]);

  const ledgerDataReady =
    Boolean(selectedNode) &&
    Boolean(ledgerAccounting) &&
    ledgerAccounting!.ledgerId === selectedNode!.id;

  const filteredTransactions = useMemo(() => {
    if (!ledgerAccounting || !ledgerDataReady || !selectedNode) return [];
    if (ledgerAccounting.ledgerId !== selectedNode.id) return [];
    return filterLedgerStatementRows(ledgerAccounting.transactions, contentSearch);
  }, [ledgerAccounting, ledgerDataReady, selectedNode, contentSearch]);

  const ledgerListingRows = useMemo(() => {
    if (!selectedNode || !isAccountingGroupLedgerListing) return [];
    const rows = buildCoaLedgerListingRows(deferredRecords, selectedNode.id, {
      search: contentSearch,
    });
    return rows;
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
    ledgerDataTick,
  ]);

  const ledgerListingSummary = useMemo(() => {
    if (!isAccountingGroupLedgerListing) return null;
    return computeCoaLedgerListingSummary(ledgerListingRows);
  }, [ledgerListingRows, isAccountingGroupLedgerListing]);

  const summary = useMemo(() => {
    if (!datesReady || isAccountingGroupLedgerListing) return null;

    if (ledgerAccounting && ledgerDataReady) {
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
    ledgerDataReady,
    filteredTransactions,
    isAccountingGroupLedgerListing,
    ledgerDataTick,
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
          index < path.length - 1 && node.nodeLevel !== "primary_head"
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

  const exportDisabled =
    exporting ||
    (isLedgerStatementView
      ? filteredTransactions.length === 0
      : isAccountingGroupLedgerListing
        ? ledgerListingRows.length === 0
        : listingRows.length === 0);

  const handleNewLedger = useCallback(() => {
    const parentId =
      selectedNode &&
      !showRoot &&
      canAddLedgerUnder(selectedNode, records)
        ? selectedNode.id
        : null;
    if (parentId == null) return;
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

  const handleTdsLedgerSaved = useCallback(
    (ledgerId: number, parentId: number | null) => {
      handlePartyLedgerSaved(ledgerId, parentId, () => setTdsFormParentId(null));
    },
    [handlePartyLedgerSaved],
  );

  const newLedgerLabel = useMemo(() => "Add Ledger", []);

  const showMaxHierarchyNotice = Boolean(
    canCreate &&
      selectedNode &&
      !showRoot &&
      !showEmptyState &&
      showCoaMaxHierarchyMessage(selectedNode, records),
  );

  /** Add Ledger only when a Level 3 Sub Group is selected. */
  const canShowNewLedger =
    canCreate &&
    !isLedgerStatementView &&
    !showEmptyState &&
    !showMaxHierarchyNotice &&
    Boolean(selectedNode) &&
    !showRoot &&
    canAddLedgerUnder(selectedNode!, records);

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

  if (tdsFormParentId != null) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <AccountsTdsLedgerFormClient
          parentGroupId={tdsFormParentId}
          onClose={() => setTdsFormParentId(null)}
          onSaved={handleTdsLedgerSaved}
        />
      </div>
    );
  }

  if (masterLinkedForm) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <AccountsMasterLinkedLedgerForm
          kind={masterLinkedForm.kind}
          parentGroupId={masterLinkedForm.parentGroupId}
          onClose={() => setMasterLinkedForm(null)}
          onSaved={(ledgerId, parentId) =>
            handlePartyLedgerSaved(ledgerId, parentId, () => setMasterLinkedForm(null))
          }
        />
      </div>
    );
  }

  if (bankFormParentId != null) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <BankAccountFormClient
          presetGroupId={bankFormParentId}
          onClose={() => setBankFormParentId(null)}
          onSaved={(ledgerId, parentId) =>
            handlePartyLedgerSaved(ledgerId, parentId, () => setBankFormParentId(null))
          }
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
          {!showEmptyState && (
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
          )}

          {showMaxHierarchyNotice && <CoaMaxHierarchyNotice />}

          <AccountsListingTableCard className="flex-1 min-h-0">
          {showEmptyState ? (
            <CoaDrillDownEmptyState />
          ) : (
            <>
          {isLedgerStatementView && selectedNode && ledgerDataReady && ledgerAccounting && (
            <CoaLedgerDetailHeader
              ledger={selectedNode}
              records={records}
              openingAmount={ledgerAccounting.openingBalance}
              openingSide={ledgerAccounting.openingBalanceType}
              closingAmount={ledgerAccounting.currentBalance}
              closingSide={ledgerAccounting.balanceType}
              canEdit={canEdit}
            />
          )}

          {groupDetailSummary && <CoaGroupDetailHeader summary={groupDetailSummary} />}

          {isTdsLedgerSummaryView && selectedNode && tdsLedgerBalance && (
            <CoaTdsLedgerDetailHeader
              ledger={selectedNode}
              records={records}
              currentAmount={tdsLedgerBalance.amount}
              currentSide={tdsLedgerBalance.balanceType}
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
              datesReady && ledgerDataReady ? (
                <CoaLedgerDetailTable
                  rows={filteredTransactions}
                  onVoucherClick={handleLedgerStatementVoucherClick}
                  footer={{
                    totalDebit: ledgerAccounting!.totalDebit,
                    totalCredit: ledgerAccounting!.totalCredit,
                    closingBalance: ledgerAccounting!.currentBalance,
                    closingBalanceType: ledgerAccounting!.balanceType,
                  }}
                  emptyLabel="No transactions found for this ledger."
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
                onAddSubGroup={requestCoaAddSubGroup}
                canEdit={canEdit}
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
              {showEmptyState ? (
                <>Use the sidebar tree to browse the chart of accounts.</>
              ) : isLedgerStatementView && selectedNode ? (
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
            </>
          )}
          </AccountsListingTableCard>
        </div>
      </AccountsPageShell>
      {voucherDetailDrawer}
    </>
  );
}

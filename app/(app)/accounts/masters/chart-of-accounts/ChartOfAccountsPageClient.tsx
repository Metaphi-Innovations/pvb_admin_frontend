"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useFY } from "@/lib/fy-store";
import { useClientMounted } from "@/lib/use-client-mounted";
import { ACCOUNTS_HOME_HREF } from "@/lib/accounts/accounts-nav";
import { nextId } from "../../data";
import type { ChartOfAccount } from "../../data";
import {
  DEFAULT_LEDGER_FORM,
  canAddLedgerUnder,
  defaultBalanceTypeForParent,
  formToLedger,
  generateLedgerCode,
  getAncestorPath,
  saveChartOfAccounts,
  validateLedgerForm,
  type LedgerFormValues,
} from "./chart-of-accounts-data";
import { CHART_OF_ACCOUNTS_LIST_PATH } from "./chart-of-accounts-utils";
import { buildCoaListingRows, computeCoaListingSummary } from "./coa-listing-data";
import {
  exportCoaLedgerStatementToExcel,
  exportCoaLedgerStatementToPdf,
  exportCoaListingToExcel,
  exportCoaListingToPdf,
} from "./coa-export";
import { filterLedgerStatementRows } from "./coa-ledger-utils";
import { registerCoaAddLedgerHandler } from "./coa-add-ledger-bridge";
import { CoaListingTable } from "./components/CoaListingTable";
import { CoaListingSummaryBar } from "./components/CoaListingSummaryBar";
import { CoaLedgerDetailTable } from "./components/CoaLedgerDetailTable";
import { CoaLedgerDetailHeader } from "./components/CoaLedgerDetailHeader";
import { CoaPathBreadcrumb } from "./components/CoaPathBreadcrumb";
import { LedgerSheet } from "./components/LedgerSheet";

const HIGHLIGHT_MS = 4000;

/** Leaf posting ledger — show statement, not sibling listing. */
function isLeafPostingLedger(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (node.nodeLevel !== "ledger") return false;
  if (isTdsCoaNode(node, records)) return false;
  return isPostingLedger(node, records);
}

export default function ChartOfAccountsPageClient() {
  const mounted = useClientMounted();
  const { selectedFY } = useFY();
  const {
    records,
    setRecords,
    selectedNode,
    selectNode,
    refreshRecords,
    highlightedLedgerId,
    setHighlightedLedgerId,
    ensureExpanded,
  } = useCoaNavigation();

  const [showRoot, setShowRoot] = useState(false);
  const [contentSearch, setContentSearch] = useState("");
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datesReady, setDatesReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<LedgerFormValues>(DEFAULT_LEDGER_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState("");

  const canCreate = useCanCoa("create");

  const isLedgerStatementView = Boolean(
    !showRoot && selectedNode && isLeafPostingLedger(selectedNode, records),
  );

  const isGroupingLedgerView = Boolean(
    !showRoot &&
      selectedNode &&
      selectedNode.nodeLevel === "ledger" &&
      isGroupingLedger(selectedNode, records),
  );

  /** Parent whose immediate children are shown in the group listing table */
  const tableParentId = showRoot || isLedgerStatementView ? null : (selectedNode?.id ?? null);

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
    return buildCoaLedgerDetailSummary(selectedNode, records, dateFrom, dateTo);
  }, [isLedgerStatementView, selectedNode, records, dateFrom, dateTo, datesReady]);

  const filteredTransactions = useMemo(() => {
    if (!ledgerAccounting) return [];
    return filterLedgerStatementRows(ledgerAccounting.transactions, contentSearch);
  }, [ledgerAccounting, contentSearch]);

  const listingRows = useMemo(() => {
    if (!datesReady || isLedgerStatementView) return [];
    return buildCoaListingRows(records, tableParentId, dateFrom, dateTo, {
      search: contentSearch,
    });
  }, [records, tableParentId, dateFrom, dateTo, contentSearch, datesReady, isLedgerStatementView]);

  const summary = useMemo(() => {
    if (!datesReady) return null;

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
  ]);

  const pageBreadcrumbs = useMemo(() => {
    const base = [
      { label: "Accounts", href: ACCOUNTS_HOME_HREF },
      { label: "Chart of Accounts", href: CHART_OF_ACCOUNTS_LIST_PATH },
    ];
    if (showRoot || !selectedNode) return base;
    const path = getAncestorPath(records, selectedNode.id);
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

  const openAddLedger = useCallback(
    (parentGroupId: number) => {
      const parent = records.find((r) => r.id === parentGroupId);
      if (!parent || !canAddLedgerUnder(parent, records)) return;
      setForm({
        ...DEFAULT_LEDGER_FORM,
        parentGroupId,
        balanceType: defaultBalanceTypeForParent(records, parentGroupId),
      });
      setPreviewCode(generateLedgerCode(records));
      setFormError(null);
      setSheetOpen(true);
    },
    [records],
  );

  const openGlobalAddLedger = useCallback(
    (preferredParentId?: number | null) => {
      const parentGroupId = preferredParentId ?? null;
      setForm({
        ...DEFAULT_LEDGER_FORM,
        ...(parentGroupId != null
          ? {
              parentGroupId,
              balanceType: defaultBalanceTypeForParent(records, parentGroupId),
            }
          : {}),
      });
      setPreviewCode(generateLedgerCode(records));
      setFormError(null);
      setSheetOpen(true);
    },
    [records],
  );

  useEffect(() => {
    registerCoaAddLedgerHandler(openAddLedger);
    return () => registerCoaAddLedgerHandler(null);
  }, [openAddLedger]);

  const closeSheet = () => {
    setSheetOpen(false);
    setFormError(null);
  };

  const handleSave = () => {
    const err = validateLedgerForm(form, records);
    if (err) {
      setFormError(err);
      return;
    }

    const list = [...records];
    const code = generateLedgerCode(list);
    const row = formToLedger(form, nextId(list), code, list);
    list.push(row);
    saveChartOfAccounts(list);
    setRecords(list);

    if (row.parentAccountId) {
      const parent = list.find((r) => r.id === row.parentAccountId);
      if (parent) {
        const ancestorIds = getAncestorPath(list, parent.id).map((a) => a.id);
        ensureExpanded([...ancestorIds, parent.id]);
        selectNode(parent);
      }
    }

    setHighlightedLedgerId(row.id);
    closeSheet();
  };

  const handleDrillInto = useCallback(
    (node: ChartOfAccount) => {
      const ancestorIds = getAncestorPath(records, node.id).map((a) => a.id);
      ensureExpanded(ancestorIds);
      selectNode(node);
    },
    [selectNode, records, ensureExpanded],
  );

  const handleBreadcrumbRoot = () => {
    setShowRoot(true);
    setContentSearch("");
  };

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
    } else if (listingRows.length > 0) {
      exportCoaListingToPdf(listingRows, exportMeta);
    }
  };

  const handleNewLedger = useCallback(() => {
    const parentId =
      selectedNode && !showRoot && canAddLedgerUnder(selectedNode, records)
        ? selectedNode.id
        : null;
    openGlobalAddLedger(parentId);
  }, [selectedNode, showRoot, records, openGlobalAddLedger]);

  const exportDisabled =
    exporting ||
    (isLedgerStatementView
      ? filteredTransactions.length === 0
      : listingRows.length === 0);

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
                : "Search accounts in this view…"
            }
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onExcel={handleExcelExport}
            onPdf={handlePdfExport}
            exportDisabled={exportDisabled}
            canCreate={canCreate}
            onNewLedger={handleNewLedger}
          />

          <AccountsListingTableCard className="flex-1 min-h-0">
          <CoaPathBreadcrumb
            records={records}
            selectedNode={selectedNode}
            showRoot={showRoot}
            onSelectRoot={handleBreadcrumbRoot}
            onSelectNode={(node) => {
              setShowRoot(false);
              selectNode(node);
            }}
          />

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

          {summary && !isLedgerStatementView && (
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
            ) : (
              <CoaListingTable
                rows={listingRows}
                records={records}
                canCreate={canCreate}
                highlightedLedgerId={highlightedLedgerId}
                isSearchMode={Boolean(contentSearch.trim())}
                onDrillInto={handleDrillInto}
                onAddLedger={openAddLedger}
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
            <p className="text-[11px] text-muted-foreground">
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

      <LedgerSheet
        open={sheetOpen}
        mode="add"
        form={form}
        formError={formError}
        previewCode={previewCode}
        records={records}
        active={null}
        onClose={closeSheet}
        onSave={handleSave}
        onFormChange={(next) => {
          setForm(next);
          if (next.parentGroupId) setFormError(null);
        }}
        canEdit={canCreate}
        compactAdd
      />
    </>
  );
}

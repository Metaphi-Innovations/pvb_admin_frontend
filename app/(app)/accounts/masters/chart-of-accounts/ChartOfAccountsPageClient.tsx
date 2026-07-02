"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { CoaListingToolbar } from "./components/CoaListingToolbar";
import { useCoaNavigation } from "@/components/accounts/CoaNavigationContext";
import { canCoa } from "@/lib/accounts/permissions";
import { resolveDateRangePreset, type DateRangePresetId } from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { nextId } from "../../data";
import type { ChartOfAccount } from "../../data";
import {
  DEFAULT_LEDGER_FORM,
  canAddLedgerUnder,
  defaultBalanceTypeForParent,
  formToLedger,
  generateLedgerCode,
  getAncestorPath,
  purgeManualCoaLedgersOnce,
  saveChartOfAccounts,
  validateLedgerForm,
  type LedgerFormValues,
} from "./chart-of-accounts-data";
import { CHART_OF_ACCOUNTS_BREADCRUMB } from "./chart-of-accounts-utils";
import { buildCoaListingRows, computeCoaListingSummary } from "./coa-listing-data";
import { exportCoaListingToExcel, exportCoaListingToPdf } from "./coa-export";
import { registerCoaAddLedgerHandler } from "./coa-add-ledger-bridge";
import { CoaListingTable } from "./components/CoaListingTable";
import { CoaListingSummaryBar } from "./components/CoaListingSummaryBar";
import { CoaPathBreadcrumb } from "./components/CoaPathBreadcrumb";
import { LedgerSheet } from "./components/LedgerSheet";

const PLACEHOLDER_DATE = "2025-04-01";
const HIGHLIGHT_MS = 4000;

export default function ChartOfAccountsPageClient() {
  const mounted = useClientMounted();
  const {
    records,
    setRecords,
    selectedNode,
    selectNode,
    search,
    setSearch,
    refreshRecords,
    highlightedLedgerId,
    setHighlightedLedgerId,
    ensureExpanded,
  } = useCoaNavigation();

  const [showRoot, setShowRoot] = useState(false);
  const [preset, setPreset] = useState<DateRangePresetId>("this_month");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<LedgerFormValues>(DEFAULT_LEDGER_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [previewCode, setPreviewCode] = useState("");

  const canCreate = canCoa("create");

  /** Parent whose immediate children are shown in the main table */
  const tableParentId = showRoot ? null : (selectedNode?.id ?? null);

  useEffect(() => {
    if (purgeManualCoaLedgersOnce()) {
      refreshRecords();
    }
  }, [refreshRecords]);

  useEffect(() => {
    const { from, to } = resolveDateRangePreset("this_month");
    setDateFrom(from);
    setDateTo(to);
    setDatesReady(true);
  }, []);

  useEffect(() => {
    if (selectedNode) setShowRoot(false);
  }, [selectedNode]);

  useEffect(() => {
    if (!highlightedLedgerId) return;
    const timer = window.setTimeout(() => setHighlightedLedgerId(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlightedLedgerId, setHighlightedLedgerId]);

  const rows = useMemo(
    () =>
      datesReady
        ? buildCoaListingRows(records, tableParentId, dateFrom, dateTo, { search })
        : [],
    [records, tableParentId, dateFrom, dateTo, search, datesReady],
  );

  const summary = useMemo(
    () =>
      datesReady
        ? computeCoaListingSummary(
            records,
            rows,
            selectedNode,
            showRoot,
            dateFrom,
            dateTo,
            Boolean(search.trim()),
          )
        : null,
    [records, rows, selectedNode, showRoot, dateFrom, dateTo, search, datesReady],
  );

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
    setSearch("");
  };

  const handleExcelExport = async () => {
    if (!mounted || rows.length === 0) return;
    setExporting(true);
    try {
      await exportCoaListingToExcel(rows, exportMeta);
    } finally {
      setExporting(false);
    }
  };

  const handlePdfExport = () => {
    if (!mounted || rows.length === 0) return;
    exportCoaListingToPdf(rows, exportMeta);
  };

  const handleNewLedger = useCallback(() => {
    const parentId =
      selectedNode && !showRoot && canAddLedgerUnder(selectedNode, records)
        ? selectedNode.id
        : null;
    openGlobalAddLedger(parentId);
  }, [selectedNode, showRoot, records, openGlobalAddLedger]);

  return (
    <>
      <AccountsPageShell
        layout="split"
        hideDescription
        breadcrumbs={CHART_OF_ACCOUNTS_BREADCRUMB}
        title="Chart of Accounts"
        description="View account hierarchy and create ledgers under permitted groups."
        className="h-full"
      >
        <div className="flex flex-col flex-1 min-h-0 border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <CoaListingToolbar
            search={search}
            onSearchChange={setSearch}
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onExcel={handleExcelExport}
            onPdf={handlePdfExport}
            exportDisabled={exporting || rows.length === 0}
            canCreate={canCreate}
            onNewLedger={handleNewLedger}
          />

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

          {summary && <CoaListingSummaryBar summary={summary} />}

          <div className="flex-1 min-h-0 overflow-hidden">
            <CoaListingTable
              rows={rows}
              records={records}
              canCreate={canCreate}
              highlightedLedgerId={highlightedLedgerId}
              onDrillInto={handleDrillInto}
              onAddLedger={openAddLedger}
              emptyMessage={
                search.trim()
                  ? "No accounts match your search at this level."
                  : "No accounts at this level."
              }
            />
          </div>

          <div className="flex-shrink-0 px-4 py-2 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{rows.length}</span> accounts
              {selectedNode && !showRoot && (
                <>
                  {" "}
                  under{" "}
                  <span className="font-medium text-foreground">{selectedNode.accountName}</span>
                </>
              )}
            </p>
          </div>
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

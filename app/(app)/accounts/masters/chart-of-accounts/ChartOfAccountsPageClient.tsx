"use client";

import React, { useCallback, useEffect, useMemo, useState, useDeferredValue } from "react";
import dynamic from "next/dynamic";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import { CoaListingToolbar } from "./components/CoaListingToolbar";
import { useCoaNavigation } from "@/components/accounts/CoaNavigationContext";
import { isGroupingLedger, isPostingLedger } from "@/lib/accounts/coa-hierarchy";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { defaultLedgerDateRangeState } from "@/lib/accounts/ledger-transaction-date-filter";
import { type DateRangePresetId } from "@/lib/accounts/report-date-presets";
import { isTdsCoaNode } from "@/lib/accounts/tds-coa-utils";
import {
  isStatutoryTaxPayableParent,
  isStatutoryTaxSectionProjection,
} from "@/lib/accounts/coa-statutory-tax-display";
import {
  getCoaDisplayPath,
} from "@/lib/accounts/coa-tree-children";
import { useFY } from "@/lib/fy-store";
import { useClientMounted } from "@/lib/use-client-mounted";
import { ACCOUNTS_HOME_HREF } from "@/lib/accounts/accounts-nav";
import { resolveCoaAddActionLabel, isAddLedgerBlocked } from "@/lib/accounts/coa-add-ledger-policy";
import type { ChartOfAccount, CoaNodeId } from "../../data";
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
import { registerCoaEditLedgerHandler } from "./coa-edit-ledger-bridge";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  chartOfAccountsKeys,
} from "@/hooks/accounts/use-chart-of-accounts";
import {
  LedgerService,
  type LedgerDetailDto,
  type LedgerOpeningBalanceDto,
} from "@/services/ledger.service";
import { ChartOfAccountsService } from "@/services/chart-of-accounts.service";
import { mapCoaApiTreeToRecords } from "@/lib/accounts/coa-api-mapper";
import { dispatchCoaChanged } from "@/lib/accounts/coa-events";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** Ledger statement summary from API-backed COA records (no localStorage voucher demo). */
function resolveLedgerOpeningBalance(
  detail: LedgerDetailDto,
  financialYearId?: string,
): LedgerOpeningBalanceDto | null {
  if (financialYearId) {
    const match = detail.openingBalances?.find(
      (row) => row.financialYearId === financialYearId,
    );
    if (match) return match;
  }
  return detail.openingBalance ?? detail.openingBalances?.[0] ?? null;
}

function buildApiLedgerDetailSummary(
  ledger: ChartOfAccount,
  detail?: any,
) {
  const openingBalance = detail?.openingBalance;
  const parsedOpeningAmount =
    openingBalance?.amount != null
      ? Number(openingBalance.amount)
      : ledger.openingBalance ?? 0;
  const openingAmount = Number.isFinite(parsedOpeningAmount) ? parsedOpeningAmount : 0;
  const openingSide =
    String(openingBalance?.balanceType ?? ledger.balanceType ?? "DEBIT").toUpperCase() ===
    "CREDIT"
      ? ("Credit" as const)
      : ("Debit" as const);

  const transactions = (detail?.transactions || []).map((t: any) => ({
    ...t,
    isOpeningRow: false,
  }));

  return {
    ledgerId: ledger.id,
    openingBalance: openingAmount,
    openingBalanceType: openingSide,
    currentBalance: detail?.currentBalance ?? openingAmount,
    balanceType: detail?.balanceType === "Credit" ? ("Credit" as const) : ("Debit" as const),
    totalDebit: detail?.totalDebit ?? 0,
    totalCredit: detail?.totalCredit ?? 0,
    transactions: transactions as CoaLedgerDetailRow[],
  };
}

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
  () => import("../../banking/bank-accounts/BankAccountFormClientLocal"),
  { ssr: false },
);

const HIGHLIGHT_MS = 4000;

/** Ledger detail view for posting ledgers only (TDS/TCS statutory nodes excluded). */
function isCoaLedgerDetailView(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (!isPostingLedger(node, records)) return false;
  if (isTdsCoaNode(node, records)) return false;
  if (isStatutoryTaxPayableParent(node)) return false;
  if (isStatutoryTaxSectionProjection(node)) return false;
  return true;
}

export default function ChartOfAccountsPageClient() {
  const mounted = useClientMounted();
  const { selectedFY } = useFY();
  const {
    records,
    selectedNode,
    selectNode,
    highlightedLedgerId,
    setHighlightedLedgerId,
    ensureExpanded,
    refreshRecords,
  } = useCoaNavigation();

  const deferredRecords = useDeferredValue(records);
  const ledgerDataTick = useAccountsSectionRefresh([
    "ledgers",
    "receipt-vouchers",
    "payment-vouchers",
    "contra-vouchers",
    "journal-vouchers",
  ]);
  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [datesReady, setDatesReady] = useState(false);

  const { data: selectedLedgerDetail } = useQuery({
    queryKey: [
      "accounts",
      "chart-of-accounts",
      "selected-ledger-detail",
      selectedNode?.apiNodeId ?? selectedNode?.id ?? null,
      dateFrom,
      dateTo,
      ledgerDataTick,
    ],
    enabled: Boolean(selectedNode && isCoaLedgerDetailView(selectedNode, records) && datesReady),
    queryFn: async () => {
      if (!selectedNode) return null;
      const [detail, currentFy] = await Promise.all([
        LedgerService.view(
          selectedNode.apiNodeId ?? String(selectedNode.id),
          { dateFrom, dateTo }
        ),
        LedgerService.getCurrentFinancialYear(),
      ]);
      return {
        detail,
        openingBalance: resolveLedgerOpeningBalance(
          detail,
          currentFy?.financialYearId,
        ),
      };
    },
  });

  const [showRoot, setShowRoot] = useState(false);
  const [contentSearch, setContentSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [sundryDebtorFormParentId, setSundryDebtorFormParentId] = useState<CoaNodeId | null>(null);
  const [sundryDebtorEditCustomerId, setSundryDebtorEditCustomerId] = useState<
    string | number | undefined
  >(undefined);
  const [sundryCreditorFormParentId, setSundryCreditorFormParentId] = useState<CoaNodeId | null>(null);
  const [sundryCreditorEditVendorId, setSundryCreditorEditVendorId] = useState<
    string | number | undefined
  >(undefined);
  const [warehouseFormParentId, setWarehouseFormParentId] = useState<CoaNodeId | null>(null);
  const [tdsFormParentId, setTdsFormParentId] = useState<CoaNodeId | null>(null);
  const [masterLinkedForm, setMasterLinkedForm] = useState<{
    kind: CoaMasterLinkedFormKind;
    parentGroupId: CoaNodeId;
  } | null>(null);
  const [bankFormParentId, setBankFormParentId] = useState<CoaNodeId | null>(null);
  const [bankFormEditAccountId, setBankFormEditAccountId] = useState<number | undefined>(
    undefined,
  );

  const canCreate = useCanCoa("create");
  const canEdit = useCanCoa("edit");
  const queryClient = useQueryClient();

  // Delete ledger state
  const [ledgerDeleteTarget, setLedgerDeleteTarget] = useState<ChartOfAccount | null>(null);
  const [ledgerDeleteError, setLedgerDeleteError] = useState<string | null>(null);
  const [ledgerDeleting, setLedgerDeleting] = useState(false);
  const { openTransaction, drawer: voucherDetailDrawer } = useTransactionDetailsDrawer();

  const handleLedgerStatementVoucherClick = useCallback((row: CoaLedgerDetailRow) => {
    if (row.isOpeningRow) return;
    openTransaction({ type: "general_ledger", row });
  }, [openTransaction]);

  useEffect(() => {
    registerSundryDebtorCustomerFormHandler(({ parentGroupId, customerId }) => {
      const list = records.length > 0 ? records : [];
      const parent = list.find((r) => r.id === parentGroupId);
      // Open form first so the selection-dismiss effect keeps it when parent is selected.
      setSundryDebtorEditCustomerId(customerId);
      setSundryDebtorFormParentId(parentGroupId);
      if (parent) {
        const ancestorIds = getAncestorPath(list, parent.id).map((a) => a.id);
        ensureExpanded([...ancestorIds, parent.id]);
        selectNode(parent);
      }
    });
    registerSundryCreditorVendorFormHandler(({ parentGroupId, vendorId }) => {
      const list = records.length > 0 ? records : [];
      const parent = list.find((r) => r.id === parentGroupId);
      // Open form first so the selection-dismiss effect keeps it when parent is selected.
      setSundryCreditorEditVendorId(vendorId);
      setSundryCreditorFormParentId(parentGroupId);
      if (parent) {
        const ancestorIds = getAncestorPath(list, parent.id).map((a) => a.id);
        ensureExpanded([...ancestorIds, parent.id]);
        selectNode(parent);
      }
    });
    registerWarehouseFormHandler((parentGroupId) => {
      setWarehouseFormParentId(parentGroupId);
    });
    registerTdsLedgerFormHandler((parentGroupId) => {
      const list = records.length > 0 ? records : [];
      const parent = list.find((r) => r.id === parentGroupId);
      // Statutory Duties & Taxes / TDS Payable / TCS Payable — no manual TDS children.
      if (parent && isAddLedgerBlocked(parent, list)) return;
      setTdsFormParentId(parentGroupId);
    });
    registerCoaMasterLinkedFormHandler((kind, parentGroupId) => {
      setMasterLinkedForm({ kind, parentGroupId });
    });
    registerCoaBankFormHandler(({ parentGroupId, accountId }) => {
      const list = records.length > 0 ? records : [];
      const parent = list.find((r) => r.id === parentGroupId);
      // Open form first so the selection-dismiss effect keeps it when parent is selected.
      setBankFormEditAccountId(accountId);
      setBankFormParentId(parentGroupId);
      if (parent) {
        const ancestorIds = getAncestorPath(list, parent.id).map((a) => a.id);
        ensureExpanded([...ancestorIds, parent.id]);
        selectNode(parent);
      }
    });
    registerCoaEditLedgerHandler((ledgerId) => {
      const list = records.length > 0 ? records : [];
      const ledger = list.find((r) => r.id === ledgerId);
      if (ledger && (ledger.masterType === "bank" || ledger.masterType === "BANK")) {
        const bankGroupId = ledger.parentAccountId;
        if (bankGroupId != null) {
          const parent = list.find((r) => r.id === bankGroupId);
          setBankFormEditAccountId(Number(ledger.masterId) || undefined);
          setBankFormParentId(bankGroupId);
          if (parent) {
            const ancestorIds = getAncestorPath(list, parent.id).map((a) => a.id);
            ensureExpanded([...ancestorIds, parent.id]);
            selectNode(parent);
          }
        }
      }
    });
    return () => {
      registerSundryDebtorCustomerFormHandler(null);
      registerSundryCreditorVendorFormHandler(null);
      registerWarehouseFormHandler(null);
      registerTdsLedgerFormHandler(null);
      registerCoaMasterLinkedFormHandler(null);
      registerCoaBankFormHandler(null);
      registerCoaEditLedgerHandler(null);
    };
  }, [records, ensureExpanded, selectNode]);

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
      (isGroupingLedger(selectedNode, records) || isStatutoryTaxPayableParent(selectedNode)),
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
    if (!selectedFY?.id) return;
    const { from, to, preset: initialPreset } = defaultLedgerDateRangeState(selectedFY);
    setPreset(initialPreset);
    setDateFrom(from);
    setDateTo(to);
    setDatesReady(true);
  }, [selectedFY]);

  useEffect(() => {
    if (selectedNode) setShowRoot(false);
  }, [selectedNode]);

  /** Dismiss full-page add forms when the user picks a different COA node.
   * Keep the form open when (re)selecting the same parent group being added under. */
  useEffect(() => {
    const id = selectedNode?.id;
    setSundryDebtorFormParentId((prev) =>
      prev != null && id !== prev ? null : prev,
    );
    setSundryCreditorFormParentId((prev) =>
      prev != null && id !== prev ? null : prev,
    );
    setWarehouseFormParentId((prev) =>
      prev != null && id !== prev ? null : prev,
    );
    setTdsFormParentId((prev) =>
      prev != null && id !== prev ? null : prev,
    );
    setMasterLinkedForm((prev) =>
      prev != null && id !== prev.parentGroupId ? null : prev,
    );
    setBankFormParentId((prev) =>
      prev != null && id !== prev ? null : prev,
    );
  }, [selectedNode?.id]);

  useEffect(() => {
    if (bankFormParentId == null) setBankFormEditAccountId(undefined);
  }, [bankFormParentId]);

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
    // Opening/closing from API COA tree only — do not mix localStorage voucher demos.
    return buildApiLedgerDetailSummary(
      selectedNode,
      selectedLedgerDetail?.detail,
    );
  }, [
    isLedgerStatementView,
    selectedNode,
    datesReady,
    selectedLedgerDetail,
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

  const { data: backendSearchResults } = useQuery({
    queryKey: [
      "accounts",
      "chart-of-accounts",
      "search-results",
      selectedNode?.apiNodeId ?? selectedNode?.id ?? null,
      contentSearch,
    ],
    enabled: Boolean(contentSearch.trim() && !isLedgerStatementView),
    queryFn: async ({ signal }) => {
      const parentId = selectedNode?.apiNodeId ?? selectedNode?.id;
      const tree = await ChartOfAccountsService.getTree({
        includeLedgers: true,
        search: contentSearch,
        ...(parentId ? { parentId: String(parentId) } : {}),
        signal,
      });
      return mapCoaApiTreeToRecords(tree);
    },
  });

  const effectiveRecords = contentSearch.trim() ? (backendSearchResults ?? []) : deferredRecords;

  const ledgerListingRows = useMemo(() => {
    if (!selectedNode || !isAccountingGroupLedgerListing) return [];
    const rows = buildCoaLedgerListingRows(effectiveRecords, selectedNode.id, {
      search: contentSearch,
    });
    return rows;
  }, [effectiveRecords, selectedNode, contentSearch, isAccountingGroupLedgerListing]);

  const listingRows = useMemo(() => {
    if (!datesReady || isLedgerStatementView || isAccountingGroupLedgerListing) return [];
    return buildCoaListingRows(effectiveRecords, tableParentId, dateFrom, dateTo, {
      search: contentSearch,
    });
  }, [
    effectiveRecords,
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
      effectiveRecords,
      listingRows,
      selectedNode,
      showRoot,
      dateFrom,
      dateTo,
      Boolean(contentSearch.trim()),
    );
  }, [
    effectiveRecords,
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

  const handleDeleteLedger = useCallback((ledger: ChartOfAccount) => {
    setLedgerDeleteError(null);
    setLedgerDeleteTarget(ledger);
  }, []);

  const confirmDeleteLedger = useCallback(async () => {
    if (!ledgerDeleteTarget || ledgerDeleting) return;
    const ledgerId = ledgerDeleteTarget.apiNodeId ?? String(ledgerDeleteTarget.id);
    setLedgerDeleting(true);
    setLedgerDeleteError(null);
    try {
      await LedgerService.delete(ledgerId);
      await queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.all });
      dispatchCoaChanged();
      setLedgerDeleteTarget(null);
    } catch (err: any) {
      setLedgerDeleteError(err?.message || "Failed to delete ledger.");
    } finally {
      setLedgerDeleting(false);
    }
  }, [ledgerDeleteTarget, ledgerDeleting, queryClient]);

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

  const handlePdfExport = async () => {
    if (!mounted) return;
    if (isLedgerStatementView && selectedNode && ledgerAccounting) {
      await exportCoaLedgerStatementToPdf(filteredTransactions, {
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
      await exportCoaLedgerListingToPdf(ledgerListingRows, {
        groupName: selectedNode?.accountName ?? "",
      });
    } else if (listingRows.length > 0) {
      await exportCoaListingToPdf(listingRows, exportMeta);
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
      canAddLedgerUnder(selectedNode, records) &&
      !isAddLedgerBlocked(selectedNode, records)
        ? selectedNode.id
        : null;
    if (parentId == null) return;
    requestCoaGlobalAddLedger(parentId);
  }, [selectedNode, showRoot, records]);

  const handlePartyLedgerSaved = useCallback(
    (ledgerId: CoaNodeId, parentId: CoaNodeId | null, clearForm: () => void) => {
      // Refresh API tree so new ledgers appear; avoid reloading localStorage demo COA.
      refreshRecords();
      if (parentId != null) {
        const parent = records.find((r) => r.id === parentId);
        if (parent) {
          const ancestorIds = getAncestorPath(records, parent.id).map((a) => a.id);
          ensureExpanded([...ancestorIds, parent.id]);
          selectNode(parent);
        }
      }
      setHighlightedLedgerId(ledgerId);
      clearForm();
    },
    [refreshRecords, records, ensureExpanded, selectNode, setHighlightedLedgerId],
  );

  const handleSundryDebtorSaved = useCallback(
    (ledgerId: CoaNodeId, parentId: CoaNodeId | null) => {
      handlePartyLedgerSaved(ledgerId, parentId, () => setSundryDebtorFormParentId(null));
    },
    [handlePartyLedgerSaved],
  );

  const handleSundryCreditorSaved = useCallback(
    (ledgerId: CoaNodeId, parentId: CoaNodeId | null) => {
      handlePartyLedgerSaved(ledgerId, parentId, () => {
        setSundryCreditorFormParentId(null);
        setSundryCreditorEditVendorId(undefined);
      });
    },
    [handlePartyLedgerSaved],
  );

  const handleWarehouseSaved = useCallback(
    (ledgerId: CoaNodeId, parentId: CoaNodeId | null) => {
      handlePartyLedgerSaved(ledgerId, parentId, () => setWarehouseFormParentId(null));
    },
    [handlePartyLedgerSaved],
  );

  const handleTdsLedgerSaved = useCallback(
    (ledgerId: CoaNodeId, parentId: CoaNodeId | null) => {
      handlePartyLedgerSaved(ledgerId, parentId, () => setTdsFormParentId(null));
    },
    [handlePartyLedgerSaved],
  );

  /** Cash-in-Hand only uses "Add Cash Ledger"; all other groups keep "Add Ledger". */
  const newLedgerLabel = useMemo(() => {
    if (!selectedNode) return "Add Ledger";
    return resolveCoaAddActionLabel(selectedNode, records);
  }, [selectedNode, records]);

  const showMaxHierarchyNotice = Boolean(
    canCreate &&
      selectedNode &&
      !showRoot &&
      !showEmptyState &&
      showCoaMaxHierarchyMessage(selectedNode, records),
  );

  /** Add Ledger only when a Level 3 Sub Group is selected and policy allows it. */
  const canShowNewLedger =
    canCreate &&
    !isLedgerStatementView &&
    !showEmptyState &&
    !showMaxHierarchyNotice &&
    Boolean(selectedNode) &&
    !showRoot &&
    canAddLedgerUnder(selectedNode!, records) &&
    !isAddLedgerBlocked(selectedNode!, records);

  if (sundryDebtorFormParentId != null) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
        <AccountsSundryDebtorCustomerFormClient
          parentGroupId={sundryDebtorFormParentId}
          customerId={sundryDebtorEditCustomerId}
          onClose={() => {
            setSundryDebtorFormParentId(null);
            setSundryDebtorEditCustomerId(undefined);
          }}
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
          vendorId={sundryCreditorEditVendorId}
          onClose={() => {
            setSundryCreditorFormParentId(null);
            setSundryCreditorEditVendorId(undefined);
          }}
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
          accountId={bankFormEditAccountId}
          presetGroupId={bankFormParentId}
          onClose={() => {
            setBankFormParentId(null);
            setBankFormEditAccountId(undefined);
          }}
          onSaved={(ledgerId, parentId) =>
            handlePartyLedgerSaved(ledgerId, parentId, () => {
              setBankFormParentId(null);
              setBankFormEditAccountId(undefined);
            })
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
                onDeleteLedger={canEdit ? handleDeleteLedger : undefined}
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

      {/* Delete Ledger Confirmation Dialog */}
      <Dialog open={Boolean(ledgerDeleteTarget)} onOpenChange={(open) => { if (!open && !ledgerDeleting) { setLedgerDeleteTarget(null); setLedgerDeleteError(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Ledger</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">"{ledgerDeleteTarget?.accountName}"</span>?{" "}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {ledgerDeleteError && (
            <p className="text-sm text-red-600 bg-red-50 rounded p-2">{ledgerDeleteError}</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setLedgerDeleteTarget(null); setLedgerDeleteError(null); }}
              disabled={ledgerDeleting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={confirmDeleteLedger}
              disabled={ledgerDeleting}
            >
              {ledgerDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import "./bank-reconciliation-compact.css";
import { ArrowLeft, Check, Info, MoreVertical, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableEmpty,
  ACCOUNTS_DEFAULT_PAGE_SIZE,
} from "@/components/accounts/AccountsTableListing";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ReportStatusMultiFilter,
  ReportVoucherTypeMultiFilter,
} from "@/components/accounts/ReportFilters";
import { ReportMultiSelect } from "@/components/accounts/ReportMultiSelect";
import { Pagination } from "@/components/listing/Pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMoney } from "@/lib/accounts/money-format";
import { formatDisplayDate } from "@/lib/accounts/date-display";
import { cn } from "@/lib/utils";
import { SkeletonRow } from "@/components/ui/Loaders";
import { useFY } from "@/lib/fy-store";
import {
  RECONCILIATION_BREADCRUMB,
  RECONCILIATION_LIST_PATH,
} from "./reconciliation-utils";
import { BankReconTallyStatusBadge } from "./components/BankReconTallyStatusBadge";
import { BankReconTallyUndoDialog } from "./components/BankReconTallyUndoDialog";
import { BankReconCommonSummaryStrip } from "./components/BankReconCommonSummaryStrip";
import { BankReconciliationService } from "@/services/bank-reconciliation.service";
import {
  mapBookEntryToUiRow,
  mapDashboardItemToWorkspaceAccount,
  mapDashboardItemToWorkspaceSummary,
  maskAccountNumber,
  voucherTypeFilterToApi,
  type BankReconBookRowUi,
  type WorkspaceAccountUi,
  type WorkspaceSummaryUi,
} from "@/lib/accounts/bank-recon-api-mappers";
import type { BankReconciliationStatus } from "@/types/bank-reconciliation.types";

function moneyOrDash(n: number): string {
  return n ? formatMoney(n) : "—";
}

const VOUCHER_TYPE_FILTERS = [
  { value: "payment", label: "Payment" },
  { value: "receipt", label: "Receipt" },
  { value: "contra", label: "Contra" },
  { value: "journal", label: "Journal" },
];

const DIRECTION_FILTERS = [
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
];

const STATUS_FILTERS = [
  { value: "UNRECONCILED", label: "Unreconciled" },
  { value: "RECONCILED", label: "Reconciled" },
];

export default function BankReconciliationWorkspacePageClient({
  accountId: accountIdProp,
}: {
  accountId?: string;
}) {
  const router = useRouter();
  const routeParams = useParams();
  const { selectedFY } = useFY();
  const accountId =
    accountIdProp ??
    (typeof routeParams?.accountId === "string"
      ? routeParams.accountId
      : Array.isArray(routeParams?.accountId)
        ? routeParams.accountId[0] ?? ""
        : "");

  const [accountLoading, setAccountLoading] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [account, setAccount] = useState<WorkspaceAccountUi | null>(null);
  const [summary, setSummary] = useState<WorkspaceSummaryUi | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>(["UNRECONCILED"]);
  const [voucherTypeFilters, setVoucherTypeFilters] = useState<string[]>([]);
  const [directionFilters, setDirectionFilters] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [booksLoading, setBooksLoading] = useState(true);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [books, setBooks] = useState<BankReconBookRowUi[]>([]);
  const [booksTotal, setBooksTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBankDate, setBulkBankDate] = useState("");
  const [undoBankDetailId, setUndoBankDetailId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshAll = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    if (!accountId) return;
    setStatusFilters(["UNRECONCILED"]);
    setSelectedIds(new Set());
    setDateFrom(selectedFY.startDate || "");
    setDateTo(selectedFY.endDate || "");
  }, [accountId, selectedFY.startDate, selectedFY.endDate]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [
    statusFilters,
    debouncedSearch,
    dateFrom,
    dateTo,
    voucherTypeFilters,
    directionFilters,
    accountId,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 180);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const loadAccountAndSummary = useCallback(async () => {
    if (!accountId) return;
    setAccountLoading(true);
    setAccountError(null);
    try {
      const [dashboard, matches, unmatched] = await Promise.all([
        BankReconciliationService.getDashboard(),
        BankReconciliationService.getMatches({
          bank_account_id: accountId,
          page: 1,
          page_size: 1,
        }),
        BankReconciliationService.getStatementLines({
          bank_account_id: accountId,
          unmatched_only: true,
          page: 1,
          page_size: 1,
        }),
      ]);
      const item = dashboard.items.find((i) => i.bankAccountId === accountId);
      if (!item) {
        setAccount(null);
        setSummary(null);
        setAccountError(
          "Bank reconciliation is not enabled for this bank account, or the account was not found.",
        );
        return;
      }
      setAccount(mapDashboardItemToWorkspaceAccount(item));
      setSummary(
        mapDashboardItemToWorkspaceSummary(item, {
          reconciledCount: matches.pagination.total,
          unmatchedBankEntries: unmatched.pagination.total,
        }),
      );
    } catch (err) {
      setAccount(null);
      setSummary(null);
      setAccountError(err instanceof Error ? err.message : "Failed to load bank account.");
    } finally {
      setAccountLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    void loadAccountAndSummary();
  }, [loadAccountAndSummary, refreshKey]);

  const loadBooks = useCallback(async () => {
    if (!accountId || !account) return;
    setBooksLoading(true);
    setBooksError(null);
    try {
      // API accepts a single value per dimension; multi uses client OR when >1 selected.
      const reconciliationStatus: BankReconciliationStatus | undefined =
        statusFilters.length === 1
          ? (statusFilters[0] as BankReconciliationStatus)
          : undefined;
      const voucherType =
        voucherTypeFilters.length === 1
          ? voucherTypeFilterToApi(voucherTypeFilters[0])
          : undefined;
      const transactionDirection =
        directionFilters.length === 1
          ? directionFilters[0] === "deposit"
            ? "DEPOSIT"
            : directionFilters[0] === "withdrawal"
              ? "WITHDRAWAL"
              : undefined
          : undefined;
      const data = await BankReconciliationService.getBookEntries({
        bank_account_id: accountId,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        reconciliation_status: reconciliationStatus,
        voucher_type: voucherType,
        transaction_direction: transactionDirection,
        search: debouncedSearch.trim() || undefined,
        page,
        page_size: pageSize,
        ordering: "-voucher_date",
      });
      let items = data.items.map(mapBookEntryToUiRow);
      if (statusFilters.length > 1) {
        const allowed = new Set(statusFilters);
        items = items.filter((row) => allowed.has(row.status));
      }
      if (voucherTypeFilters.length > 1) {
        const allowed = new Set(voucherTypeFilters.map((v) => v.toLowerCase()));
        items = items.filter((row) => allowed.has(row.voucherTypeCode));
      }
      if (directionFilters.length > 1) {
        const wantDeposit = directionFilters.includes("deposit");
        const wantWithdrawal = directionFilters.includes("withdrawal");
        items = items.filter((row) => {
          if (wantDeposit && row.deposit > 0) return true;
          if (wantWithdrawal && row.withdrawal > 0) return true;
          return false;
        });
      }
      setBooks(items);
      setBooksTotal(
        statusFilters.length > 1 ||
          voucherTypeFilters.length > 1 ||
          directionFilters.length > 1
          ? items.length
          : data.pagination.total,
      );
    } catch (err) {
      setBooks([]);
      setBooksTotal(0);
      setBooksError(err instanceof Error ? err.message : "Failed to load book entries.");
    } finally {
      setBooksLoading(false);
    }
  }, [
    accountId,
    account,
    statusFilters,
    voucherTypeFilters,
    directionFilters,
    dateFrom,
    dateTo,
    debouncedSearch,
    page,
    pageSize,
  ]);

  useEffect(() => {
    void loadBooks();
  }, [loadBooks, refreshKey]);

  const bookById = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);

  const handleInlineBankDateSave = useCallback(
    async (row: BankReconBookRowUi, bankDate: string): Promise<string | null> => {
      if (!bankDate.trim()) return "Bank Date is required.";
      try {
        await BankReconciliationService.manualReconcile({
          bank_account_id: row.bankAccountId,
          bank_detail_ids: [row.id],
          cleared_date: bankDate,
        });
        refreshAll();
        setToast({
          msg: `Reconciled ${row.voucherNumber} with Bank Date ${formatDisplayDate(bankDate)}.`,
          type: "success",
        });
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : "Failed to reconcile.";
      }
    },
    [refreshAll],
  );

  const handleBulkApply = useCallback(async () => {
    if (!accountId) return;
    if (selectedIds.size === 0) {
      setToast({ msg: "Select at least one unreconciled row.", type: "error" });
      return;
    }
    const ids = [...selectedIds].filter((id) => {
      const row = bookById.get(id);
      return row && row.status !== "RECONCILED";
    });
    if (ids.length === 0) {
      setToast({ msg: "No unreconciled rows selected.", type: "error" });
      return;
    }
    const commonDate = bulkBankDate.trim();
    setSaving(true);
    try {
      const result = await BankReconciliationService.manualReconcile({
        bank_account_id: accountId,
        bank_detail_ids: ids,
        // Mode 1: common date. Mode 2: omit → backend uses each voucher_date.
        ...(commonDate ? { cleared_date: commonDate } : {}),
      });
      setSelectedIds(new Set());
      refreshAll();
      setToast({
        msg: commonDate
          ? `Marked ${result.reconciledCount} row(s) reconciled with Bank Date ${formatDisplayDate(commonDate)}.`
          : `Marked ${result.reconciledCount} row(s) reconciled using each voucher's own date.`,
        type: "success",
      });
    } catch (err) {
      setToast({
        msg: err instanceof Error ? err.message : "Failed to mark reconciled.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }, [accountId, bulkBankDate, selectedIds, bookById, refreshAll]);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setStatusFilters(["UNRECONCILED"]);
    setVoucherTypeFilters([]);
    setDirectionFilters([]);
    setDateFrom(selectedFY.startDate || "");
    setDateTo(selectedFY.endDate || "");
    setBulkBankDate("");
    setSelectedIds(new Set());
  }, [selectedFY.startDate, selectedFY.endDate]);

  const openVoucher = useCallback(
    (row: BankReconBookRowUi) => {
      router.push(row.viewHref);
    },
    [router],
  );

  const selectablePageIds = useMemo(
    () => books.filter((row) => row.status !== "RECONCILED").map((row) => row.id),
    [books],
  );
  const allPageSelected = useMemo(
    () => selectablePageIds.length > 0 && selectablePageIds.every((id) => selectedIds.has(id)),
    [selectablePageIds, selectedIds],
  );
  const handleToggleAll = useCallback(() => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (selectablePageIds.every((id) => next.has(id))) {
        selectablePageIds.forEach((id) => next.delete(id));
      } else {
        selectablePageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [selectablePageIds]);
  const handleToggleOne = useCallback((id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (accountLoading) {
    return (
      <AccountsPageShell
        breadcrumbs={[
          ...RECONCILIATION_BREADCRUMB,
          { label: "Loading…" },
        ]}
        title="Bank Reconciliation"
        description="Loading bank account…"
        layout="standard"
      >
        <div className="py-8 text-center text-sm text-muted-foreground">Loading bank account…</div>
      </AccountsPageShell>
    );
  }

  if (!account || accountError) {
    return (
      <AccountsPageShell
        breadcrumbs={[
          ...RECONCILIATION_BREADCRUMB,
          { label: "Not Available" },
        ]}
        title="Bank Account Not Available"
        description={accountError ?? "The selected bank account could not be loaded."}
        layout="standard"
      >
        <div className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {accountError ?? "Invalid or missing bank account."}
          </p>
          <Button asChild size="sm" variant="outline" className="h-8 text-xs">
            <Link href={RECONCILIATION_LIST_PATH}>Back to Bank Reconciliation</Link>
          </Button>
        </div>
      </AccountsPageShell>
    );
  }

  return (
    <>
      <div className="bank-recon-dense h-full min-h-0 flex flex-col gap-1 overflow-hidden">
        <div className="h-8 flex-shrink-0 flex items-center gap-2 min-w-0">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0 flex-shrink-0 border-border/70"
            onClick={() => router.push(RECONCILIATION_LIST_PATH)}
            aria-label="Back to Bank Reconciliation"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
          <h1 className="text-sm font-bold text-foreground whitespace-nowrap">Bank Reconciliation</h1>
          <span className="text-xs text-muted-foreground truncate">
            {account.accountNickname} • {maskAccountNumber(account.accountNumber)}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                aria-label="Reconciliation information"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              Reconciliation only updates Bank Date. Amount corrections must be made in the original
              voucher.
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-shrink-0 flex flex-wrap lg:flex-nowrap items-end gap-2 rounded-lg bg-white px-2 py-1.5 shadow-xs">
          <div className="space-y-1">
            <span className="block text-[10px] font-medium text-muted-foreground">Date Range</span>
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={cn(
                  ACCOUNTS_FILTER_CONTROL_CLASS,
                  "h-8 mt-0 w-[125px] rounded-lg border-border/70 px-2 text-xs",
                )}
                aria-label="Date from"
              />
              <span className="text-[10px] text-muted-foreground">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={cn(
                  ACCOUNTS_FILTER_CONTROL_CLASS,
                  "h-8 mt-0 w-[125px] rounded-lg border-border/70 px-2 text-xs",
                )}
                aria-label="Date to"
              />
            </div>
          </div>
          <ReportStatusMultiFilter
            values={statusFilters}
            onChange={setStatusFilters}
            options={STATUS_FILTERS}
          />
          <ReportVoucherTypeMultiFilter
            values={voucherTypeFilters}
            onChange={setVoucherTypeFilters}
            options={VOUCHER_TYPE_FILTERS}
          />
          <ReportMultiSelect
            label="Transaction Type"
            values={directionFilters}
            onChange={setDirectionFilters}
            options={DIRECTION_FILTERS}
            entityName="Type"
            allLabel="All"
            minWidthClass="min-w-[150px]"
          />
          <div className="space-y-1 min-w-[180px] flex-1">
            <span className="block text-[10px] font-medium text-muted-foreground">Search</span>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Voucher, particulars or UTR…"
                className="h-8 w-full rounded-lg border border-border/70 bg-white pl-8 pr-2.5 text-xs outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
                aria-label="Search transactions"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 px-2.5 gap-1.5 flex-shrink-0 rounded-lg border-border/70 text-xs text-muted-foreground"
            onClick={handleResetFilters}
            aria-label="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </Button>
        </div>

        {summary && (
          <BankReconCommonSummaryStrip key={accountId} mode="manual" summary={summary} />
        )}

        <div className="flex-1 min-h-0 flex flex-col border border-border/70 rounded-lg bg-white overflow-hidden">
            <div className="h-9 flex-shrink-0 flex items-center gap-3 border-b border-border/60 bg-white px-3">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                <strong className="text-foreground">{booksTotal}</strong>{" "}
                {statusFilters.length === 1 && statusFilters[0] === "RECONCILED"
                  ? "reconciled"
                  : statusFilters.length === 0
                    ? "records"
                    : statusFilters.length === 1 && statusFilters[0] === "UNRECONCILED"
                      ? "pending"
                      : "records"}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                <strong className="text-foreground">{selectedIds.size}</strong> selected
              </span>
              <div className="flex-1" />
              <div className="flex flex-col items-end gap-0.5 min-w-0">
                <span
                  className="text-[11px] font-medium text-muted-foreground whitespace-nowrap"
                  title="Leave blank to use each voucher's own voucher date"
                >
                  Common Bank Date (Optional)
                </span>
                <span className="text-[9px] text-muted-foreground/80 whitespace-nowrap hidden sm:inline">
                  Blank = each voucher&apos;s own date
                </span>
              </div>
              <input
                type="date"
                value={bulkBankDate}
                onChange={(e) => setBulkBankDate(e.target.value)}
                className="h-8 w-[125px] rounded-lg border border-border/70 bg-white px-2 text-xs"
                aria-label="Common Bank Date (optional). Leave blank to use each voucher's own date."
              />
              <Button
                type="button"
                size="sm"
                className="h-8 px-2.5 text-xs gap-1 bg-brand-600 hover:bg-brand-700 text-white disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border disabled:opacity-100"
                disabled={selectedIds.size === 0 || saving}
                onClick={() => void handleBulkApply()}
                title={
                  selectedIds.size === 0
                    ? "Select rows first"
                    : bulkBankDate.trim()
                      ? `Reconcile selected with ${formatDisplayDate(bulkBankDate)}`
                      : "Reconcile selected using each voucher's own date"
                }
              >
                <Check className="w-3 h-3" />
                Mark Reconciled
              </Button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              {booksLoading ? (
                <AccountsTable className="bank-recon-grid">
                  <colgroup>
                    <col className="bank-recon-ws-check" />
                    <col className="bank-recon-ws-voucher-date" />
                    <col className="bank-recon-ws-particulars" />
                    <col className="bank-recon-ws-type" />
                    <col className="bank-recon-ws-voucher-no" />
                    <col className="bank-recon-ws-instrument" />
                    <col className="bank-recon-ws-amount" />
                    <col className="bank-recon-ws-amount" />
                    <col className="bank-recon-ws-bank-date" />
                    <col className="bank-recon-ws-status" />
                    <col className="bank-recon-ws-action" />
                  </colgroup>
                  <AccountsTableHead>
                    <AccountsTableHeadRow>
                      {Array.from({ length: 11 }).map((_, i) => (
                        <AccountsTableHeadCell key={i}>&nbsp;</AccountsTableHeadCell>
                      ))}
                    </AccountsTableHeadRow>
                  </AccountsTableHead>
                  <AccountsTableBody>
                    {Array.from({ length: 20 }).map((_, i) => (
                      <SkeletonRow key={i} cols={11} />
                    ))}
                  </AccountsTableBody>
                </AccountsTable>
              ) : booksError ? (
                <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
                  <p className="text-sm font-medium text-foreground">Unable to load book entries</p>
                  <p className="text-xs text-muted-foreground">{booksError}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={() => void loadBooks()}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <BooksTable
                  rows={books}
                  empty={books.length === 0}
                  selectedIds={selectedIds}
                  allPageSelected={allPageSelected}
                  onToggleAll={handleToggleAll}
                  onToggleOne={handleToggleOne}
                  onInlineSave={handleInlineBankDateSave}
                  onViewVoucher={openVoucher}
                  onUndo={setUndoBankDetailId}
                />
              )}
            </div>
            <div className="bank-recon-pagination flex-shrink-0">
              <Pagination
                page={page}
                pageSize={pageSize}
                totalRecords={booksTotal}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                recordLabel="rows"
                variant="compact"
              />
            </div>
          </div>
      </div>

      <BankReconTallyUndoDialog
        open={!!undoBankDetailId}
        onClose={() => setUndoBankDetailId(null)}
        bankAccountId={accountId}
        bankDetailId={undoBankDetailId}
        onDone={() => {
          refreshAll();
          setToast({ msg: "Marked as unreconciled. Entry is Unreconciled again.", type: "success" });
        }}
      />

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.msg}
        </div>
      )}
    </>
  );
}

function RowActions({ children }: { children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="h-7 w-7 inline-flex items-center justify-center hover:bg-muted/60 rounded-md transition-colors"
          aria-label="More actions"
          title="More actions"
        >
          <MoreVertical className="w-4 h-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
          Actions
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function BooksTable({
  rows,
  empty,
  selectedIds,
  allPageSelected,
  onToggleAll,
  onToggleOne,
  onInlineSave,
  onViewVoucher,
  onUndo,
}: {
  rows: BankReconBookRowUi[];
  empty: boolean;
  selectedIds: Set<string>;
  allPageSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onInlineSave: (row: BankReconBookRowUi, bankDate: string) => Promise<string | null>;
  onViewVoucher: (row: BankReconBookRowUi) => void;
  onUndo: (bankDetailId: string) => void;
}) {
  return (
    <AccountsTable className="bank-recon-grid">
      <colgroup>
        <col className="bank-recon-ws-check" />
        <col className="bank-recon-ws-voucher-date" />
        <col className="bank-recon-ws-particulars" />
        <col className="bank-recon-ws-type" />
        <col className="bank-recon-ws-voucher-no" />
        <col className="bank-recon-ws-instrument" />
        <col className="bank-recon-ws-amount" />
        <col className="bank-recon-ws-amount" />
        <col className="bank-recon-ws-bank-date" />
        <col className="bank-recon-ws-status" />
        <col className="bank-recon-ws-action" />
      </colgroup>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <AccountsTableHeadCell align="center">
            <input
              type="checkbox"
              className="w-3 h-3 rounded accent-brand-600"
              checked={allPageSelected}
              onChange={onToggleAll}
              aria-label="Select all on page"
            />
          </AccountsTableHeadCell>
          <AccountsTableHeadCell>Voucher Date</AccountsTableHeadCell>
          <AccountsTableHeadCell>Particulars</AccountsTableHeadCell>
          <AccountsTableHeadCell>Type</AccountsTableHeadCell>
          <AccountsTableHeadCell>Voucher No.</AccountsTableHeadCell>
          <AccountsTableHeadCell>Instrument / UTR</AccountsTableHeadCell>
          <AccountsTableHeadCell align="right">Deposit</AccountsTableHeadCell>
          <AccountsTableHeadCell align="right">Withdrawal</AccountsTableHeadCell>
          <AccountsTableHeadCell align="center">Bank Date</AccountsTableHeadCell>
          <AccountsTableHeadCell align="center">Status</AccountsTableHeadCell>
          <AccountsTableHeadCell align="center">Action</AccountsTableHeadCell>
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {empty ? (
          <AccountsTableEmpty
            colSpan={11}
            message="No book transactions match the current filters."
          />
        ) : (
          rows.map((row) => (
            <CompactBookRow
              key={row.id}
              row={row}
              selected={selectedIds.has(row.id)}
              onToggle={onToggleOne}
              onInlineSave={onInlineSave}
              onViewVoucher={onViewVoucher}
              onUndo={onUndo}
            />
          ))
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

const CompactBookRow = memo(function CompactBookRow({
  row,
  selected,
  onToggle,
  onInlineSave,
  onViewVoucher,
  onUndo,
}: {
  row: BankReconBookRowUi;
  selected: boolean;
  onToggle: (id: string) => void;
  onInlineSave: (row: BankReconBookRowUi, bankDate: string) => Promise<string | null>;
  onViewVoucher: (row: BankReconBookRowUi) => void;
  onUndo: (bankDetailId: string) => void;
}) {
  const isReconciled = row.status === "RECONCILED";
  const [draft, setDraft] = useState(row.bankDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(row.bankDate ?? "");
    setError(null);
  }, [row.bankDate]);

  const save = useCallback(async () => {
    setSaving(true);
    const validationError = await onInlineSave(row, draft);
    setSaving(false);
    setError(validationError);
  }, [draft, onInlineSave, row]);

  const modeLabel =
    row.reconciliationMode === "STATEMENT"
      ? "Statement"
      : row.reconciliationMode === "MANUAL"
        ? "Manual"
        : null;

  return (
    <AccountsTableRow className={cn("group", selected && "is-selected")}>
      <AccountsTableCell align="center">
        <input
          type="checkbox"
          className="w-3 h-3 rounded accent-brand-600"
          disabled={isReconciled}
          checked={selected}
          onChange={() => onToggle(row.id)}
          aria-label={`Select ${row.voucherNumber}`}
        />
      </AccountsTableCell>
      <AccountsTableCell className="tabular-nums" title={formatDisplayDate(row.voucherDate)}>
        {formatDisplayDate(row.voucherDate)}
      </AccountsTableCell>
      <AccountsTableCell className="min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="block w-full truncate text-left text-[12px] font-medium text-foreground hover:text-brand-700"
              onClick={() => onViewVoucher(row)}
            >
              {row.particulars}
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm">
            {row.particulars}
          </TooltipContent>
        </Tooltip>
      </AccountsTableCell>
      <AccountsTableCell className="truncate" title={row.voucherType}>
        {row.voucherType}
      </AccountsTableCell>
      <AccountsTableCell mono className="truncate text-brand-700" title={row.voucherNumber}>
        {row.voucherNumber}
      </AccountsTableCell>
      <AccountsTableCell className="truncate font-mono text-[10px]" title={row.instrumentNumber || ""}>
        {row.instrumentNumber || "—"}
      </AccountsTableCell>
      <AccountsTableCell align="right" money>{moneyOrDash(row.deposit)}</AccountsTableCell>
      <AccountsTableCell align="right" money>{moneyOrDash(row.withdrawal)}</AccountsTableCell>
      <AccountsTableCell align="center">
        {isReconciled ? (
          <span className="text-[11px] font-medium tabular-nums whitespace-nowrap">{formatDisplayDate(row.bankDate)}</span>
        ) : (
          <div className="flex items-center justify-center gap-1" title={error ?? undefined}>
            <input
              type="date"
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void save();
                }
              }}
              className={cn(
                "h-[30px] w-[120px] rounded-lg border bg-white px-2 text-[11px] tabular-nums outline-none focus:ring-1",
                error
                  ? "border-red-400 focus:ring-red-200"
                  : "border-border focus:border-brand-400 focus:ring-brand-200",
              )}
              aria-invalid={!!error}
              aria-label={`Bank Date for ${row.voucherNumber}`}
            />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => void save()}
                  disabled={!draft || saving}
                  className={cn(
                    "h-7 w-7 inline-flex flex-shrink-0 items-center justify-center rounded-md text-brand-700 hover:bg-brand-50",
                    (!draft || saving) && "invisible pointer-events-none",
                  )}
                  aria-label={`Save reconciliation for ${row.voucherNumber}`}
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Save reconciliation</TooltipContent>
            </Tooltip>
          </div>
        )}
      </AccountsTableCell>
      <AccountsTableCell align="center">
        <div className="inline-flex flex-col items-center gap-0.5">
          <BankReconTallyStatusBadge status={isReconciled ? "RECONCILED" : "UNRECONCILED"} />
          {isReconciled && modeLabel && (
            <span className="text-[9px] font-semibold text-navy-600 uppercase tracking-wide">
              {modeLabel}
            </span>
          )}
        </div>
      </AccountsTableCell>
      <AccountsTableCell align="center">
        <RowActions>
          <DropdownMenuItem onClick={() => onViewVoucher(row)}>View Details</DropdownMenuItem>
          {isReconciled && (
            <DropdownMenuItem onClick={() => onUndo(row.id)}>Unreconcile</DropdownMenuItem>
          )}
        </RowActions>
      </AccountsTableCell>
    </AccountsTableRow>
  );
});

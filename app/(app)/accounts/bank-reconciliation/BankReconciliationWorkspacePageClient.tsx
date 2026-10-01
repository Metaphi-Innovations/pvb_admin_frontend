"use client";

import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import "./bank-reconciliation-compact.css";
import { ArrowLeft, Check, Info, MoreVertical, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@/components/accounts/ReportFilters";
import { Pagination } from "@/components/listing/Pagination";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { SkeletonRow } from "@/components/ui/Loaders";
import {
  getBankReconAccountById,
  getBankReconAccounts,
  maskAccountNumber,
} from "./bank-reconciliation-v2-data";
import { RECONCILIATION_LIST_PATH } from "./reconciliation-utils";
import { BankReconTallyStatusBadge } from "./components/BankReconTallyStatusBadge";
import { BankReconBrsSummaryCard } from "./components/BankReconBrsSummaryCard";
import { BankReconTallyUndoDialog } from "./components/BankReconTallyUndoDialog";
import {
  getBrsSummary,
  listBookTransactions,
  reconcileBankDateBulk,
  reconcileBankDateOnly,
} from "@/lib/accounts/bank-recon-tally-service";
import {
  BANK_RECON_TALLY_STATUS_FILTERS,
  TALLY_EVENT,
  type BankReconBookTransaction,
} from "@/lib/accounts/bank-recon-tally-types";
import { isManualDemoAccount } from "@/lib/accounts/bank-recon-manual-demo-overlay";

function moneyOrDash(n: number): string {
  return n ? formatMoney(n) : "—";
}

function matchesSearch(hay: string, q: string): boolean {
  if (!q) return true;
  return hay.toLowerCase().includes(q);
}

const VOUCHER_TYPE_FILTERS = [
  { value: "all", label: "All Types" },
  { value: "payment", label: "Payment" },
  { value: "receipt", label: "Receipt" },
  { value: "contra", label: "Contra" },
  { value: "journal", label: "Journal" },
  { value: "other", label: "Other" },
] as const;

const DIRECTION_FILTERS = [
  { value: "all", label: "All" },
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
] as const;

export default function BankReconciliationWorkspacePageClient({
  accountId: accountIdProp,
}: {
  accountId?: string;
}) {
  const router = useRouter();
  const routeParams = useParams();
  const accountId =
    accountIdProp ??
    (typeof routeParams?.accountId === "string"
      ? routeParams.accountId
      : Array.isArray(routeParams?.accountId)
        ? routeParams.accountId[0] ?? ""
        : "");

  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("UNRECONCILED");
  const [voucherTypeFilter, setVoucherTypeFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ACCOUNTS_DEFAULT_PAGE_SIZE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBankDate, setBulkBankDate] = useState("");
  const [undoLinkId, setUndoLinkId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const allAccounts = useMemo(() => getBankReconAccounts(), [tick]);
  const account = useMemo(
    () => allAccounts.find((a) => a.id === accountId) ?? getBankReconAccountById(accountId),
    [allAccounts, accountId],
  );

  useEffect(() => {
    const handler = () => setTick((t) => t + 1);
    window.addEventListener(TALLY_EVENT, handler);
    return () => window.removeEventListener(TALLY_EVENT, handler);
  }, []);

  useEffect(() => {
    if (!accountId) return;
    const acct = getBankReconAccountById(accountId);
    if (acct) {
      setDateFrom(acct.statementPeriodFrom);
      setDateTo(acct.statementPeriodTo);
    }
    setStatusFilter("UNRECONCILED");
    setSelectedIds(new Set());
    const t = setTimeout(() => setLoading(false), 250);
    return () => clearTimeout(t);
  }, [accountId]);

  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
  }, [statusFilter, debouncedSearch, dateFrom, dateTo, voucherTypeFilter, directionFilter, accountId]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 180);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const books = useMemo(() => {
    void tick;
    if (!accountId) return [] as BankReconBookTransaction[];
    return listBookTransactions(accountId, dateFrom || undefined, dateTo || undefined);
  }, [accountId, dateFrom, dateTo, tick]);

  const brs = useMemo(() => {
    void tick;
    if (!accountId) return null;
    return getBrsSummary(accountId, dateFrom || undefined, dateTo || undefined);
  }, [accountId, dateFrom, dateTo, tick]);

  const filteredBooks = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return books.filter((b) => {
      if (statusFilter === "UNRECONCILED" && b.status === "RECONCILED") return false;
      if (statusFilter === "RECONCILED" && b.status !== "RECONCILED") return false;
      if (voucherTypeFilter !== "all") {
        const code = (b.voucherTypeCode || "").toLowerCase();
        if (voucherTypeFilter === "other") {
          if (["payment", "receipt", "contra", "journal"].includes(code)) return false;
        } else if (code !== voucherTypeFilter) {
          return false;
        }
      }
      if (directionFilter === "deposit" && !(b.deposit > 0)) return false;
      if (directionFilter === "withdrawal" && !(b.withdrawal > 0)) return false;
      return matchesSearch(
        `${b.particulars} ${b.voucherNumber} ${b.instrumentNumber} ${b.voucherType}`,
        q,
      );
    });
  }, [books, debouncedSearch, statusFilter, voucherTypeFilter, directionFilter]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, page, pageSize]);
  const bookById = useMemo(() => new Map(books.map((book) => [book.id, book])), [books]);

  const handleInlineBankDateSave = useCallback(
    (row: BankReconBookTransaction, bankDate: string): string | null => {
      if (!bankDate.trim()) return "Bank Date is required.";
      const result = reconcileBankDateOnly({
        bankAccountId: row.bankAccountId,
        bookTransactionId: row.id,
        bankDate,
        remarks: "Bank Date updated inline",
      });
      if (!result.ok) return result.error;
      refresh();
      setToast({ msg: `Reconciled ${row.voucherNumber} with Bank Date ${bankDate}.`, type: "success" });
      return null;
    },
    [refresh],
  );

  const handleBulkApply = useCallback(() => {
    if (!accountId) return;
    if (!bulkBankDate.trim()) {
      setToast({ msg: "Enter a common Bank Date for selected rows.", type: "error" });
      return;
    }
    if (selectedIds.size === 0) {
      setToast({ msg: "Select at least one unreconciled row.", type: "error" });
      return;
    }
    const ids = [...selectedIds].filter((id) => {
      const row = bookById.get(id);
      return row && row.status !== "RECONCILED";
    });
    const result = reconcileBankDateBulk({
      bankAccountId: accountId,
      bookTransactionIds: ids,
      bankDate: bulkBankDate,
      remarks: "Bulk Bank Date apply",
    });
    if (!result.ok) {
      setToast({ msg: result.error, type: "error" });
      return;
    }
    setSelectedIds(new Set());
    refresh();
    setToast({
      msg: `Applied Bank Date to ${result.saved} row(s)${result.skipped ? ` · ${result.skipped} skipped` : ""}.`,
      type: "success",
    });
  }, [accountId, bulkBankDate, selectedIds, bookById, refresh]);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("UNRECONCILED");
    setVoucherTypeFilter("all");
    setDirectionFilter("all");
    if (account) {
      setDateFrom(account.statementPeriodFrom);
      setDateTo(account.statementPeriodTo);
    }
    setBulkBankDate("");
    setSelectedIds(new Set());
  }, [account]);

  const openVoucher = useCallback((row: BankReconBookTransaction) => {
    if (isManualDemoAccount(row.bankAccountId) || row.viewHref.startsWith("#recon-voucher:")) {
      // Ensure draft display stubs exist, then open Payment/Receipt/Contra view.
      void import("@/lib/accounts/bank-recon-display").then(({ ensureManualDemoDisplayVouchers }) => {
        ensureManualDemoDisplayVouchers();
        router.push(`/accounts/vouchers/view/${row.voucherId}`);
      });
      return;
    }
    window.open(row.viewHref, "_blank", "noopener,noreferrer");
  }, [router]);

  const selectablePageIds = useMemo(
    () => pageRows.filter((row) => row.status !== "RECONCILED").map((row) => row.id),
    [pageRows],
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
  const handleUndoOpen = useCallback((linkId: string) => setUndoLinkId(linkId), []);

  if (!account) {
    return (
      <AccountsPageShell
        breadcrumbs={[
          { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
          { label: "Banking" },
          { label: "Bank Reconciliation", href: RECONCILIATION_LIST_PATH },
          { label: "Not Found" },
        ]}
        title="Bank Account Not Found"
        description="The selected bank account could not be loaded."
        layout="standard"
      >
        <div className="py-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Invalid or missing bank account.</p>
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
                value={dateFrom || account.statementPeriodFrom}
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
                value={dateTo || account.statementPeriodTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={cn(
                  ACCOUNTS_FILTER_CONTROL_CLASS,
                  "h-8 mt-0 w-[125px] rounded-lg border-border/70 px-2 text-xs",
                )}
                aria-label="Date to"
              />
            </div>
          </div>
          <div className="space-y-1">
            <span className="block text-[10px] font-medium text-muted-foreground">Status</span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger
                className={cn(
                  ACCOUNTS_FILTER_CONTROL_CLASS,
                  "h-8 mt-0 w-[130px] rounded-lg border-border/70 px-2.5 text-xs",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BANK_RECON_TALLY_STATUS_FILTERS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="block text-[10px] font-medium text-muted-foreground">Voucher Type</span>
            <Select value={voucherTypeFilter} onValueChange={setVoucherTypeFilter}>
              <SelectTrigger
                className={cn(
                  ACCOUNTS_FILTER_CONTROL_CLASS,
                  "h-8 mt-0 w-[135px] rounded-lg border-border/70 px-2.5 text-xs",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VOUCHER_TYPE_FILTERS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <span className="block text-[10px] font-medium text-muted-foreground">
              Transaction Type
            </span>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger
                className={cn(
                  ACCOUNTS_FILTER_CONTROL_CLASS,
                  "h-8 mt-0 w-[150px] rounded-lg border-border/70 px-2.5 text-xs",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTION_FILTERS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

        {brs && <BankReconBrsSummaryCard key={accountId} summary={brs} />}

        <div className="flex-1 min-h-0 flex flex-col border border-border/70 rounded-lg bg-white overflow-hidden">
          <div className="h-9 flex-shrink-0 flex items-center gap-3 border-b border-border/60 bg-white px-3">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              <strong className="text-foreground">{filteredBooks.length}</strong>{" "}
              {statusFilter === "RECONCILED" ? "reconciled" : statusFilter === "all" ? "records" : "pending"}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              <strong className="text-foreground">{selectedIds.size}</strong> selected
            </span>
            <div className="flex-1" />
            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
              Bank Date
            </span>
            <input
              type="date"
              value={bulkBankDate}
              onChange={(e) => setBulkBankDate(e.target.value)}
              className="h-8 w-[125px] rounded-lg border border-border/70 bg-white px-2 text-xs"
              aria-label="Bulk Bank Date"
            />
            <Button
              type="button"
              size="sm"
              className="h-8 w-[76px] px-2 text-xs gap-1 bg-brand-600 hover:bg-brand-700 text-white disabled:bg-muted disabled:text-muted-foreground disabled:border disabled:border-border disabled:opacity-100"
              disabled={selectedIds.size === 0}
              onClick={handleBulkApply}
            >
              <Check className="w-3 h-3" />
              Apply
            </Button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {loading ? (
              <AccountsTable minWidth={1040} className="bank-recon-grid">
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
            ) : (
              <BooksTable
                rows={pageRows}
                empty={filteredBooks.length === 0}
                selectedIds={selectedIds}
                allPageSelected={allPageSelected}
                onToggleAll={handleToggleAll}
                onToggleOne={handleToggleOne}
                onInlineSave={handleInlineBankDateSave}
                onViewVoucher={openVoucher}
                onUndo={handleUndoOpen}
              />
            )}
          </div>
          <div className="bank-recon-pagination flex-shrink-0">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalRecords={filteredBooks.length}
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
        open={!!undoLinkId}
        onClose={() => setUndoLinkId(null)}
        linkId={undoLinkId}
        onDone={() => {
          refresh();
          setToast({ msg: "Reconciliation undone. Entry is Unreconciled again.", type: "success" });
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
  rows: BankReconBookTransaction[];
  empty: boolean;
  selectedIds: Set<string>;
  allPageSelected: boolean;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onInlineSave: (row: BankReconBookTransaction, bankDate: string) => string | null;
  onViewVoucher: (row: BankReconBookTransaction) => void;
  onUndo: (linkId: string) => void;
}) {
  return (
    <AccountsTable minWidth={1040} className="bank-recon-grid table-fixed">
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <AccountsTableHeadCell className="w-9" align="center">
            <input
              type="checkbox"
              className="w-3 h-3 rounded accent-brand-600"
              checked={allPageSelected}
              onChange={onToggleAll}
              aria-label="Select all on page"
            />
          </AccountsTableHeadCell>
          <AccountsTableHeadCell className="w-[82px]">Voucher Date</AccountsTableHeadCell>
          <AccountsTableHeadCell>Particulars</AccountsTableHeadCell>
          <AccountsTableHeadCell className="w-[70px]">Type</AccountsTableHeadCell>
          <AccountsTableHeadCell className="w-[102px]">Voucher No.</AccountsTableHeadCell>
          <AccountsTableHeadCell className="w-[112px]">Instrument / UTR</AccountsTableHeadCell>
          <AccountsTableHeadCell className="w-[88px]" align="right">Deposit</AccountsTableHeadCell>
          <AccountsTableHeadCell className="w-[88px]" align="right">Withdrawal</AccountsTableHeadCell>
          <AccountsTableHeadCell className="w-[156px]" align="center">Bank Date</AccountsTableHeadCell>
          <AccountsTableHeadCell className="w-[96px]" align="center">Status</AccountsTableHeadCell>
          <AccountsTableHeadCell className="w-11" align="center">Action</AccountsTableHeadCell>
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
  row: BankReconBookTransaction;
  selected: boolean;
  onToggle: (id: string) => void;
  onInlineSave: (row: BankReconBookTransaction, bankDate: string) => string | null;
  onViewVoucher: (row: BankReconBookTransaction) => void;
  onUndo: (linkId: string) => void;
}) {
  const isReconciled = row.status === "RECONCILED";
  const [draft, setDraft] = useState(row.bankDate ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(row.bankDate ?? "");
    setError(null);
  }, [row.bankDate]);

  const save = useCallback(() => {
    const validationError = onInlineSave(row, draft);
    setError(validationError);
  }, [draft, onInlineSave, row]);

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
      <AccountsTableCell className="whitespace-nowrap tabular-nums">{row.voucherDate}</AccountsTableCell>
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
          <span className="text-[11px] font-medium tabular-nums whitespace-nowrap">{row.bankDate ?? "—"}</span>
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
                  save();
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
                  onClick={save}
                  disabled={!draft}
                  className={cn(
                    "h-7 w-7 inline-flex flex-shrink-0 items-center justify-center rounded-md text-brand-700 hover:bg-brand-50",
                    !draft && "invisible pointer-events-none",
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
        <BankReconTallyStatusBadge status={isReconciled ? "RECONCILED" : "UNRECONCILED"} />
      </AccountsTableCell>
      <AccountsTableCell align="center">
        <RowActions>
          <DropdownMenuItem onClick={() => onViewVoucher(row)}>View Details</DropdownMenuItem>
          {row.editHref && (
            <DropdownMenuItem asChild>
              <Link href={row.editHref}>Edit Voucher</Link>
            </DropdownMenuItem>
          )}
          {isReconciled && row.linkId && (
            <DropdownMenuItem onClick={() => onUndo(row.linkId!)}>Undo Reconciliation</DropdownMenuItem>
          )}
        </RowActions>
      </AccountsTableCell>
    </AccountsTableRow>
  );
});

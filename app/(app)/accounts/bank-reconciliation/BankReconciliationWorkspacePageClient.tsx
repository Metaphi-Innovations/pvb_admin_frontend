"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, MoreVertical, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
  AccountsTablePagination,
  ACCOUNTS_DEFAULT_PAGE_SIZE,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportSearchFilter,
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/components/accounts/ReportFilters";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { SkeletonRow } from "@/components/ui/Loaders";
import {
  getBankReconAccountById,
  getBankReconAccounts,
  maskAccountNumber,
} from "./bank-reconciliation-v2-data";
import { RECONCILIATION_LIST_PATH, bankReconWorkspacePath } from "./reconciliation-utils";
import { BankReconTallyStatusBadge } from "./components/BankReconTallyStatusBadge";
import { BankReconBrsSummaryCard } from "./components/BankReconBrsSummaryCard";
import { BankReconTallyUndoDialog } from "./components/BankReconTallyUndoDialog";
import { BankReconManualVoucherDialog } from "./components/BankReconManualVoucherDialog";
import {
  getBrsSummary,
  listBookTransactions,
  listReconciledRows,
  reconcileBankDateBulk,
  reconcileBankDateOnly,
} from "@/lib/accounts/bank-recon-tally-service";
import {
  BANK_RECON_TALLY_STATUS_FILTERS,
  TALLY_EVENT,
  type BankReconBookTransaction,
  type BankReconReconciledRow,
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
  const [viewBook, setViewBook] = useState<BankReconBookTransaction | null>(null);
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
  }, [statusFilter, search, dateFrom, dateTo, voucherTypeFilter, directionFilter, accountId]);

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

  const reconciled = useMemo(() => {
    void tick;
    if (!accountId) return [] as BankReconReconciledRow[];
    return listReconciledRows(accountId);
  }, [accountId, tick]);

  const brs = useMemo(() => {
    void tick;
    if (!accountId) return null;
    return getBrsSummary(accountId, dateFrom || undefined, dateTo || undefined);
  }, [accountId, dateFrom, dateTo, tick]);

  const filteredBooks = useMemo(() => {
    const q = search.trim().toLowerCase();
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
  }, [books, search, statusFilter, voucherTypeFilter, directionFilter]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, page, pageSize]);

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
      const row = books.find((b) => b.id === id);
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
  }, [accountId, bulkBankDate, selectedIds, books, refresh]);

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
      setViewBook(row);
      return;
    }
    window.open(row.viewHref, "_blank", "noopener,noreferrer");
  }, []);

  const selectablePageIds = pageRows
    .filter((r) => r.status !== "RECONCILED")
    .map((r) => r.id);
  const allPageSelected =
    selectablePageIds.length > 0 && selectablePageIds.every((id) => selectedIds.has(id));

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
      <AccountsPageShell
        breadcrumbs={[
          { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
          { label: "Banking" },
          { label: "Bank Reconciliation", href: RECONCILIATION_LIST_PATH },
          { label: account.accountNickname },
        ]}
        title="Bank Reconciliation"
        description={`${account.bankName} · ${maskAccountNumber(account.accountNumber)}`}
        hideDescription
        layout="split"
        className="h-full min-h-0"
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => router.push(RECONCILIATION_LIST_PATH)}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </Button>
        }
      >
        <div className="flex-shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 mb-2">
          Enter the date the bank cleared each book entry, then Save. Amount differences must be
          corrected in the original Payment / Receipt / Contra voucher — reconciliation only updates
          Bank Date.
        </div>

        <div className="flex-shrink-0 flex flex-wrap items-end gap-2 pb-2 border-b border-border/60">
          <div className="space-y-0.5 min-w-[160px]">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Bank Account</Label>
            <Select value={accountId} onValueChange={(id) => router.push(bankReconWorkspacePath(id))}>
              <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[200px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs">
                    {a.accountNickname} · {maskAccountNumber(a.accountNumber)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-0.5">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Date Range</Label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={dateFrom || account.statementPeriodFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[120px]")}
              />
              <span className="text-[11px] text-muted-foreground">—</span>
              <input
                type="date"
                value={dateTo || account.statementPeriodTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[120px]")}
              />
            </div>
          </div>

          <div className="space-y-0.5 min-w-[130px]">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-full")}>
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

          <div className="space-y-0.5 min-w-[120px]">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Voucher Type</Label>
            <Select value={voucherTypeFilter} onValueChange={setVoucherTypeFilter}>
              <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-full")}>
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

          <div className="space-y-0.5 min-w-[120px]">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Deposit / Withdrawal</Label>
            <Select value={directionFilter} onValueChange={setDirectionFilter}>
              <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-full")}>
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

          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Search voucher, narration, reference…"
          />

          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={handleResetFilters}
          >
            Reset
          </Button>
        </div>

        {brs && (
          <div className="flex-shrink-0 py-2">
            <BankReconBrsSummaryCard summary={brs} />
          </div>
        )}

        <div className="flex-shrink-0 flex flex-wrap items-center gap-2 pb-2">
          <span className="text-[11px] text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filteredBooks.length}</span> of{" "}
            <span className="font-medium text-foreground">{books.length}</span> book entries ·{" "}
            {reconciled.length} reconciled links
          </span>
          <div className="flex-1" />
          <Label className={cn(ACCOUNTS_FILTER_LABEL_CLASS, "mb-0")}>Bulk Bank Date</Label>
          <input
            type="date"
            value={bulkBankDate}
            onChange={(e) => setBulkBankDate(e.target.value)}
            className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[140px]")}
          />
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            disabled={selectedIds.size === 0}
            onClick={handleBulkApply}
          >
            <Check className="w-3.5 h-3.5" />
            Apply to {selectedIds.size || 0} selected
          </Button>
        </div>

        <div className="flex-1 min-h-0 flex flex-col border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="flex-1 min-h-0 overflow-auto">
            {loading ? (
              <AccountsTable minWidth={1100}>
                <AccountsTableHead>
                  <AccountsTableHeadRow>
                    {Array.from({ length: 10 }).map((_, i) => (
                      <AccountsTableHeadCell key={i}>&nbsp;</AccountsTableHeadCell>
                    ))}
                  </AccountsTableHeadRow>
                </AccountsTableHead>
                <AccountsTableBody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonRow key={i} cols={10} />
                  ))}
                </AccountsTableBody>
              </AccountsTable>
            ) : (
              <BooksTable
                rows={pageRows}
                empty={filteredBooks.length === 0}
                selectedIds={selectedIds}
                allPageSelected={allPageSelected}
                onToggleAll={() => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (allPageSelected) {
                      selectablePageIds.forEach((id) => next.delete(id));
                    } else {
                      selectablePageIds.forEach((id) => next.add(id));
                    }
                    return next;
                  });
                }}
                onToggleOne={(id) => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                onInlineSave={handleInlineBankDateSave}
                onViewVoucher={openVoucher}
                onUndo={(linkId) => setUndoLinkId(linkId)}
              />
            )}
          </div>
          <div className="flex-shrink-0 border-t border-border bg-muted/20">
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={filteredBooks.length}
              onPageChange={setPage}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPage(1);
              }}
              recordLabel="rows"
            />
          </div>
        </div>
      </AccountsPageShell>

      <BankReconTallyUndoDialog
        open={!!undoLinkId}
        onClose={() => setUndoLinkId(null)}
        linkId={undoLinkId}
        onDone={() => {
          refresh();
          setToast({ msg: "Reconciliation undone. Entry is Unreconciled again.", type: "success" });
        }}
      />
      <BankReconManualVoucherDialog
        open={!!viewBook}
        onClose={() => setViewBook(null)}
        book={viewBook}
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
        <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100">
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
  const [draftDates, setDraftDates] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  return (
    <AccountsTable minWidth={1200}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <AccountsTableHeadCell className="w-10">
            <input
              type="checkbox"
              className="w-3.5 h-3.5 rounded accent-brand-600"
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
          <AccountsTableHeadCell>Bank Date</AccountsTableHeadCell>
          <AccountsTableHeadCell>Status</AccountsTableHeadCell>
          <AccountsTableHeadCell className="w-28">Action</AccountsTableHeadCell>
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {empty ? (
          <AccountsTableEmpty
            colSpan={11}
            message="No book transactions match the current filters."
          />
        ) : (
          rows.map((row) => {
            const isReconciled = row.status === "RECONCILED";
            const draft = draftDates[row.id] ?? row.bankDate ?? "";
            const err = errors[row.id];
            return (
              <AccountsTableRow key={row.id} className="group">
                <AccountsTableCell>
                  <input
                    type="checkbox"
                    className="w-3.5 h-3.5 rounded accent-brand-600"
                    disabled={isReconciled}
                    checked={selectedIds.has(row.id)}
                    onChange={() => onToggleOne(row.id)}
                    aria-label={`Select ${row.voucherNumber}`}
                  />
                </AccountsTableCell>
                <AccountsTableCell>{row.voucherDate}</AccountsTableCell>
                <AccountsTableCell className="max-w-[200px]">
                  <button
                    type="button"
                    className="text-left text-xs font-semibold text-foreground hover:text-brand-700 hover:underline"
                    onClick={() => onViewVoucher(row)}
                  >
                    {row.particulars}
                  </button>
                </AccountsTableCell>
                <AccountsTableCell>{row.voucherType}</AccountsTableCell>
                <AccountsTableCell mono className="text-brand-700">
                  {row.voucherNumber}
                </AccountsTableCell>
                <AccountsTableCell className="font-mono text-[11px]">
                  {row.instrumentNumber || "—"}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {moneyOrDash(row.deposit)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {moneyOrDash(row.withdrawal)}
                </AccountsTableCell>
                <AccountsTableCell>
                  {isReconciled ? (
                    <span className="text-xs font-medium">{row.bankDate ?? "—"}</span>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="date"
                          value={draft}
                          onChange={(e) => {
                            setDraftDates((d) => ({ ...d, [row.id]: e.target.value }));
                            setErrors((er) => {
                              const next = { ...er };
                              delete next[row.id];
                              return next;
                            });
                          }}
                          className={cn(
                            "h-8 w-[132px] px-2 text-xs border rounded-lg bg-background",
                            err ? "border-red-400" : "border-border",
                          )}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 px-2 text-[11px] gap-1 bg-brand-600 hover:bg-brand-700 text-white"
                          onClick={() => {
                            const error = onInlineSave(row, draft);
                            if (error) {
                              setErrors((er) => ({ ...er, [row.id]: error }));
                              return;
                            }
                            setDraftDates((d) => {
                              const next = { ...d };
                              delete next[row.id];
                              return next;
                            });
                          }}
                        >
                          <Save className="w-3 h-3" />
                          Save
                        </Button>
                      </div>
                      {err && <p className="text-[10px] text-red-600 max-w-[220px]">{err}</p>}
                    </div>
                  )}
                </AccountsTableCell>
                <AccountsTableCell>
                  <BankReconTallyStatusBadge status={isReconciled ? "RECONCILED" : "UNRECONCILED"} />
                </AccountsTableCell>
                <AccountsTableCell>
                  <RowActions>
                    <DropdownMenuItem onClick={() => onViewVoucher(row)}>
                      View Voucher
                    </DropdownMenuItem>
                    {row.editHref && (
                      <DropdownMenuItem asChild>
                        <Link href={row.editHref}>Edit Voucher</Link>
                      </DropdownMenuItem>
                    )}
                    {isReconciled && row.linkId && (
                      <DropdownMenuItem onClick={() => onUndo(row.linkId!)}>
                        Undo Reconciliation
                      </DropdownMenuItem>
                    )}
                  </RowActions>
                </AccountsTableCell>
              </AccountsTableRow>
            );
          })
        )}
      </AccountsTableBody>
    </AccountsTable>
  );
}

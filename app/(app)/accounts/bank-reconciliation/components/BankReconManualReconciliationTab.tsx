"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Download,
  Eye,
  Link2,
  RotateCcw,
  Sparkles,
  X,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AccountsSummaryCards } from "@/components/accounts/AccountsSummaryCards";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportSearchFilter,
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/components/accounts/ReportFilters";
import { formatMoney, formatMoneyOrDash } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  getBankReconAccountById,
  maskAccountNumber,
} from "../bank-reconciliation-v2-data";
import type {
  ManualReconBookRow,
  ManualReconStatementRow,
  ManualReconViewMode,
  ManualReconciliationStatus,
} from "@/lib/accounts/bank-recon-manual-recon-types";
import {
  accountHasStatement,
  computeDifferenceSummary,
  computeSelectionSummary,
  enrichBookRows,
  enrichStatementRows,
  loadAllBookTargetsForRecon,
  saveManualReconciliation,
} from "@/lib/accounts/bank-recon-manual-recon-service";
import { loadBankReconTransactions } from "@/lib/accounts/bank-recon-register";
import { bankReconCompletePath } from "../reconciliation-utils";
import { BankReconReconciliationStatusBadge } from "./BankReconBadges";
import { BankReconManualReconAllocationDialog } from "./BankReconManualReconAllocationDialog";
import { BankReconManualReconBulkDateDialog } from "./BankReconManualReconBulkDateDialog";
import { BankReconManualReconClearDialog } from "./BankReconManualReconClearDialog";
import { BankReconManualReconDetailsSheet } from "./BankReconManualReconDetailsSheet";
import { BankReconManualReconUndoDialog } from "./BankReconManualReconUndoDialog";

const VIEW_MODES: { id: ManualReconViewMode; label: string }[] = [
  { id: "book_only", label: "Book Entries Only" },
  { id: "side_by_side", label: "Side-by-Side Matching" },
  { id: "reconciled", label: "Reconciled Entries" },
  { id: "unreconciled", label: "Unreconciled Entries" },
  { id: "all", label: "All Entries" },
];

const QUICK_STATUS_CHIPS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "Unreconciled", label: "Unreconciled" },
  { id: "Suggested", label: "Suggested" },
  { id: "Partially Reconciled", label: "Partial" },
  { id: "Reconciled", label: "Reconciled" },
  { id: "book_only", label: "Book Only" },
  { id: "statement_only", label: "Statement Only" },
];

function ReconStatusPill({ status }: { status: ManualReconciliationStatus | string }) {
  return <BankReconReconciliationStatusBadge status={status} />;
}

interface BankReconManualReconciliationTabProps {
  bankAccountId: string;
  registerTick?: number;
  onRefresh?: () => void;
}

export function BankReconManualReconciliationTab({
  bankAccountId,
  registerTick = 0,
  onRefresh,
}: BankReconManualReconciliationTabProps) {
  const router = useRouter();
  const account = getBankReconAccountById(bankAccountId);
  const hasStatement = accountHasStatement(bankAccountId);

  const [viewMode, setViewMode] = useState<ManualReconViewMode>(
    hasStatement ? "side_by_side" : "book_only",
  );
  const [periodFrom, setPeriodFrom] = useState(account?.statementPeriodFrom ?? "");
  const [periodTo, setPeriodTo] = useState(account?.statementPeriodTo ?? "");
  const [search, setSearch] = useState("");
  const [statusChip, setStatusChip] = useState("all");
  const [flowFilter, setFlowFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const [unmatchedOnly, setUnmatchedOnly] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState<Set<string>>(new Set());
  const [selectedStmtIds, setSelectedStmtIds] = useState<Set<string>>(new Set());
  const [bookPage, setBookPage] = useState(1);
  const [stmtPage, setStmtPage] = useState(1);
  const [pageSize] = useState(15);
  const [pendingBookDates, setPendingBookDates] = useState<Record<string, string>>({});
  const [allocOpen, setAllocOpen] = useState(false);
  const [bulkDateOpen, setBulkDateOpen] = useState(false);
  const [clearBookId, setClearBookId] = useState<string | null>(null);
  const [undoGroupId, setUndoGroupId] = useState<string | null>(null);
  const [detailsGroupId, setDetailsGroupId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const { bookRows, stmtRows, diffSummary } = useMemo(() => {
    void registerTick;
    const targets = loadAllBookTargetsForRecon(bankAccountId, periodFrom || undefined, periodTo || undefined);
    const books = enrichBookRows(bankAccountId, targets);
    const records = loadBankReconTransactions(bankAccountId);
    const stmts = enrichStatementRows(bankAccountId, records, targets);
    const diff = computeDifferenceSummary(bankAccountId);
    return { bookRows: books, stmtRows: stmts, diffSummary: diff };
  }, [bankAccountId, periodFrom, periodTo, registerTick]);

  const filterBook = useCallback(
    (rows: ManualReconBookRow[]) => {
      const q = search.trim().toLowerCase();
      return rows.filter((b) => {
        if (viewMode === "reconciled" && !["Reconciled", "Manually Cleared", "Partially Reconciled"].includes(b.reconciliationStatus)) return false;
        if (viewMode === "unreconciled" && b.reconciliationStatus !== "Unreconciled" && b.reconciliationStatus !== "Suggested") return false;
        if (statusChip === "Unreconciled" && b.reconciliationStatus !== "Unreconciled") return false;
        if (statusChip === "Suggested" && b.reconciliationStatus !== "Suggested") return false;
        if (statusChip === "Partially Reconciled" && b.reconciliationStatus !== "Partially Reconciled") return false;
        if (statusChip === "Reconciled" && !["Reconciled", "Manually Cleared"].includes(b.reconciliationStatus)) return false;
        if (statusChip === "book_only") return true;
        if (statusChip === "statement_only") return false;
        if (unmatchedOnly && b.availableAmount <= 0.009) return false;
        if (flowFilter === "deposit" && !b.deposit) return false;
        if (flowFilter === "withdrawal" && !b.withdrawal) return false;
        if (q) {
          const hay = `${b.voucherNo} ${b.partyLedger} ${b.reference} ${b.narration}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    },
    [search, statusChip, flowFilter, unmatchedOnly, viewMode],
  );

  const filterStmt = useCallback(
    (rows: ManualReconStatementRow[]) => {
      const q = search.trim().toLowerCase();
      return rows.filter((s) => {
        if (viewMode === "book_only") return false;
        if (viewMode === "reconciled" && !["Reconciled", "Partially Reconciled"].includes(s.reconciliationStatus)) return false;
        if (viewMode === "unreconciled" && s.reconciliationStatus !== "Unreconciled" && s.reconciliationStatus !== "Suggested") return false;
        if (statusChip === "statement_only") return s.reconciliationStatus === "Unreconciled";
        if (statusChip === "book_only") return false;
        if (statusChip !== "all" && statusChip !== "statement_only" && statusChip !== "book_only") {
          if (s.reconciliationStatus !== statusChip && statusChip !== "Reconciled") return false;
          if (statusChip === "Reconciled" && s.reconciliationStatus !== "Reconciled") return false;
        }
        if (unmatchedOnly && s.availableAmount <= 0.009) return false;
        if (flowFilter === "deposit" && !s.deposit) return false;
        if (flowFilter === "withdrawal" && !s.withdrawal) return false;
        if (q) {
          const hay = `${s.reference} ${s.narration} ${s.chequeNo ?? ""}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
    },
    [search, statusChip, flowFilter, unmatchedOnly, viewMode],
  );

  const filteredBooks = useMemo(() => filterBook(bookRows), [bookRows, filterBook]);
  const filteredStmts = useMemo(() => filterStmt(stmtRows), [stmtRows, filterStmt]);

  const paginatedBooks = useMemo(() => {
    const start = (bookPage - 1) * pageSize;
    return filteredBooks.slice(start, start + pageSize);
  }, [filteredBooks, bookPage, pageSize]);

  const paginatedStmts = useMemo(() => {
    const start = (stmtPage - 1) * pageSize;
    return filteredStmts.slice(start, start + pageSize);
  }, [filteredStmts, stmtPage, pageSize]);

  const selection = useMemo(
    () => computeSelectionSummary(bookRows, stmtRows, selectedBookIds, selectedStmtIds),
    [bookRows, stmtRows, selectedBookIds, selectedStmtIds],
  );

  const toggleBook = (id: string) => {
    setSelectedBookIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleStmt = (id: string) => {
    setSelectedStmtIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedBookIds(new Set());
    setSelectedStmtIds(new Set());
  };

  const acceptSuggestion = (bookId: string, stmtId: string) => {
    setSelectedBookIds(new Set([bookId]));
    setSelectedStmtIds(new Set([stmtId]));
    setAllocOpen(true);
  };

  const handleReconcileSelected = () => {
    if (selection.direction === "mixed") {
      setToast("Cannot reconcile deposit against withdrawal.");
      return;
    }
    if (selectedStmtIds.size === 0 && selectedBookIds.size === 0) {
      setToast("Select at least one book entry.");
      return;
    }
    setAllocOpen(true);
  };

  const handleSaveAllocations = (
    allocations: Parameters<typeof saveManualReconciliation>[0]["allocations"],
    groupRemark: string,
  ) => {
    const result = saveManualReconciliation({
      bankAccountId,
      allocations,
      groupRemark,
      requireManyToManyConfirm: selection.matchType === "Many-to-Many",
    });
    if (!result.ok) {
      setToast(result.error ?? "Failed to save.");
      return;
    }
    setToast("Reconciliation saved.");
    setAllocOpen(false);
    clearSelection();
    onRefresh?.();
  };

  const handleInlineBookDateSave = (bookId: string) => {
    const date = pendingBookDates[bookId];
    if (!date) {
      setToast("Enter reconciliation date.");
      return;
    }
    setClearBookId(bookId);
  };

  const headerCards = [
    { label: "Book Balance", value: formatMoney(account?.bookBalance ?? 0), accent: true as const },
    { label: "Statement Balance", value: formatMoney(account?.statementBalance ?? 0) },
    { label: "Difference", value: formatMoney(diffSummary.currentDifference) },
    { label: "Selected Book", value: formatMoney(selection.bookNet) },
    { label: "Selected Statement", value: formatMoney(selection.statementNet) },
    { label: "Selection Diff", value: formatMoney(selection.difference) },
  ];

  const renderBookTable = (compact?: boolean) => (
    <div className={cn("flex flex-col min-h-0 border border-border rounded-xl bg-white shadow-sm overflow-hidden", compact ? "flex-1" : "")}>
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Book Transactions</p>
        <span className="text-[11px] text-muted-foreground">{filteredBooks.length} rows</span>
      </div>
      <div className="overflow-auto max-h-[420px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-muted/40 border-b border-border">
            <tr>
              <th className="px-2 py-2 w-8" />
              <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Book Date</th>
              {!compact && <th className="px-2 py-2 text-left font-semibold">Voucher</th>}
              <th className="px-2 py-2 text-left font-semibold">Party</th>
              <th className="px-2 py-2 text-right font-semibold">Deposit</th>
              <th className="px-2 py-2 text-right font-semibold">Withdrawal</th>
              {viewMode === "book_only" && (
                <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">Recon Date</th>
              )}
              <th className="px-2 py-2 text-left font-semibold">Status</th>
              <th className="px-2 py-2 w-16" />
            </tr>
          </thead>
          <tbody>
            {paginatedBooks.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-muted-foreground">No book entries.</td>
              </tr>
            ) : (
              paginatedBooks.map((b) => (
                <tr key={b.id} className={cn("border-b border-border/60 hover:bg-muted/20", selectedBookIds.has(b.id) && "bg-brand-50/40")}>
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      className="accent-brand-600"
                      checked={selectedBookIds.has(b.id)}
                      disabled={b.availableAmount <= 0.009}
                      onChange={() => toggleBook(b.id)}
                    />
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{b.bookDate}</td>
                  {!compact && (
                    <td className="px-2 py-1.5">
                      <p className="font-mono text-brand-700 font-semibold">{b.voucherNo}</p>
                      <p className="text-[10px] text-muted-foreground">{b.voucherType}</p>
                    </td>
                  )}
                  <td className="px-2 py-1.5 max-w-[120px] truncate">{b.partyLedger}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatMoneyOrDash(b.deposit)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatMoneyOrDash(b.withdrawal)}</td>
                  {viewMode === "book_only" && (
                    <td className="px-2 py-1.5">
                      <Input
                        type="date"
                        className="h-7 text-[11px] w-[118px]"
                        value={pendingBookDates[b.id] ?? b.reconciliationDate ?? ""}
                        disabled={b.availableAmount <= 0.009}
                        onChange={(e) => setPendingBookDates((p) => ({ ...p, [b.id]: e.target.value }))}
                      />
                    </td>
                  )}
                  <td className="px-2 py-1.5">
                    <ReconStatusPill status={b.reconciliationStatus} />
                    {b.suggestedStatementId ? (
                      <button
                        type="button"
                        className="block text-[10px] text-amber-700 font-semibold mt-0.5 hover:underline"
                        onClick={() => acceptSuggestion(b.id, b.suggestedStatementId!)}
                      >
                        <Sparkles className="w-3 h-3 inline mr-0.5" />
                        {b.suggestedConfidence}%
                      </button>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5">
                    {viewMode === "book_only" && b.availableAmount > 0.009 ? (
                      <button type="button" className="text-[10px] text-brand-600 hover:underline" onClick={() => handleInlineBookDateSave(b.id)}>
                        Save
                      </button>
                    ) : b.groupId ? (
                      <button type="button" className="p-1 hover:bg-muted rounded" onClick={() => setDetailsGroupId(b.groupId)}>
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <AccountsTablePagination
        page={bookPage}
        pageSize={pageSize}
        totalRecords={filteredBooks.length}
        onPageChange={setBookPage}
      />
    </div>
  );

  const renderStmtTable = () => (
    <div className="flex flex-col min-h-0 flex-1 border border-border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground">Statement Transactions</p>
        <span className="text-[11px] text-muted-foreground">{filteredStmts.length} rows</span>
      </div>
      <div className="overflow-auto max-h-[420px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 z-10 bg-muted/40 border-b border-border">
            <tr>
              <th className="px-2 py-2 w-8" />
              <th className="px-2 py-2 text-left font-semibold">Stmt Date</th>
              <th className="px-2 py-2 text-left font-semibold">Value Date</th>
              <th className="px-2 py-2 text-left font-semibold">Reference</th>
              <th className="px-2 py-2 text-right font-semibold">Deposit</th>
              <th className="px-2 py-2 text-right font-semibold">Withdrawal</th>
              <th className="px-2 py-2 text-left font-semibold">Match</th>
              <th className="px-2 py-2 text-left font-semibold">Status</th>
              <th className="px-2 py-2 w-10" />
            </tr>
          </thead>
          <tbody>
            {paginatedStmts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted-foreground">No statement entries.</td>
              </tr>
            ) : (
              paginatedStmts.map((s) => (
                <tr key={s.id} className={cn("border-b border-border/60 hover:bg-muted/20", selectedStmtIds.has(s.id) && "bg-brand-50/40")}>
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      className="accent-brand-600"
                      checked={selectedStmtIds.has(s.id)}
                      disabled={s.availableAmount <= 0.009}
                      onChange={() => toggleStmt(s.id)}
                    />
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{s.statementDate}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{s.valueDate}</td>
                  <td className="px-2 py-1.5 max-w-[100px] truncate">{s.reference || s.chequeNo || "—"}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatMoneyOrDash(s.deposit)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{formatMoneyOrDash(s.withdrawal)}</td>
                  <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{s.matchStatus}</td>
                  <td className="px-2 py-1.5">
                    <ReconStatusPill status={s.reconciliationStatus} />
                    {s.suggestedBookTargetId ? (
                      <button
                        type="button"
                        className="block text-[10px] text-amber-700 font-semibold mt-0.5 hover:underline"
                        onClick={() => acceptSuggestion(s.suggestedBookTargetId!, s.id)}
                      >
                        Suggested {s.suggestedConfidence}%
                      </button>
                    ) : null}
                  </td>
                  <td className="px-2 py-1.5">
                    {s.groupId ? (
                      <button type="button" className="p-1 hover:bg-muted rounded" onClick={() => setDetailsGroupId(s.groupId)}>
                        <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <AccountsTablePagination
        page={stmtPage}
        pageSize={pageSize}
        totalRecords={filteredStmts.length}
        onPageChange={setStmtPage}
      />
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Reconciliation Header */}
      <div className="rounded-xl border border-border bg-white shadow-sm px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-navy-700">{account?.bankName ?? "Bank"}</p>
            <p className="text-[11px] text-muted-foreground">
              {account?.accountNickname} · {maskAccountNumber(account?.accountNumber ?? "")} · {account?.accountType}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Period: {periodFrom || "—"} to {periodTo || "—"} · Last reconciled: {account?.lastReconciledDate ?? "—"}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button type="button" size="sm" className="h-7 text-[11px] gap-1 bg-brand-600 hover:bg-brand-700 text-white" onClick={handleReconcileSelected}>
              <Link2 className="w-3 h-3" /> Reconcile Selected
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => selectedBookIds.size === 1 ? setClearBookId(Array.from(selectedBookIds)[0]!) : setToast("Select one book entry to mark cleared.")}>
              Mark Cleared
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" disabled={selectedBookIds.size === 0} onClick={() => setBulkDateOpen(true)}>
              Bulk Recon Date
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" onClick={clearSelection}>
              <X className="w-3 h-3" /> Clear
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" disabled={!detailsGroupId} onClick={() => detailsGroupId && setUndoGroupId(detailsGroupId)}>
              <RotateCcw className="w-3 h-3" /> Undo
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => router.push(bankReconCompletePath(bankAccountId, { periodFrom, periodTo }))}>
              <CheckCircle2 className="w-3 h-3" /> Complete Reconciliation
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-7 text-[11px]" disabled title="Export planned for next step">
              <Download className="w-3 h-3" /> Export
            </Button>
          </div>
        </div>
        <AccountsSummaryCards items={headerCards.slice(0, 3)} columns={3} className="px-0" />
        <AccountsSummaryCards items={headerCards.slice(3)} columns={3} className="px-0" />
      </div>

      {/* View Mode + Filters */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          {VIEW_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setViewMode(m.id)}
              className={cn(
                "h-7 px-2.5 text-[11px] rounded-lg border font-medium transition-colors",
                viewMode === m.id ? "bg-brand-600 text-white border-brand-600" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <ReportFilterRow>
          <ReportSearchFilter value={search} onChange={setSearch} placeholder="Search book / statement…" />
          <div className="space-y-0.5">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Period From</Label>
            <input type="date" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "w-[130px]")} />
          </div>
          <div className="space-y-0.5">
            <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Period To</Label>
            <input type="date" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "w-[130px]")} />
          </div>
          <div className="flex items-end gap-1 pb-0.5">
            {(["all", "deposit", "withdrawal"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFlowFilter(f)}
                className={cn(
                  "h-7 px-2 text-[11px] rounded-md border capitalize",
                  flowFilter === f ? "bg-brand-50 border-brand-200 text-brand-700" : "border-border text-muted-foreground",
                )}
              >
                {f}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-[11px] pb-1 cursor-pointer">
            <input type="checkbox" checked={unmatchedOnly} onChange={(e) => setUnmatchedOnly(e.target.checked)} className="accent-brand-600" />
            Unmatched only
          </label>
        </ReportFilterRow>
        <div className="flex flex-wrap gap-1">
          {QUICK_STATUS_CHIPS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setStatusChip(c.id)}
              className={cn(
                "h-6 px-2 text-[10px] rounded-md border font-medium",
                statusChip === c.id ? "bg-brand-50 border-brand-200 text-brand-700" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tables */}
      {viewMode === "side_by_side" || viewMode === "all" ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 min-h-[480px]">
          {renderBookTable(true)}
          {renderStmtTable()}
        </div>
      ) : viewMode === "book_only" ? (
        renderBookTable(false)
      ) : (
        <div className="space-y-3">
          {renderBookTable(false)}
          {hasStatement ? renderStmtTable() : null}
        </div>
      )}

      {/* Selected Match Summary */}
      {(selectedBookIds.size > 0 || selectedStmtIds.size > 0) && (
        <div className="sticky bottom-0 z-20 rounded-xl border border-brand-200 bg-brand-50/90 backdrop-blur px-4 py-2.5 flex flex-wrap items-center gap-3 text-xs shadow-sm">
          <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <span>Book: <strong>{selection.bookCount}</strong> ({formatMoney(selection.bookNet)})</span>
          <span>Statement: <strong>{selection.statementCount}</strong> ({formatMoney(selection.statementNet)})</span>
          <span>Diff: <strong className={selection.difference > 0.009 ? "text-red-600" : "text-emerald-700"}>{formatMoney(selection.difference)}</strong></span>
          {selection.matchType ? <span className="px-2 py-0.5 rounded-md bg-white border border-brand-200 font-semibold text-brand-700">{selection.matchType}</span> : null}
          {selection.direction === "mixed" ? <span className="text-red-600 font-semibold">Deposit cannot match withdrawal</span> : null}
          <Button type="button" size="sm" className="h-7 text-[11px] ml-auto bg-brand-600 hover:bg-brand-700 text-white" onClick={handleReconcileSelected}>
            Open Allocation
          </Button>
        </div>
      )}

      {/* Difference Summary */}
      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Unreconciled Difference Summary (Review Only)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 text-[11px]">
          {[
            ["Opening Book", formatMoney(diffSummary.openingBookBalance)],
            ["Book Deposits", formatMoney(diffSummary.bookDeposits)],
            ["Book Withdrawals", formatMoney(diffSummary.bookWithdrawals)],
            ["Closing Book", formatMoney(diffSummary.closingBookBalance)],
            ["Stmt Deposits", formatMoney(diffSummary.statementDeposits)],
            ["Stmt Withdrawals", formatMoney(diffSummary.statementWithdrawals)],
            ["Reconciled Dep.", formatMoney(diffSummary.reconciledDeposits)],
            ["Reconciled Wdr.", formatMoney(diffSummary.reconciledWithdrawals)],
            ["Unpresented Chq.", formatMoney(diffSummary.unpresentedCheques)],
            ["Deposits in Transit", formatMoney(diffSummary.depositsInTransit)],
            ["Book-only Txns", String(diffSummary.bookOnlyCount)],
            ["Statement-only", String(diffSummary.statementOnlyCount)],
          ].map(([k, v]) => (
            <div key={k} className="bg-white rounded-lg border border-border/60 px-2 py-1.5">
              <p className="text-muted-foreground">{k}</p>
              <p className="font-semibold tabular-nums">{v}</p>
            </div>
          ))}
        </div>
      </div>

      <BankReconManualReconAllocationDialog
        open={allocOpen}
        onClose={() => setAllocOpen(false)}
        books={bookRows}
        statements={stmtRows}
        selectedBookIds={selectedBookIds}
        selectedStmtIds={selectedStmtIds}
        matchType={selection.matchType}
        onConfirm={handleSaveAllocations}
      />

      <BankReconManualReconBulkDateDialog
        bankAccountId={bankAccountId}
        bookTargetIds={Array.from(selectedBookIds)}
        depositTotal={selection.bookDepositTotal}
        withdrawalTotal={selection.bookWithdrawalTotal}
        open={bulkDateOpen}
        onClose={() => setBulkDateOpen(false)}
        onSaved={() => {
          setToast("Bulk reconciliation date applied.");
          clearSelection();
          onRefresh?.();
        }}
      />

      <BankReconManualReconClearDialog
        bankAccountId={bankAccountId}
        bookTargetId={clearBookId}
        bookLabel={clearBookId ? bookRows.find((b) => b.id === clearBookId)?.voucherNo : undefined}
        defaultReconciliationDate={clearBookId ? pendingBookDates[clearBookId] : undefined}
        open={Boolean(clearBookId)}
        onClose={() => setClearBookId(null)}
        onSaved={() => {
          setToast("Marked cleared without statement.");
          onRefresh?.();
        }}
      />

      <BankReconManualReconUndoDialog
        groupId={undoGroupId}
        open={Boolean(undoGroupId)}
        onClose={() => setUndoGroupId(null)}
        onUndone={() => {
          setToast("Reconciliation undone.");
          setDetailsGroupId(null);
          onRefresh?.();
        }}
      />

      <BankReconManualReconDetailsSheet
        groupId={detailsGroupId}
        bankAccountId={bankAccountId}
        open={Boolean(detailsGroupId)}
        onClose={() => setDetailsGroupId(null)}
        onUndo={(gid) => {
          setDetailsGroupId(null);
          setUndoGroupId(gid);
        }}
      />

      {toast ? (
        <div className="fixed bottom-5 right-5 z-[100] px-4 py-3 rounded-xl shadow-xl bg-emerald-600 text-white text-sm font-medium animate-in slide-in-from-bottom-2">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

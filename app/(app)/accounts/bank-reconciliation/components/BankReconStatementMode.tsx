"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Info, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import { AccountsTableEmpty } from "@/components/accounts/AccountsTableListing";
import { formatMoney, roundMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { BankReconciliationService } from "@/services/bank-reconciliation.service";
import {
  formatApiDateTime,
  formatImportPeriod,
  mapBookEntryToStatementBookRow,
  mapImportToUi,
  mapMatchToUiRow,
  mapStatementLineToUiRow,
  parseApiAmount,
  type ReconciledMatchUi,
  type StatementBookRowUi,
  type StatementLineRowUi,
} from "@/lib/accounts/bank-recon-api-mappers";
import { formatDisplayDate } from "@/lib/accounts/date-display";

type StatementTab = "match" | "unmatched" | "reconciled" | "history";

const TABS: { id: StatementTab; label: string }[] = [
  { id: "match", label: "Match Entries" },
  { id: "unmatched", label: "Unmatched Bank Entries" },
  { id: "reconciled", label: "Reconciled" },
  { id: "history", label: "Statement History" },
];

const ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];
const ACCEPTED_MIME =
  "text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function moneyOrDash(n: number): string {
  return n ? formatMoney(n) : "—";
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: "amber" | "emerald" | "slate" | "navy";
}) {
  const cls =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700"
        : tone === "navy"
          ? "bg-navy-50 text-navy-700"
          : "bg-slate-100 text-slate-600";
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold", cls)}>
      {label}
    </span>
  );
}

function isSupportedStatementFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return false;
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function BankReconStatementMode({
  bankAccountId,
  dateFrom,
  dateTo,
  onToast,
  onRefresh,
}: {
  bankAccountId: string;
  dateFrom: string;
  dateTo: string;
  onToast: (msg: string, type: "success" | "error") => void;
  onRefresh: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<StatementTab>("match");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [matching, setMatching] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [viewMatch, setViewMatch] = useState<ReconciledMatchUi | null>(null);
  const [unreconcileTarget, setUnreconcileTarget] = useState<ReconciledMatchUi | null>(null);
  const [unreconcileReason, setUnreconcileReason] = useState("");
  const [unreconcileSaving, setUnreconcileSaving] = useState(false);

  const [latestImport, setLatestImport] = useState<ReturnType<typeof mapImportToUi> | null>(null);
  const [importWarning, setImportWarning] = useState<string | null>(null);
  const [books, setBooks] = useState<StatementBookRowUi[]>([]);
  const [lines, setLines] = useState<StatementLineRowUi[]>([]);
  const [unmatchedLines, setUnmatchedLines] = useState<StatementLineRowUi[]>([]);
  const [matches, setMatches] = useState<ReconciledMatchUi[]>([]);
  const [imports, setImports] = useState<ReturnType<typeof mapImportToUi>[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [importsRes, booksRes, linesRes, unmatchedRes, matchesRes] = await Promise.all([
        BankReconciliationService.getStatementImports({
          bank_account_id: bankAccountId,
          page: 1,
          page_size: 50,
        }),
        BankReconciliationService.getBookEntries({
          bank_account_id: bankAccountId,
          reconciliation_status: "UNRECONCILED",
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page: 1,
          page_size: 100,
        }),
        BankReconciliationService.getStatementLines({
          bank_account_id: bankAccountId,
          unmatched_only: true,
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
          page: 1,
          page_size: 100,
        }),
        BankReconciliationService.getStatementLines({
          bank_account_id: bankAccountId,
          unmatched_only: true,
          page: 1,
          page_size: 100,
        }),
        BankReconciliationService.getMatches({
          bank_account_id: bankAccountId,
          page: 1,
          page_size: 100,
        }),
      ]);

      const mappedImports = importsRes.items.map(mapImportToUi);
      setImports(mappedImports);
      setLatestImport(mappedImports[0] ?? null);
      setBooks(booksRes.items.map(mapBookEntryToStatementBookRow));
      setLines(linesRes.items.map(mapStatementLineToUiRow));
      setUnmatchedLines(unmatchedRes.items.map(mapStatementLineToUiRow));
      setMatches(matchesRes.items.map(mapMatchToUiRow));
      setImportWarning(null);
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to load statement data.", "error");
    } finally {
      setLoading(false);
    }
  }, [bankAccountId, dateFrom, dateTo, onToast]);

  useEffect(() => {
    setSelectedBookId(null);
    setSelectedLineId(null);
    setTab("match");
    void loadData();
  }, [bankAccountId, loadData]);

  const selectedBook = books.find((b) => b.id === selectedBookId) ?? null;
  const selectedLine = lines.find((l) => l.id === selectedLineId) ?? null;

  const bookAmt = selectedBook
    ? selectedBook.deposit > 0
      ? selectedBook.deposit
      : selectedBook.withdrawal
    : 0;
  const lineAmt = selectedLine
    ? selectedLine.deposit > 0
      ? selectedLine.deposit
      : selectedLine.withdrawal
    : 0;
  const amountDiff =
    selectedBook && selectedLine ? roundMoney(Math.abs(bookAmt - lineAmt)) : 0;
  const amountsMatch = !!(selectedBook && selectedLine && bookAmt === lineAmt && bookAmt > 0);
  const bookIsDeposit = (selectedBook?.deposit ?? 0) > 0;
  const lineIsDeposit = (selectedLine?.deposit ?? 0) > 0;
  const directionCompatible = bookIsDeposit === lineIsDeposit;
  const refMatch =
    selectedBook && selectedLine
      ? !!(
          selectedBook.instrumentNumber &&
          selectedLine.reference &&
          (selectedBook.instrumentNumber === selectedLine.reference ||
            selectedBook.instrumentNumber.includes(selectedLine.reference) ||
            selectedLine.reference.includes(selectedBook.instrumentNumber))
        )
      : false;
  const canMatch = !!(selectedBook && selectedLine && amountsMatch && directionCompatible);

  const handleUploadClick = () => fileRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isSupportedStatementFile(file)) {
      onToast(
        "PDF bank statements are not supported yet. Please upload CSV/XLS/XLSX.",
        "error",
      );
      return;
    }
    setUploading(true);
    try {
      const result = await BankReconciliationService.uploadStatement(bankAccountId, file);
      const mapped = mapImportToUi(result.import);
      setLatestImport(mapped);
      if (result.duplicateFile || result.import.importStatus === "DUPLICATE_FILE") {
        onToast(
          "This statement file was already uploaded. No duplicate transactions were created.",
          "success",
        );
      } else {
        onToast(`Statement imported: ${result.import.originalFileName}`, "success");
      }
      if (result.warnings?.length) {
        setImportWarning(result.warnings.join(" "));
      }
      if (result.import.errorRows > 0) {
        try {
          const detail = await BankReconciliationService.getStatementImportDetail(
            result.import.bankStatementImportId,
          );
          if (detail.errorDetails) {
            setImportWarning(
              "Some rows could not be automatically classified as new or duplicate. Review import details.",
            );
          }
        } catch {
          // non-fatal
        }
      }
      await loadData();
      onRefresh();
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to upload statement.", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleMatch = async () => {
    if (!selectedBook || !selectedLine) return;
    setMatching(true);
    try {
      await BankReconciliationService.statementReconcile({
        bank_account_id: bankAccountId,
        bank_detail_id: selectedBook.id,
        bank_statement_line_id: selectedLine.id,
      });
      setSelectedBookId(null);
      setSelectedLineId(null);
      await loadData();
      onRefresh();
      onToast("Matched & reconciled successfully.", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to match and reconcile.", "error");
    } finally {
      setMatching(false);
    }
  };

  const confirmUnreconcile = async () => {
    if (!unreconcileTarget) return;
    if (!unreconcileReason.trim()) {
      onToast("Audit reason is required.", "error");
      return;
    }
    setUnreconcileSaving(true);
    try {
      await BankReconciliationService.unreconcile({
        bank_account_id: bankAccountId,
        bank_detail_ids: [unreconcileTarget.bankDetailId],
        reason: unreconcileReason.trim(),
      });
      setUnreconcileTarget(null);
      setUnreconcileReason("");
      setViewMatch(null);
      await loadData();
      onRefresh();
      onToast("Match unreconciled.", "success");
    } catch (err) {
      onToast(err instanceof Error ? err.message : "Failed to unreconcile.", "error");
    } finally {
      setUnreconcileSaving(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
      <div className="flex-shrink-0 flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-white px-3 py-2">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_MIME}
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
        <Button
          type="button"
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={handleUploadClick}
          disabled={uploading}
        >
          <Upload className="w-3.5 h-3.5" />
          {uploading ? "Uploading…" : "Upload Bank Statement"}
        </Button>
        <span className="text-[10px] text-muted-foreground">CSV / XLS / XLSX</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-muted/60"
              aria-label="Duplicate import info"
            >
              <Info className="w-3.5 h-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs text-[11px]">
            Previously imported bank transactions are not added again. Only new statement
            transactions are added.
          </TooltipContent>
        </Tooltip>
      </div>

      {latestImport && <ImportSummaryCard importRow={latestImport} />}
      {importWarning && (
        <div className="flex-shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
          {importWarning}
        </div>
      )}

      <div className="flex-shrink-0 flex items-center gap-1 border-b border-border/60 px-0.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "h-8 px-3 text-[11px] font-semibold border-b-2 -mb-px transition-colors",
              tab === t.id
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.id === "unmatched" && unmatchedLines.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-100 px-1 text-[9px] font-bold text-amber-700">
                {unmatchedLines.length}
              </span>
            )}
            {t.id === "reconciled" && matches.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-100 px-1 text-[9px] font-bold text-emerald-700">
                {matches.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="py-14 text-center text-sm text-muted-foreground">Loading statement data…</div>
        ) : (
          <>
            {tab === "match" && (
              <MatchEntriesTab
                books={books}
                lines={lines}
                selectedBookId={selectedBookId}
                selectedLineId={selectedLineId}
                onSelectBook={setSelectedBookId}
                onSelectLine={setSelectedLineId}
                selectedBook={selectedBook}
                selectedLine={selectedLine}
                bookAmt={bookAmt}
                lineAmt={lineAmt}
                amountDiff={amountDiff}
                amountsMatch={amountsMatch}
                directionCompatible={directionCompatible}
                refMatch={refMatch}
                canMatch={canMatch}
                matching={matching}
                onMatch={() => void handleMatch()}
                hasStatement={imports.length > 0}
              />
            )}
            {tab === "unmatched" && <UnmatchedBankTab lines={unmatchedLines} />}
            {tab === "reconciled" && (
              <ReconciledTab
                matches={matches}
                onView={setViewMatch}
                onUnreconcile={setUnreconcileTarget}
              />
            )}
            {tab === "history" && <HistoryTab imports={imports} />}
          </>
        )}
      </div>

      <Sheet open={!!viewMatch} onOpenChange={(o) => !o && setViewMatch(null)}>
        <SheetContent className="max-w-[480px]">
          <SheetHeader>
            <SheetTitle>View Match</SheetTitle>
            <SheetDescription>
              Mode: {viewMatch?.mode ?? "—"}
            </SheetDescription>
          </SheetHeader>
          {viewMatch && (
            <SheetBody className="space-y-4">
              <MatchDetailBlock
                title="PVB Book Entry"
                rows={[
                  ["Voucher Date", formatDisplayDate(viewMatch.bookDate)],
                  ["Voucher Type", viewMatch.voucherType],
                  ["Voucher No.", viewMatch.voucherNumber],
                  ["Particular", viewMatch.particulars],
                  ["UTR", viewMatch.instrumentNumber || "—"],
                  ["Amount", formatMoney(viewMatch.amount)],
                ]}
              />
              {viewMatch.mode === "Statement" ? (
                <MatchDetailBlock
                  title="Matched Bank Statement Entry"
                  rows={[
                    ["Bank Date", formatDisplayDate(viewMatch.bankDate)],
                    ["Value Date", formatDisplayDate(viewMatch.raw.statementTransactionDate ?? viewMatch.bankDate)],
                    ["Description", viewMatch.bankDescription],
                    ["Reference", viewMatch.instrumentNumber || "—"],
                    [
                      "Amount",
                      viewMatch.raw.statementAmount
                        ? formatMoney(parseApiAmount(viewMatch.raw.statementAmount))
                        : formatMoney(viewMatch.amount),
                    ],
                  ]}
                />
              ) : (
                <MatchDetailBlock
                  title="Matched Bank Statement Entry"
                  rows={[["Statement Entry", "Not applicable / Manual reconciliation"]]}
                />
              )}
              <MatchDetailBlock
                title="Reconciliation Information"
                rows={[
                  ["Reconciled By", viewMatch.reconciledBy],
                  ["Reconciled On", formatApiDateTime(viewMatch.reconciledOn)],
                  ["Mode", viewMatch.mode],
                ]}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 text-xs w-full"
                onClick={() => setUnreconcileTarget(viewMatch)}
              >
                Unreconcile
              </Button>
            </SheetBody>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!unreconcileTarget} onOpenChange={(o) => !o && setUnreconcileTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              Unreconcile
            </DialogTitle>
            <DialogDescription className="pt-1 text-xs">
              Are you sure you want to mark this transaction as unreconciled? The book and statement
              entries are not deleted.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={unreconcileReason}
            onChange={(e) => setUnreconcileReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border px-3 py-2 text-xs"
            placeholder="Audit reason (required)"
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setUnreconcileTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              disabled={unreconcileSaving || !unreconcileReason.trim()}
              onClick={() => void confirmUnreconcile()}
            >
              Unreconcile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ImportSummaryCard({
  importRow,
}: {
  importRow: ReturnType<typeof mapImportToUi>;
}) {
  return (
    <div className="flex-shrink-0 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px]">
        <SummaryPair label="Statement File" value={importRow.fileName} mono />
        <SummaryPair
          label="Period"
          value={formatImportPeriod(importRow.periodFrom, importRow.periodTo)}
        />
        <SummaryPair label="Uploaded" value={formatApiDateTime(importRow.uploadedAt)} />
        <SummaryPair label="Rows Read" value={String(importRow.rowsRead)} />
        <SummaryPair label="New Transactions" value={String(importRow.newTransactions)} />
        <SummaryPair label="Existing / Duplicate" value={String(importRow.duplicates)} />
        {importRow.errorRows > 0 && (
          <SummaryPair label="Error Rows" value={String(importRow.errorRows)} />
        )}
        <SummaryPair
          label="Statement Closing Balance"
          value={importRow.closingBalance ? formatMoney(importRow.closingBalance) : "—"}
        />
        <SummaryPair label="Import Status" value={importRow.status} />
      </div>
    </div>
  );
}

function SummaryPair({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <span className="inline-flex flex-col gap-0.5 min-w-0">
      <span className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">
        {label}
      </span>
      <span className={cn("font-semibold text-foreground truncate", mono && "font-mono text-[10px]")}>
        {value}
      </span>
    </span>
  );
}

function MatchEntriesTab({
  books,
  lines,
  selectedBookId,
  selectedLineId,
  onSelectBook,
  onSelectLine,
  selectedBook,
  selectedLine,
  bookAmt,
  lineAmt,
  amountDiff,
  amountsMatch,
  directionCompatible,
  refMatch,
  canMatch,
  matching,
  onMatch,
  hasStatement,
}: {
  books: StatementBookRowUi[];
  lines: StatementLineRowUi[];
  selectedBookId: string | null;
  selectedLineId: string | null;
  onSelectBook: (id: string | null) => void;
  onSelectLine: (id: string | null) => void;
  selectedBook: StatementBookRowUi | null;
  selectedLine: StatementLineRowUi | null;
  bookAmt: number;
  lineAmt: number;
  amountDiff: number;
  amountsMatch: boolean;
  directionCompatible: boolean;
  refMatch: boolean;
  canMatch: boolean;
  matching: boolean;
  onMatch: () => void;
  hasStatement: boolean;
}) {
  if (!hasStatement) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
        <p className="text-sm font-medium text-foreground">No bank statement uploaded</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          Upload a statement to begin matching book entries with bank lines.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-2">
      <section className="border border-border/70 rounded-lg bg-white overflow-hidden">
        <div className="h-8 px-3 flex items-center border-b border-border/60 bg-muted/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            PVB Book Entries
          </p>
          <span className="ml-2 text-[10px] text-muted-foreground">{books.length} unreconciled</span>
        </div>
        <AccountsTable minWidth={900}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell className="w-9" align="center">Select</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[90px]">Voucher Date</AccountsTableHeadCell>
              <AccountsTableHeadCell>Particulars</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[70px]">Type</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[110px]">Voucher No.</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[120px]">Instrument / UTR</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[90px]" align="right">Deposit</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[90px]" align="right">Withdrawal</AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {books.length === 0 ? (
              <AccountsTableEmpty colSpan={8} message="No unreconciled book entries." />
            ) : (
              books.map((row) => (
                <AccountsTableRow
                  key={row.id}
                  className={cn(selectedBookId === row.id && "bg-brand-50/60")}
                >
                  <AccountsTableCell align="center">
                    <input
                      type="radio"
                      name="stmt-book"
                      className="accent-brand-600"
                      checked={selectedBookId === row.id}
                      onChange={() => onSelectBook(row.id)}
                    />
                  </AccountsTableCell>
                  <AccountsTableCell className="tabular-nums">{formatDisplayDate(row.voucherDate)}</AccountsTableCell>
                  <AccountsTableCell className="truncate font-medium">{row.particulars}</AccountsTableCell>
                  <AccountsTableCell>{row.voucherType}</AccountsTableCell>
                  <AccountsTableCell mono className="text-brand-700">{row.voucherNumber}</AccountsTableCell>
                  <AccountsTableCell className="font-mono text-[10px]">{row.instrumentNumber || "—"}</AccountsTableCell>
                  <AccountsTableCell align="right" money>{moneyOrDash(row.deposit)}</AccountsTableCell>
                  <AccountsTableCell align="right" money>{moneyOrDash(row.withdrawal)}</AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </section>

      <section className="border border-border/70 rounded-lg bg-white overflow-hidden">
        <div className="h-8 px-3 flex items-center border-b border-border/60 bg-muted/20">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Bank Statement Entries
          </p>
          <span className="ml-2 text-[10px] text-muted-foreground">{lines.length} unmatched</span>
        </div>
        <AccountsTable minWidth={960}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell className="w-9" align="center">Select</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[90px]">Bank Date</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[90px]">Value Date</AccountsTableHeadCell>
              <AccountsTableHeadCell>Description</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[130px]">Reference / UTR</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[90px]" align="right">Deposit</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[90px]" align="right">Withdrawal</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[90px]" align="center">Match Status</AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {lines.length === 0 ? (
              <AccountsTableEmpty colSpan={8} message="No unmatched statement lines." />
            ) : (
              lines.map((row) => (
                <AccountsTableRow
                  key={row.id}
                  className={cn(selectedLineId === row.id && "bg-brand-50/60")}
                >
                  <AccountsTableCell align="center">
                    <input
                      type="radio"
                      name="stmt-line"
                      className="accent-brand-600"
                      checked={selectedLineId === row.id}
                      onChange={() => onSelectLine(row.id)}
                    />
                  </AccountsTableCell>
                  <AccountsTableCell className="tabular-nums">{formatDisplayDate(row.bankDate)}</AccountsTableCell>
                  <AccountsTableCell className="tabular-nums">{formatDisplayDate(row.valueDate)}</AccountsTableCell>
                  <AccountsTableCell className="truncate font-medium">{row.description}</AccountsTableCell>
                  <AccountsTableCell className="font-mono text-[10px]">{row.reference}</AccountsTableCell>
                  <AccountsTableCell align="right" money>{moneyOrDash(row.deposit)}</AccountsTableCell>
                  <AccountsTableCell align="right" money>{moneyOrDash(row.withdrawal)}</AccountsTableCell>
                  <AccountsTableCell align="center">
                    <StatusChip label={row.matchStatus} tone="amber" />
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </section>

      {(selectedBook || selectedLine) && (
        <div className="rounded-lg border border-border/70 bg-white px-3 py-2.5 flex flex-wrap items-center gap-4">
          <div className="space-y-1 text-[11px]">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
              Match Summary
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              <span>
                Book Amount{" "}
                <strong className="tabular-nums">{selectedBook ? formatMoney(bookAmt) : "—"}</strong>
              </span>
              <span>
                Statement Amount{" "}
                <strong className="tabular-nums">{selectedLine ? formatMoney(lineAmt) : "—"}</strong>
              </span>
              <span>
                Difference{" "}
                <strong className={cn("tabular-nums", amountDiff !== 0 && "text-red-700")}>
                  {selectedBook && selectedLine ? formatMoney(amountDiff) : "—"}
                </strong>
              </span>
            </div>
            {selectedBook && selectedLine && amountDiff > 0 && (
              <p className="text-red-600 text-[11px] font-medium">
                Amount Difference: {formatMoney(amountDiff)}
              </p>
            )}
            {selectedBook && selectedLine && !directionCompatible && (
              <p className="text-amber-700 text-[11px] font-medium">
                Deposit/withdrawal direction does not match between book and statement.
              </p>
            )}
            <div className="flex gap-3 pt-0.5">
              <span className={cn("font-medium", refMatch ? "text-emerald-700" : "text-muted-foreground")}>
                Reference Match {refMatch ? "✓" : "—"}
              </span>
              <span className={cn("font-medium", amountsMatch ? "text-emerald-700" : "text-muted-foreground")}>
                Amount Match {amountsMatch ? "✓" : "—"}
              </span>
            </div>
          </div>
          <div className="ml-auto">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white disabled:bg-muted disabled:text-muted-foreground"
              disabled={!canMatch || matching}
              onClick={onMatch}
            >
              <Check className="w-3.5 h-3.5" />
              Match & Reconcile
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function UnmatchedBankTab({ lines }: { lines: StatementLineRowUi[] }) {
  return (
    <div className="border border-border/70 rounded-lg bg-white overflow-hidden">
      <AccountsTable minWidth={980}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <AccountsTableHeadCell className="w-[90px]">Bank Date</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[90px]">Value Date</AccountsTableHeadCell>
            <AccountsTableHeadCell>Description</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[120px]">Reference</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[90px]" align="right">Deposit</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[90px]" align="right">Withdrawal</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[90px]" align="center">Status</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[160px]" align="center">Action</AccountsTableHeadCell>
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {lines.length === 0 ? (
            <AccountsTableEmpty colSpan={8} message="No unmatched bank entries." />
          ) : (
            lines.map((row) => (
              <AccountsTableRow key={row.id}>
                <AccountsTableCell className="tabular-nums">{formatDisplayDate(row.bankDate)}</AccountsTableCell>
                <AccountsTableCell className="tabular-nums">{formatDisplayDate(row.valueDate)}</AccountsTableCell>
                <AccountsTableCell className="font-medium">{row.description}</AccountsTableCell>
                <AccountsTableCell className="font-mono text-[10px]">{row.reference}</AccountsTableCell>
                <AccountsTableCell align="right" money>{moneyOrDash(row.deposit)}</AccountsTableCell>
                <AccountsTableCell align="right" money>{moneyOrDash(row.withdrawal)}</AccountsTableCell>
                <AccountsTableCell align="center">
                  <StatusChip label="Unmatched" tone="amber" />
                </AccountsTableCell>
                <AccountsTableCell align="center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled
                          className="h-7 text-[10px] px-2 opacity-70"
                        >
                          Create Accounting Entry
                          <span className="ml-1 text-[9px] text-muted-foreground">Coming Soon</span>
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs text-[11px]">
                      Accounting entry workflow will be configured after reconciliation design is
                      finalized.
                    </TooltipContent>
                  </Tooltip>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
    </div>
  );
}

function ReconciledTab({
  matches,
  onView,
  onUnreconcile,
}: {
  matches: ReconciledMatchUi[];
  onView: (m: ReconciledMatchUi) => void;
  onUnreconcile: (m: ReconciledMatchUi) => void;
}) {
  return (
    <div className="border border-border/70 rounded-lg bg-white overflow-hidden">
      <AccountsTable minWidth={1100}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <AccountsTableHeadCell className="w-[88px]">Book Date</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[88px]">Bank Date</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[70px]">Voucher Type</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[100px]">Voucher No.</AccountsTableHeadCell>
            <AccountsTableHeadCell>Particulars</AccountsTableHeadCell>
            <AccountsTableHeadCell>Bank Description</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[100px]" align="right">Amount</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[90px]">Reconciled By</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[120px]">Reconciled On</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[70px]" align="center">Mode</AccountsTableHeadCell>
            <AccountsTableHeadCell className="w-[130px]" align="center">Action</AccountsTableHeadCell>
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {matches.length === 0 ? (
            <AccountsTableEmpty colSpan={11} message="No statement matches yet. Use Match Entries." />
          ) : (
            matches.map((m) => (
              <AccountsTableRow key={`${m.bankDetailId}-${m.bankStatementLineId ?? "manual"}`}>
                <AccountsTableCell className="tabular-nums">{formatDisplayDate(m.bookDate)}</AccountsTableCell>
                <AccountsTableCell className="tabular-nums">{formatDisplayDate(m.bankDate)}</AccountsTableCell>
                <AccountsTableCell>{m.voucherType}</AccountsTableCell>
                <AccountsTableCell mono className="text-brand-700">{m.voucherNumber}</AccountsTableCell>
                <AccountsTableCell className="truncate">{m.particulars}</AccountsTableCell>
                <AccountsTableCell className="truncate">{m.bankDescription}</AccountsTableCell>
                <AccountsTableCell align="right" money>
                  {formatMoney(m.amount)}
                  <span className="block text-[9px] text-muted-foreground font-normal">
                    {m.direction === "deposit" ? "Deposit" : "Withdrawal"}
                  </span>
                </AccountsTableCell>
                <AccountsTableCell>{m.reconciledBy}</AccountsTableCell>
                <AccountsTableCell className="text-[10px]">{formatApiDateTime(m.reconciledOn)}</AccountsTableCell>
                <AccountsTableCell align="center">
                  <StatusChip label={m.mode} tone="navy" />
                </AccountsTableCell>
                <AccountsTableCell align="center">
                  <div className="inline-flex items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-[10px] px-2"
                      onClick={() => onView(m)}
                    >
                      View Match
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] px-2 text-amber-700"
                      onClick={() => onUnreconcile(m)}
                    >
                      Unreconcile
                    </Button>
                  </div>
                </AccountsTableCell>
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
      </AccountsTable>
    </div>
  );
}

function HistoryTab({ imports }: { imports: ReturnType<typeof mapImportToUi>[] }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground px-0.5 flex items-start gap-1.5">
        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-navy-500" />
        Previously imported bank transactions are not added again. Only new statement transactions
        are added.
      </p>
      <div className="border border-border/70 rounded-lg bg-white overflow-hidden">
        <AccountsTable minWidth={1000}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsTableHeadCell>File Name</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[160px]">Statement Period</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[140px]">Uploaded At</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[100px]">Uploaded By</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[70px]" align="right">Rows</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[60px]" align="right">New</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[80px]" align="right">Duplicate</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[60px]" align="right">Errors</AccountsTableHeadCell>
              <AccountsTableHeadCell className="w-[80px]" align="center">Status</AccountsTableHeadCell>
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {imports.length === 0 ? (
              <AccountsTableEmpty colSpan={9} message="No statement uploads yet." />
            ) : (
              imports.map((row) => (
                <AccountsTableRow key={row.id}>
                  <AccountsTableCell className="font-mono text-[11px] font-medium">
                    {row.fileName}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-[11px]">
                    {formatImportPeriod(row.periodFrom, row.periodTo)}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-[10px]">
                    {formatApiDateTime(row.uploadedAt)}
                  </AccountsTableCell>
                  <AccountsTableCell>{row.uploadedBy}</AccountsTableCell>
                  <AccountsTableCell align="right">{row.rowsRead}</AccountsTableCell>
                  <AccountsTableCell align="right" className="text-emerald-700 font-semibold">
                    {row.newTransactions}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="text-muted-foreground">
                    {row.duplicates}
                  </AccountsTableCell>
                  <AccountsTableCell align="right">{row.errorRows}</AccountsTableCell>
                  <AccountsTableCell align="center">
                    <StatusChip label={row.status} tone="emerald" />
                  </AccountsTableCell>
                </AccountsTableRow>
              ))
            )}
          </AccountsTableBody>
        </AccountsTable>
      </div>
    </div>
  );
}

function MatchDetailBlock({
  title,
  rows,
}: {
  title: string;
  rows: [string, string][];
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        {title}
      </p>
      <div className="rounded-xl border border-border/60 bg-muted/20 px-3 divide-y divide-border/50">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-3 py-2 text-[11px]">
            <span className="text-muted-foreground flex-shrink-0">{label}</span>
            <span className="font-medium text-right text-foreground">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

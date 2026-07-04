"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  FlaskConical,
  Link2,
  Save,
  Upload,
} from "lucide-react";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportSearchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, formatMoneyOrDash, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import { buildBookEntries, computeBookSummary } from "@/lib/accounts/banking-book-utils";
import { ensureBankingDemoOnPageLoad, seedBankingDemoData } from "@/lib/accounts/banking-demo-seed";
import { loadBankAccounts } from "@/lib/accounts/bank-accounts-data";
import {
  ensureMasterCoaLedgerLink,
  resolveCoaLedgerForBankMaster,
} from "@/lib/accounts/bank-ledger-resolver";
import { ensureManualReconDemoSeed, resolveManualReconHdfcMaster, seedManualReconBookEntries } from "@/lib/accounts/manual-bank-reconciliation-demo-seed";
import { exportManualReconciliationToExcel } from "@/lib/accounts/manual-bank-reconciliation-export";
import {
  buildManualReconGrid,
  deriveReconStatus,
  DIFFERENCE_REASON_OPTIONS,
  filterManualReconRows,
  formatAccountsDate,
  getBankStatementBalance,
  getStatementEntriesForBank,
  reconcileSingleRow,
  saveManualReconciliation,
  validateBankProcessingDate,
  type BookReconStatus,
  type DifferenceReason,
  type ManualReconGridRow,
} from "@/lib/accounts/manual-bank-reconciliation-data";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useFY } from "@/lib/fy-store";
import { UploadStatementDialog } from "./components/UploadStatementDialog";
import { ReconEntryStatusBadge } from "./components/ReconEntryStatusBadge";

function SummaryCard({
  label,
  value,
  accent,
  subLabel,
}: {
  label: string;
  value: string;
  accent?: "amber" | "emerald" | "brand" | "navy";
  subLabel?: string;
}) {
  const accentClass =
    accent === "amber"
      ? "border-l-amber-500"
      : accent === "emerald"
        ? "border-l-emerald-500"
        : accent === "navy"
          ? "border-l-navy-500"
          : "border-l-brand-600";

  return (
    <div className={cn("bg-white rounded-xl border border-border p-3 shadow-sm border-l-4", accentClass)}>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className={cn("text-base font-bold mt-1", MONEY_AMOUNT_CLASS)}>{value}</p>
      {subLabel && <p className="text-xs text-muted-foreground mt-0.5">{subLabel}</p>}
    </div>
  );
}

function ReconcileDialog({
  open,
  onClose,
  row,
  onReconcile,
}: {
  open: boolean;
  onClose: () => void;
  row: ManualReconGridRow | null;
  onReconcile: (data: {
    rowKey: string;
    bankProcessingDate: string;
    matchedStatementEntryId?: number | null;
    matchedStatementRef?: string;
    differenceReason?: DifferenceReason;
    differenceAmount?: number;
    remarks?: string;
  }) => void;
}) {
  const [bankDate, setBankDate] = useState("");
  const [reason, setReason] = useState<DifferenceReason>("");
  const [diffAmount, setDiffAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (row && open) {
      setBankDate(row.bankProcessingDate || (row.rowSource === "statement" ? row.entryDate : ""));
      setReason(row.differenceReason || (row.rowSource === "statement" ? "direct_bank_entry" : ""));
      setDiffAmount(row.differenceAmount ? String(row.differenceAmount) : "");
      setRemarks(row.remarks || "");
      setError("");
    }
  }, [row, open]);

  if (!row) return null;

  const handleSubmit = () => {
    if (!bankDate) {
      setError("Bank processing date is required to reconcile.");
      return;
    }
    const validationError = validateBankProcessingDate(row.entryDate, bankDate);
    if (validationError) {
      setError(validationError);
      return;
    }

    const diff = Number(diffAmount) || 0;
    onReconcile({
      rowKey: row.rowKey,
      bankProcessingDate: bankDate,
      matchedStatementEntryId: row.suggestedStatementMatch?.statementEntryId ?? row.matchedStatementEntryId,
      matchedStatementRef: row.suggestedStatementMatch?.statementRef ?? row.matchedStatementRef,
      differenceReason: reason,
      differenceAmount: diff,
      remarks,
    });
    onClose();
  };

  const bookAmount = row.debitAmount || row.creditAmount;
  const matchAmount = row.suggestedStatementMatch?.statementAmount ?? 0;
  const computedDiff = matchAmount ? Math.abs(bookAmount - matchAmount) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm">Reconcile Entry</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{row.rowSource === "statement" ? "Source" : "Voucher"}</span>
              <span className="font-mono font-semibold text-brand-700">
                {row.rowSource === "statement" ? row.matchedStatementRef || "Bank Stmt" : row.voucherNo}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Party</span>
              <span className="font-medium">{row.partyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Book Date</span>
              <span>{formatAccountsDate(row.entryDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-medium">{formatMoney(bookAmount)}</span>
            </div>
          </div>

          {row.suggestedStatementMatch && row.rowSource !== "statement" && (
            <div className="bg-brand-50 rounded-lg p-3 space-y-1.5 border border-brand-200">
              <p className="text-xs font-bold uppercase tracking-widest text-brand-600">Suggested Match</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Statement Date</span>
                <span>{formatAccountsDate(row.suggestedStatementMatch.statementDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono">{row.suggestedStatementMatch.statementRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium">{formatMoney(row.suggestedStatementMatch.statementAmount)}</span>
              </div>
              {computedDiff > 0.01 && (
                <div className="flex justify-between text-amber-700">
                  <span>Difference</span>
                  <span className="font-medium">{formatMoney(computedDiff)}</span>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Bank Processing Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              className="h-9 text-sm font-medium"
              value={bankDate}
              max={new Date().toISOString().slice(0, 10)}
              min={row.entryDate}
              onChange={(e) => {
                setBankDate(e.target.value);
                setError("");
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Difference Reason</Label>
            <Select
              value={reason || undefined}
              onValueChange={(v) => setReason(v as DifferenceReason)}
            >
              <SelectTrigger className="h-9 text-sm font-medium">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {DIFFERENCE_REASON_OPTIONS.filter((o) => o.value !== "").map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Difference Amount</Label>
              <Input
                type="number"
                step="0.01"
                className="h-9 text-sm font-medium text-right"
                value={diffAmount}
                onChange={(e) => setDiffAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Remarks</Label>
            <Input
              className="h-9 text-sm font-medium"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional notes…"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-9 text-sm font-medium gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSubmit}
          >
            <Check className="w-4 h-4" />
            Reconcile
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ManualBankReconciliationPageClient() {
  const mounted = useClientMounted();
  const { selectedFY } = useFY();
  const [refreshKey, setRefreshKey] = useState(0);
  const [bankAccountId, setBankAccountId] = useState("");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [statusFilter, setStatusFilter] = useState<"all" | BookReconStatus>("all");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [draftDates, setDraftDates] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [reconcileRow, setReconcileRow] = useState<ManualReconGridRow | null>(null);

  useEffect(() => {
    ensureBankingDemoOnPageLoad();
    ensureManualReconDemoSeed();
    seedManualReconBookEntries();
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const bankOptions = useMemo(() => {
    void refreshKey;
    return loadBankAccounts()
      .filter((m) => m.status === "active")
      .map((m) => {
        const ledger = resolveCoaLedgerForBankMaster(m);
        return {
          masterId: m.id,
          coaLedgerId: ledger?.id ?? m.coaLedgerId,
          label: `${m.bankName} — ${m.accountType} (${m.accountNumber})`,
          bankName: m.bankName,
          defaultForReceipts: m.defaultForReceipts,
        };
      });
  }, [refreshKey]);

  useEffect(() => {
    if (bankOptions.length === 0) return;
    if (bankAccountId && bankOptions.some((b) => String(b.masterId) === bankAccountId)) return;
    const defaultBank = bankOptions.find((b) => b.defaultForReceipts) ?? bankOptions[0];
    if (defaultBank) setBankAccountId(String(defaultBank.masterId));
  }, [bankOptions, bankAccountId]);

  const selectedBank = bankOptions.find((b) => String(b.masterId) === bankAccountId);
  const bankMasterId = selectedBank?.masterId ?? null;
  const bankName = selectedBank?.bankName ?? "";

  const resolvedLedger = useMemo(() => {
    void refreshKey;
    if (!bankAccountId) return null;
    const master = loadBankAccounts().find((m) => String(m.id) === bankAccountId);
    if (!master) return null;
    return ensureMasterCoaLedgerLink(master);
  }, [bankAccountId, refreshKey]);

  const coaLedgerId = resolvedLedger?.id ?? selectedBank?.coaLedgerId ?? 0;

  const ledgers = useMemo(() => {
    return resolvedLedger ? [resolvedLedger] : [];
  }, [resolvedLedger]);

  const bookFilters = useMemo(
    () => ({
      ledgerIds: coaLedgerId ? [coaLedgerId] : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [coaLedgerId, dateFrom, dateTo],
  );

  const bookEntries = useMemo(() => {
    if (!coaLedgerId || !mounted) return [];
    return buildBookEntries(ledgers, bookFilters);
  }, [ledgers, bookFilters, coaLedgerId, mounted]);

  const bookSummary = useMemo(() => {
    if (!coaLedgerId) {
      return { openingBalance: 0, totalReceipts: 0, totalPayments: 0, closingBalance: 0 };
    }
    return computeBookSummary(ledgers, bookEntries, bookFilters);
  }, [ledgers, bookEntries, bookFilters, coaLedgerId]);

  const { rows: gridRows, summary: savedSummary } = useMemo(() => {
    void refreshKey;
    if (!coaLedgerId) {
      return {
        rows: [] as ManualReconGridRow[],
        summary: {
          balanceAsPerBooks: 0,
          balanceAsPerBank: 0,
          difference: 0,
          pendingCount: 0,
          reconciledCount: 0,
          unmatchedCount: 0,
          differenceCount: 0,
          totalCount: 0,
        },
      };
    }
    return buildManualReconGrid(bookEntries, coaLedgerId, bookSummary.closingBalance, bankMasterId, bankName);
  }, [bookEntries, coaLedgerId, bookSummary.closingBalance, refreshKey, bankMasterId, bankName]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const row of gridRows) {
      next[row.rowKey] = row.bankProcessingDate;
    }
    setDraftDates(next);
    setDirty(false);
  }, [gridRows, bankMasterId, bankAccountId]);

  const visibleRows = useMemo(() => {
    const withDraftStatus = gridRows.map((row) => {
      const bankProcessingDate = draftDates[row.rowKey] ?? row.bankProcessingDate;
      return {
        ...row,
        bankProcessingDate,
        status: deriveReconStatus(bankProcessingDate, row.differenceAmount, row.matchedStatementEntryId),
      };
    });
    return filterManualReconRows(withDraftStatus, {
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: statusFilter,
      search: search || undefined,
    });
  }, [gridRows, draftDates, dateFrom, dateTo, statusFilter, search]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return visibleRows.slice(start, start + pageSize);
  }, [visibleRows, page, pageSize]);

  const statementLineCount = useMemo(() => {
    if (!bankMasterId) return 0;
    void refreshKey;
    return getStatementEntriesForBank(bankMasterId).length;
  }, [bankMasterId, refreshKey]);

  const bankBalanceValue = bankMasterId ? getBankStatementBalance(bankMasterId) : 0;
  const summary = useMemo(() => {
    void refreshKey;
    return {
      ...savedSummary,
      balanceAsPerBank: bankBalanceValue,
      difference: savedSummary.balanceAsPerBooks - bankBalanceValue,
    };
  }, [savedSummary, bankBalanceValue, refreshKey]);

  const selectedBankLabel = selectedBank?.label ?? "—";
  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleLoadDemoEntries = () => {
    seedBankingDemoData(true);
    seedManualReconBookEntries(true);
    ensureManualReconDemoSeed(true);

    const defaultBank = resolveManualReconHdfcMaster();
    if (defaultBank) {
      ensureMasterCoaLedgerLink(defaultBank);
      setBankAccountId(String(defaultBank.id));
    }

    const ledger = defaultBank ? ensureMasterCoaLedgerLink(defaultBank) : resolvedLedger;
    const ledgerId = ledger?.id ?? coaLedgerId;
    let entryCount = 0;
    if (ledgerId) {
      const ledger = loadChartOfAccounts().find((l) => l.id === ledgerId);
      if (ledger) {
        entryCount = buildBookEntries([ledger], { ledgerIds: [ledgerId] }).length;
      }
    }

    refresh();

    if (entryCount === 0) {
      setToast({
        msg: "Could not load book entries — try clearing site data (localStorage) and reload.",
        type: "error",
      });
      return;
    }

    setToast({
      msg: `Loaded ${entryCount} demo book entries and bank statement`,
      type: "success",
    });
  };

  const handleDateChange = (row: ManualReconGridRow, value: string) => {
    setInlineError(null);
    if (value) {
      const error = validateBankProcessingDate(row.entryDate, value);
      if (error) {
        setInlineError(`${row.voucherNo}: ${error}`);
        return;
      }
    }
    setDraftDates((prev) => ({ ...prev, [row.rowKey]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!coaLedgerId) {
      setToast({ msg: "Please select a bank account.", type: "error" });
      return;
    }
    setSaving(true);
    setInlineError(null);
    const rowUpdates = gridRows.map((row) => ({
      rowKey: row.rowKey,
      bankProcessingDate: draftDates[row.rowKey] ?? "",
      matchedStatementEntryId: row.matchedStatementEntryId,
      matchedStatementRef: row.matchedStatementRef,
      differenceReason: row.differenceReason,
      differenceAmount: row.differenceAmount,
      remarks: row.remarks,
    }));
    const result = saveManualReconciliation({
      coaLedgerId,
      closingBookBalance: bookSummary.closingBalance,
      rowUpdates,
    });
    setSaving(false);
    if (!result.ok) {
      setInlineError(result.error);
      setToast({ msg: result.error, type: "error" });
      return;
    }
    setDirty(false);
    refresh();
    setToast({ msg: "Reconciliation saved successfully", type: "success" });
  };

  const handleReconcileRow = (data: {
    rowKey: string;
    bankProcessingDate: string;
    matchedStatementEntryId?: number | null;
    matchedStatementRef?: string;
    differenceReason?: DifferenceReason;
    differenceAmount?: number;
    remarks?: string;
  }) => {
    const result = reconcileSingleRow(data);
    if (!result.ok) {
      setToast({ msg: result.error, type: "error" });
      return;
    }
    refresh();
    setToast({ msg: `${result.record.voucherNo} reconciled successfully`, type: "success" });
  };

  const handleExport = async () => {
    if (!coaLedgerId) return;
    setExporting(true);
    try {
      await exportManualReconciliationToExcel(visibleRows, summary, {
        bankAccount: selectedBankLabel,
        dateFrom,
        dateTo,
        financialYear: selectedFY.label,
      });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [bankAccountId, dateFrom, dateTo, statusFilter, search, pageSize]);

  const headerActions = (
    <div className="flex items-center gap-2">
      <AccountsExportMenu onExcel={handleExport} disabled={!coaLedgerId || exporting} />
      <Button size="sm" variant="outline" className="h-9 text-sm font-medium gap-1.5" onClick={handleLoadDemoEntries}>
        <FlaskConical className="w-4 h-4" />
        Load Demo Entries
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-9 text-sm font-medium gap-1.5"
        disabled={!bankMasterId}
        onClick={() => setUploadOpen(true)}
      >
        <Upload className="w-4 h-4" />
        Upload Statement
      </Button>
      <Button
        size="sm"
        className="h-9 text-sm font-medium gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
        disabled={!coaLedgerId || saving || !dirty}
        onClick={() => void handleSave()}
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );

  const TABLE_COLS = [
    { label: "Entry Date", align: "left" as const, className: "w-[100px]" },
    { label: "Voucher No.", align: "left" as const, className: "w-[100px]" },
    { label: "Party Name", align: "left" as const, className: "min-w-[160px]" },
    { label: "Voucher Type", align: "left" as const, className: "w-[90px]" },
    { label: "Narration", align: "left" as const, className: "min-w-[140px]" },
    { label: "Debit", align: "right" as const, className: "w-[100px]" },
    { label: "Credit", align: "right" as const, className: "w-[100px]" },
    { label: "Bank", align: "left" as const, className: "w-[80px]" },
    { label: "Bank Date", align: "left" as const, className: "w-[140px]" },
    { label: "Stmt Ref", align: "left" as const, className: "w-[90px]" },
    { label: "Diff", align: "right" as const, className: "w-[80px]" },
    { label: "Status", align: "left" as const, className: "w-[100px]" },
    { label: "Action", align: "center" as const, className: "w-[80px]" },
  ];
  const TH_PAD = "px-4 py-2.5 align-middle";
  const TD_PAD = "px-4 py-2 align-middle";

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Banking", "Bank Reconciliation")}
        title="Bank Reconciliation"
        description="Manually reconcile book entries against bank statements using processing dates."
        actions={headerActions}
        layout="standard"
        className="space-y-4"
      >
        <div className="space-y-4">
          {/* Filters & summary */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SummaryCard
                label="Balance as per Books"
                value={formatMoney(summary.balanceAsPerBooks)}
                accent="brand"
                subLabel={`${summary.totalCount} entries`}
              />
              <SummaryCard
                label="Balance as per Bank Statement"
                value={formatMoney(summary.balanceAsPerBank)}
                accent="navy"
                subLabel={statementLineCount > 0 ? `${statementLineCount} statement lines` : "No statement"}
              />
              <SummaryCard
                label="Difference"
                value={formatMoney(summary.difference)}
                accent={Math.abs(summary.difference) > 0.01 ? "amber" : "emerald"}
                subLabel={
                  Math.abs(summary.difference) < 0.01
                    ? "Fully reconciled"
                    : `${summary.reconciledCount} reconciled, ${summary.pendingCount + summary.unmatchedCount} pending`
                }
              />
            </div>

            <ReportFilterRow>
              <ReportDateRangeFilter
                preset={preset}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onPresetChange={setPreset}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
              />
              <div className="space-y-1 min-w-[180px]">
                <Label className="text-xs font-medium uppercase text-muted-foreground leading-none">
                  Bank Account <span className="text-red-500">*</span>
                </Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger className="h-9 text-sm font-medium bg-white mt-0.5">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankOptions.map((o) => (
                      <SelectItem key={o.masterId} value={String(o.masterId)} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-[120px]">
                <Label className="text-xs font-medium uppercase text-muted-foreground leading-none">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="h-9 text-sm font-medium bg-white mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                    <SelectItem value="reconciled" className="text-xs">Reconciled</SelectItem>
                    <SelectItem value="unmatched" className="text-xs">Unmatched</SelectItem>
                    <SelectItem value="difference" className="text-xs">Difference</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ReportSearchFilter
                value={search}
                onChange={setSearch}
                placeholder="Search party, voucher, amount…"
              />
            </ReportFilterRow>

            {inlineError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {inlineError}
              </p>
            )}
          </div>

          {/* Unified reconciliation table */}
          {!mounted || !coaLedgerId ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/60 bg-muted/10">
              <p className="text-sm text-muted-foreground">Select a bank account to begin reconciliation.</p>
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/60 bg-muted/10 px-6">
              <p className="text-sm font-medium text-foreground">No entries to reconcile</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-md">
                Upload a bank statement or load demo entries to populate the reconciliation table.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <Button size="sm" variant="outline" className="h-9 text-sm font-medium gap-1.5" onClick={handleLoadDemoEntries}>
                  <FlaskConical className="w-4 h-4" />
                  Load Demo Entries
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-9 text-sm font-medium gap-1.5"
                  disabled={!bankMasterId}
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="w-4 h-4" />
                  Upload Statement
                </Button>
              </div>
            </div>
          ) : (
            <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="accounts-table w-full" style={{ minWidth: "1200px" }}>
                  <thead className="sticky top-0 z-[1] bg-muted/40">
                    <tr className="border-b border-border">
                      {TABLE_COLS.map((col) => (
                        <th
                          key={col.label}
                          className={cn(
                            TH_PAD,
                            "text-xs font-semibold text-foreground whitespace-nowrap bg-muted/40",
                            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left",
                            col.className,
                          )}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((row) => {
                      const draftDate = draftDates[row.rowKey] ?? "";
                      const displayStatus = deriveReconStatus(draftDate, row.differenceAmount, row.matchedStatementEntryId);
                      const hasSuggestion = !!row.suggestedStatementMatch;
                      const isStatementRow = row.rowSource === "statement";

                      return (
                        <tr
                          key={row.rowKey}
                          className={cn(
                            "border-b border-border/60 hover:bg-muted/20 transition-colors",
                            hasSuggestion && displayStatus === "unmatched" && "bg-brand-50/30",
                            isStatementRow && "bg-navy-50/20",
                          )}
                        >
                          <td className={cn(TD_PAD, "text-xs whitespace-nowrap")}>{formatAccountsDate(row.entryDate)}</td>
                          <td className={cn(TD_PAD, "text-xs whitespace-nowrap font-mono font-semibold text-brand-700")}>
                            {isStatementRow ? row.matchedStatementRef || "—" : row.voucherNo}
                          </td>
                          <td className={cn(TD_PAD, "text-xs")} title={row.partyName}>
                            <span className="line-clamp-1">{row.partyName}</span>
                          </td>
                          <td className={cn(TD_PAD, "text-xs whitespace-nowrap")}>
                            {isStatementRow ? (
                              <span className="text-xs font-semibold uppercase tracking-wide text-navy-600">
                                Bank Stmt
                              </span>
                            ) : (
                              row.voucherTypeLabel
                            )}
                          </td>
                          <td className={cn(TD_PAD, "text-xs")} title={row.narration}>
                            <span className="line-clamp-1 text-muted-foreground">{row.narration}</span>
                          </td>
                          <td className={cn(TD_PAD, "text-xs text-right tabular-nums")}>{formatMoneyOrDash(row.debitAmount)}</td>
                          <td className={cn(TD_PAD, "text-xs text-right tabular-nums")}>{formatMoneyOrDash(row.creditAmount)}</td>
                          <td className={cn(TD_PAD, "text-xs whitespace-nowrap text-muted-foreground")}>{row.bankName}</td>
                          <td className={cn(TD_PAD, "text-xs whitespace-nowrap")}>
                            <Input
                              type="date"
                              className="h-7 w-full max-w-[130px] text-sm"
                              value={draftDate}
                              max={new Date().toISOString().slice(0, 10)}
                              min={row.entryDate}
                              onChange={(e) => handleDateChange(row, e.target.value)}
                            />
                          </td>
                          <td className={cn(TD_PAD, "text-xs whitespace-nowrap")}>
                            {row.matchedStatementRef ? (
                              <span className="font-mono text-muted-foreground">{row.matchedStatementRef}</span>
                            ) : row.suggestedStatementMatch ? (
                              <span className="text-brand-600 text-xs font-medium flex items-center gap-0.5">
                                <Link2 className="w-3 h-3" />
                                {row.suggestedStatementMatch.matchType === "exact" ? "Exact" : "Suggested"}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className={cn(TD_PAD, "text-xs text-right tabular-nums")}>
                            {row.differenceAmount ? (
                              <span className="text-amber-700 font-medium">{formatMoney(row.differenceAmount)}</span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className={cn(TD_PAD, "text-xs")}>
                            <ReconEntryStatusBadge status={displayStatus} />
                          </td>
                          <td className={cn(TD_PAD, "text-xs text-center")}>
                            {displayStatus !== "reconciled" ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                                onClick={() => setReconcileRow(row)}
                              >
                                Reconcile
                              </Button>
                            ) : (
                              <span className="text-emerald-600">
                                <Check className="w-4 h-4 inline" />
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <AccountsTablePagination
                page={page}
                pageSize={pageSize}
                totalRecords={visibleRows.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                recordLabel="entries"
              />
            </div>
          )}
        </div>
      </AccountsPageShell>

      <ReconcileDialog
        open={!!reconcileRow}
        onClose={() => setReconcileRow(null)}
        row={reconcileRow}
        onReconcile={handleReconcileRow}
      />

      <UploadStatementDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultBankAccountId={bankMasterId ?? undefined}
        onSuccess={() => {
          if (bankMasterId) {
            const master = loadBankAccounts().find((m) => m.id === bankMasterId);
            if (master) {
              const ledger = ensureMasterCoaLedgerLink(master);
              if (ledger) {
                const bookCount = buildBookEntries([ledger], { ledgerIds: [ledger.id] }).length;
                if (bookCount === 0) seedManualReconBookEntries(true);
              }
            }
          }
          refresh();
          setToast({
            msg: "Statement imported — reconcile rows in the table below",
            type: "success",
          });
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

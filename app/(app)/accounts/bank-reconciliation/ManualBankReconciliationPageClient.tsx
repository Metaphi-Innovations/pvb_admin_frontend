"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, ChevronUp, Save, Upload } from "lucide-react";
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
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportFromToDateFilter,
  ReportSearchFilter,
} from "@/components/accounts/ReportFilters";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { formatMoney, formatMoneyOrDash, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  buildBookEntries,
  computeBookSummary,
  getBankBookLedgers,
  listBankAccountFilterOptions,
} from "@/lib/accounts/banking-book-utils";
import { ensureBankingDemoOnPageLoad } from "@/lib/accounts/banking-demo-seed";
import { ensureManualReconDemoSeed } from "@/lib/accounts/manual-bank-reconciliation-demo-seed";
import { exportManualReconciliationToExcel } from "@/lib/accounts/manual-bank-reconciliation-export";
import {
  buildManualReconGrid,
  buildStatementPreviewRows,
  deriveReconStatus,
  filterManualReconRows,
  formatAccountsDate,
  getBankStatementBalance,
  resolveBankMasterId,
  saveManualReconciliation,
  validateBankProcessingDate,
  type ManualReconGridRow,
} from "@/lib/accounts/manual-bank-reconciliation-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { useClientMounted } from "@/lib/use-client-mounted";
import { UploadStatementDialog } from "./components/UploadStatementDialog";
import { ReconEntryStatusBadge } from "./components/ReconEntryStatusBadge";

const PLACEHOLDER_FROM = "2026-04-01";
const PLACEHOLDER_TO = "2026-06-30";

function SummaryCard({
  label,
  value,
  accent,
  editable,
  onValueChange,
}: {
  label: string;
  value: string;
  accent?: "amber" | "emerald" | "brand" | "navy";
  editable?: boolean;
  onValueChange?: (raw: string) => void;
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
    <div
      className={cn(
        "bg-white rounded-xl border border-border p-3 shadow-sm border-l-4",
        accentClass,
      )}
    >
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      {editable && onValueChange ? (
        <Input
          type="number"
          step="0.01"
          className={cn("h-8 text-sm mt-1 text-right", MONEY_AMOUNT_CLASS)}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
        />
      ) : (
        <p className={cn("text-lg font-bold mt-1", MONEY_AMOUNT_CLASS)}>{value}</p>
      )}
    </div>
  );
}

export default function ManualBankReconciliationPageClient() {
  const mounted = useClientMounted();
  const [refreshKey, setRefreshKey] = useState(0);
  const [bankLedgerId, setBankLedgerId] = useState("");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_FROM);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_TO);
  const [datesReady, setDatesReady] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "reconciled">("all");
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [draftDates, setDraftDates] = useState<Record<string, string>>({});
  const [bankBalanceDraft, setBankBalanceDraft] = useState<string>("");
  const [dirty, setDirty] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statementPreviewOpen, setStatementPreviewOpen] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    ensureBankingDemoOnPageLoad();
    ensureManualReconDemoSeed();
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const activeFyId = getActiveFinancialYearId();
    const years = loadFinancialYears();
    const activeFy = years.find((fy) => fy.id === activeFyId) ?? years.find((fy) => fy.status === "active");

    if (activeFy) {
      setFinancialYearId(String(activeFy.id));
      setDateFrom(activeFy.startDate);
      setDateTo(activeFy.endDate > PLACEHOLDER_TO ? PLACEHOLDER_TO : activeFy.endDate);
    } else {
      setDateFrom(PLACEHOLDER_FROM);
      setDateTo(PLACEHOLDER_TO);
    }
    setDatesReady(true);
  }, []);

  useEffect(() => {
    if (financialYearId === "all") return;
    const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
    if (!fy) return;
    setDateFrom(fy.startDate);
    setDateTo(fy.endDate);
  }, [financialYearId]);

  const bankOptions = useMemo(() => {
    void refreshKey;
    return listBankAccountFilterOptions();
  }, [refreshKey]);

  useEffect(() => {
    if (!bankLedgerId && bankOptions.length > 0) {
      setBankLedgerId(String(bankOptions[0].id));
    }
  }, [bankOptions, bankLedgerId]);

  const ledgers = useMemo(() => {
    void refreshKey;
    return getBankBookLedgers();
  }, [refreshKey]);

  const coaLedgerId = bankLedgerId ? Number(bankLedgerId) : 0;
  const bankMasterId = coaLedgerId ? resolveBankMasterId(coaLedgerId) : null;

  const bookFilters = useMemo(
    () => ({
      ledgerIds: coaLedgerId ? [coaLedgerId] : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [coaLedgerId, dateFrom, dateTo],
  );

  const bookEntries = useMemo(() => {
    if (!coaLedgerId || !datesReady) return [];
    return buildBookEntries(ledgers, bookFilters);
  }, [ledgers, bookFilters, coaLedgerId, datesReady]);

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
        rows: [],
        summary: {
          balanceAsPerBooks: 0,
          balanceAsPerBank: 0,
          difference: 0,
          pendingCount: 0,
          reconciledCount: 0,
        },
      };
    }
    return buildManualReconGrid(bookEntries, coaLedgerId, bookSummary.closingBalance);
  }, [bookEntries, coaLedgerId, bookSummary.closingBalance, refreshKey]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const row of gridRows) {
      next[row.rowKey] = row.bankProcessingDate;
    }
    setDraftDates(next);
    setDirty(false);
    if (bankMasterId) {
      setBankBalanceDraft(String(getBankStatementBalance(bankMasterId)));
    } else {
      setBankBalanceDraft("");
    }
  }, [gridRows, bankMasterId, bankLedgerId]);

  const visibleRows = useMemo(() => {
    const withDraftStatus = gridRows.map((row) => {
      const bankProcessingDate = draftDates[row.rowKey] ?? row.bankProcessingDate;
      return {
        ...row,
        bankProcessingDate,
        status: deriveReconStatus(bankProcessingDate),
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

  const statementPreview = useMemo(() => {
    if (!bankMasterId) return [];
    void refreshKey;
    return buildStatementPreviewRows(bankMasterId);
  }, [bankMasterId, refreshKey]);

  const bankBalanceValue = bankBalanceDraft ? Number(bankBalanceDraft) : savedSummary.balanceAsPerBank;
  const summary = useMemo(
    () => ({
      balanceAsPerBooks: savedSummary.balanceAsPerBooks,
      balanceAsPerBank: Number.isFinite(bankBalanceValue) ? bankBalanceValue : savedSummary.balanceAsPerBank,
      difference: savedSummary.balanceAsPerBooks - (Number.isFinite(bankBalanceValue) ? bankBalanceValue : savedSummary.balanceAsPerBank),
      pendingCount: visibleRows.filter((r) => deriveReconStatus(draftDates[r.rowKey] ?? "") === "pending").length,
      reconciledCount: visibleRows.filter((r) => deriveReconStatus(draftDates[r.rowKey] ?? "") === "reconciled").length,
    }),
    [savedSummary, bankBalanceValue, visibleRows, draftDates],
  );

  const financialYearLabel = useMemo(() => {
    if (financialYearId === "all") return "All years";
    return loadFinancialYears().find((fy) => String(fy.id) === financialYearId)?.name ?? "—";
  }, [financialYearId]);

  const selectedBankLabel =
    bankOptions.find((o) => String(o.id) === bankLedgerId)?.label ?? "—";

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

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
    const rowDates = gridRows.map((row) => ({
      rowKey: row.rowKey,
      bankProcessingDate: draftDates[row.rowKey] ?? "",
    }));
    const balanceNum = Number(bankBalanceDraft);
    const result = saveManualReconciliation({
      coaLedgerId,
      closingBookBalance: bookSummary.closingBalance,
      rowDates,
      bankStatementBalance: Number.isFinite(balanceNum) ? balanceNum : undefined,
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

  const handleExport = async () => {
    if (!coaLedgerId) return;
    setExporting(true);
    try {
      const exportRows = visibleRows.map((row) => ({
        ...row,
        bankProcessingDate: draftDates[row.rowKey] ?? row.bankProcessingDate,
        status: deriveReconStatus(draftDates[row.rowKey] ?? ""),
      }));
      await exportManualReconciliationToExcel(exportRows, summary, {
        bankAccount: selectedBankLabel,
        dateFrom,
        dateTo,
        financialYear: financialYearLabel,
      });
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [bankLedgerId, dateFrom, dateTo, financialYearId, statusFilter, search, pageSize]);

  const headerActions = (
    <div className="flex items-center gap-2">
      <AccountsExportMenu onExcel={handleExport} disabled={!coaLedgerId || exporting} />
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1.5"
        disabled={!bankMasterId}
        onClick={() => setUploadOpen(true)}
      >
        <Upload className="w-3.5 h-3.5" />
        Upload Statement
      </Button>
      <Button
        size="sm"
        className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
        disabled={!coaLedgerId || saving || !dirty}
        onClick={() => void handleSave()}
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Banking", "Bank Reconciliation")}
        title="Bank Reconciliation"
        description="Upload bank statements and manually reconcile book entries using bank processing dates."
        actions={headerActions}
        layout="split"
        className="h-full min-h-0"
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 sticky top-0 z-10 bg-white border-b border-border shadow-sm space-y-3 p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SummaryCard label="Balance as per Books" value={formatMoney(summary.balanceAsPerBooks)} accent="brand" />
              <SummaryCard
                label="Balance as per Bank Statement"
                value={bankBalanceDraft}
                accent="navy"
                editable
                onValueChange={(v) => {
                  setBankBalanceDraft(v);
                  setDirty(true);
                }}
              />
              <SummaryCard
                label="Difference"
                value={formatMoney(summary.difference)}
                accent={Math.abs(summary.difference) > 0.01 ? "amber" : "emerald"}
              />
            </div>

            <ReportFilterRow>
              <ReportFinancialYearFilter value={financialYearId} onChange={setFinancialYearId} />
              <ReportFromToDateFilter
                dateFrom={dateFrom}
                dateTo={dateTo}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
              />
              <div className="space-y-1 min-w-[180px]">
                <Label className="text-[10px] font-medium uppercase text-muted-foreground leading-none">
                  Bank Account <span className="text-red-500">*</span>
                </Label>
                <Select value={bankLedgerId} onValueChange={setBankLedgerId}>
                  <SelectTrigger className="h-8 text-xs bg-white mt-0.5">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankOptions.map((o) => (
                      <SelectItem key={o.id} value={String(o.id)} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 min-w-[120px]">
                <Label className="text-[10px] font-medium uppercase text-muted-foreground leading-none">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="h-8 text-xs bg-white mt-0.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                    <SelectItem value="reconciled" className="text-xs">Reconciled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <ReportSearchFilter
                value={search}
                onChange={setSearch}
                placeholder="Search party, voucher…"
              />
            </ReportFilterRow>

            {inlineError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {inlineError}
              </p>
            )}
          </div>

          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto">
            <div className="flex flex-col flex-1 min-h-[320px] min-w-0 p-4">
              {!mounted || !coaLedgerId ? (
                <div className="flex flex-col items-center justify-center flex-1 py-16 text-center rounded-xl border border-border/60 bg-muted/10">
                  <p className="text-sm text-muted-foreground">Select a bank account to begin reconciliation.</p>
                </div>
              ) : visibleRows.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 py-16 text-center rounded-xl border border-border/60 bg-muted/10">
                  <p className="text-sm text-muted-foreground">No book entries match the current filters.</p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Adjust the date range or bank account, or compare against the bank statement below.
                  </p>
                </div>
              ) : (
                <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 w-full">
                  <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
                    <table className="accounts-table w-full text-table min-w-full">
                      <thead className="sticky top-0 z-[1] bg-muted/40">
                        <tr className="border-b border-border">
                          {[
                            { label: "Entry Date as per Books", align: "left" as const, className: "w-[140px]" },
                            { label: "Party Name", align: "left" as const, className: "min-w-[200px]" },
                            { label: "Voucher Type", align: "left" as const, className: "w-[120px]" },
                            { label: "Debit Amount", align: "right" as const, className: "w-[120px]" },
                            { label: "Credit Amount", align: "right" as const, className: "w-[120px]" },
                            { label: "Bank Processing Date", align: "left" as const, className: "w-[160px]" },
                            { label: "Status", align: "left" as const, className: "w-[120px]" },
                          ].map((col) => (
                            <th
                              key={col.label}
                              className={cn(
                                "text-xs font-semibold text-foreground whitespace-nowrap",
                                col.align === "right" ? "text-right" : "text-left",
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
                          const displayStatus = deriveReconStatus(draftDate);
                          return (
                            <tr
                              key={row.rowKey}
                              className="border-b border-border/60 hover:bg-muted/20 transition-colors"
                            >
                              <td className="text-xs whitespace-nowrap">
                                {formatAccountsDate(row.entryDate)}
                              </td>
                              <td className="text-xs" title={row.partyName}>
                                <span className="line-clamp-2">{row.partyName}</span>
                              </td>
                              <td className="text-xs whitespace-nowrap">{row.voucherTypeLabel}</td>
                              <td className="text-xs text-right tabular-nums">
                                {formatMoneyOrDash(row.debitAmount)}
                              </td>
                              <td className="text-xs text-right tabular-nums">
                                {formatMoneyOrDash(row.creditAmount)}
                              </td>
                              <td className="text-xs whitespace-nowrap">
                                <Input
                                  type="date"
                                  className="h-8 w-full max-w-[148px] text-xs"
                                  value={draftDate}
                                  max={new Date().toISOString().slice(0, 10)}
                                  min={row.entryDate}
                                  onChange={(e) => handleDateChange(row, e.target.value)}
                                />
                              </td>
                              <td className="text-xs">
                                <ReconEntryStatusBadge status={displayStatus} />
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

            {statementPreview.length > 0 && (
              <div className="flex-shrink-0 border-t border-border bg-white">
                <button
                  type="button"
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors border-b border-border/60"
                  onClick={() => setStatementPreviewOpen((o) => !o)}
                >
                  <div>
                    <p className="text-xs font-semibold text-foreground">Bank Statement Preview</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Reference only — compare and enter bank processing dates manually.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {statementPreview.length} lines
                    </span>
                    {statementPreviewOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
                {statementPreviewOpen && (
                  <div className="overflow-x-auto max-h-[min(42vh,420px)] overflow-y-auto">
                    <table className="accounts-table w-full text-xs min-w-[960px]">
                      <thead className="sticky top-0 z-[1] bg-muted/40 border-b border-border">
                        <tr>
                          {[
                            { label: "Statement Date", align: "left" as const, className: "w-[120px]" },
                            { label: "Description", align: "left" as const, className: "min-w-[320px]" },
                            { label: "Debit", align: "right" as const, className: "w-[120px]" },
                            { label: "Credit", align: "right" as const, className: "w-[120px]" },
                            { label: "Balance", align: "right" as const, className: "w-[130px]" },
                          ].map((col) => (
                            <th
                              key={col.label}
                              className={cn(
                                "font-semibold text-foreground whitespace-nowrap",
                                col.align === "right" ? "text-right" : "text-left",
                                col.className,
                              )}
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {statementPreview.map((row) => (
                          <tr key={row.id} className="border-b border-border/60 hover:bg-muted/20">
                            <td className="whitespace-nowrap">
                              {formatAccountsDate(row.statementDate)}
                            </td>
                            <td className="whitespace-normal break-words leading-relaxed">
                              {row.description}
                            </td>
                            <td className="text-right tabular-nums font-medium text-red-600">
                              {formatMoneyOrDash(row.debitAmount)}
                            </td>
                            <td className="text-right tabular-nums font-medium text-emerald-600">
                              {formatMoneyOrDash(row.creditAmount)}
                            </td>
                            <td className="text-right tabular-nums font-medium">
                              {formatMoney(row.balance)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </AccountsPageShell>

      <UploadStatementDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        defaultBankAccountId={bankMasterId ?? undefined}
        onSuccess={() => {
          refresh();
          setToast({ msg: "Bank statement imported successfully", type: "success" });
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

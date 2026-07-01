"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Upload, Eye, CheckCircle2, AlertCircle } from "lucide-react";
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
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, formatMoneyOrDash, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  buildBookEntries,
  computeBookSummary,
  getBankBookLedgers,
  listBankAccountFilterOptions,
} from "@/lib/accounts/banking-book-utils";
import { ensureBankingDemoOnPageLoad } from "@/lib/accounts/banking-demo-seed";
import {
  buildManualReconGrid,
  filterManualReconRows,
  resolveBankMasterId,
  updatePendingBankProcessingDate,
  type ManualReconGridRow,
} from "@/lib/accounts/manual-bank-reconciliation-data";
import { UploadStatementDialog } from "./components/UploadStatementDialog";
import { ReconcileEntrySheet } from "./components/ReconcileEntrySheet";
import { ReconEntryStatusBadge } from "./components/ReconEntryStatusBadge";

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "amber" | "emerald" | "brand" | "navy";
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
      <p className={cn("text-lg font-bold mt-1", MONEY_AMOUNT_CLASS)}>{value}</p>
    </div>
  );
}

export default function ManualBankReconciliationPageClient() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [bankLedgerId, setBankLedgerId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "reconciled">("pending");
  const [partyFilter, setPartyFilter] = useState("");
  const [voucherFilter, setVoucherFilter] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeRow, setActiveRow] = useState<ManualReconGridRow | null>(null);
  const [sheetMode, setSheetMode] = useState<"reconcile" | "view">("reconcile");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    ensureBankingDemoOnPageLoad();
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

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
    if (!coaLedgerId) return [];
    return buildBookEntries(ledgers, bookFilters);
  }, [ledgers, bookFilters, coaLedgerId]);

  const bookSummary = useMemo(() => {
    if (!coaLedgerId) {
      return { openingBalance: 0, totalReceipts: 0, totalPayments: 0, closingBalance: 0 };
    }
    return computeBookSummary(ledgers, bookEntries, bookFilters);
  }, [ledgers, bookEntries, bookFilters, coaLedgerId]);

  const { rows: gridRows, summary } = useMemo(() => {
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

  const visibleRows = useMemo(
    () =>
      filterManualReconRows(gridRows, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        status: statusFilter,
        partyName: partyFilter || undefined,
        voucherNo: voucherFilter || undefined,
      }),
    [gridRows, dateFrom, dateTo, statusFilter, partyFilter, voucherFilter],
  );

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const openReconcile = (row: ManualReconGridRow) => {
    setActiveRow(row);
    setSheetMode("reconcile");
    setSheetOpen(true);
  };

  const openView = (row: ManualReconGridRow) => {
    setActiveRow(row);
    setSheetMode("view");
    setSheetOpen(true);
  };

  const handleInlineDateChange = (row: ManualReconGridRow, value: string) => {
    if (!value) return;
    setInlineError(null);
    const result = updatePendingBankProcessingDate(row.rowKey, value);
    if (!result.ok) {
      setInlineError(result.error);
      setToast({ msg: result.error, type: "error" });
      return;
    }
    refresh();
  };

  const uploadPreset = bankMasterId
    ? {
        bankAccountId: bankMasterId,
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        statementName: "",
      }
    : null;

  const headerActions = (
    <Button
      size="sm"
      className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
      disabled={!bankMasterId}
      onClick={() => setUploadOpen(true)}
    >
      <Upload className="w-3.5 h-3.5" />
      Upload Statement
    </Button>
  );

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Banking", "Bank Reconciliation")}
        title="Bank Reconciliation"
        description="Upload bank statements and manually reconcile book entries against bank processing dates."
        actions={headerActions}
        layout="split"
        className="h-full min-h-0"
      >
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-shrink-0 p-4 border-b border-border/60 bg-muted/5 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <SummaryCard label="Balance as per Books" value={formatMoney(summary.balanceAsPerBooks)} accent="brand" />
              <SummaryCard label="Balance as per Bank Statement" value={formatMoney(summary.balanceAsPerBank)} accent="navy" />
              <SummaryCard
                label="Difference"
                value={formatMoney(summary.difference)}
                accent={Math.abs(summary.difference) > 0.01 ? "amber" : "emerald"}
              />
              <SummaryCard label="Pending Transactions" value={String(summary.pendingCount)} accent="amber" />
              <SummaryCard label="Reconciled Transactions" value={String(summary.reconciledCount)} accent="emerald" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
              <div className="space-y-1">
                <Label className="text-[10px] font-medium uppercase text-muted-foreground">Bank Account</Label>
                <Select value={bankLedgerId} onValueChange={setBankLedgerId}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue placeholder="Select bank" />
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
              <div className="space-y-1">
                <Label className="text-[10px] font-medium uppercase text-muted-foreground">Date From</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-medium uppercase text-muted-foreground">Date To</Label>
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-medium uppercase text-muted-foreground">Status</Label>
                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                  <SelectTrigger className="h-8 text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">All</SelectItem>
                    <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                    <SelectItem value="reconciled" className="text-xs">Reconciled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-medium uppercase text-muted-foreground">Party Name</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="Filter party…"
                  value={partyFilter}
                  onChange={(e) => setPartyFilter(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-medium uppercase text-muted-foreground">Voucher No.</Label>
                <Input
                  className="h-8 text-xs"
                  placeholder="Filter voucher…"
                  value={voucherFilter}
                  onChange={(e) => setVoucherFilter(e.target.value)}
                />
              </div>
            </div>

            {inlineError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {inlineError}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-auto min-h-0">
            {!coaLedgerId ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">Select a bank account to begin reconciliation.</p>
              </div>
            ) : visibleRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-muted-foreground">No book entries match the current filters.</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="accounts-table w-full text-table min-w-[1100px]">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          {[
                            "Entry Date (Books)",
                            "Voucher No.",
                            "Party Name",
                            "Voucher Type",
                            "Debit Amount",
                            "Credit Amount",
                            "Bank Processing Date",
                            "Status",
                            "Action",
                          ].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {visibleRows.map((row) => (
                          <tr
                            key={row.rowKey}
                            className={cn(
                              "border-b border-border/60 hover:bg-muted/20 transition-colors group",
                              row.isSuggested && row.status === "pending" && "bg-navy-50/30",
                            )}
                          >
                            <td className="px-4 py-2 text-xs whitespace-nowrap">{row.entryDate}</td>
                            <td className="px-4 py-2 text-xs font-mono font-semibold text-brand-700 whitespace-nowrap">
                              {row.voucherNo}
                            </td>
                            <td className="px-4 py-2 text-xs max-w-[200px] truncate" title={row.partyName}>
                              {row.partyName}
                            </td>
                            <td className="px-4 py-2 text-xs whitespace-nowrap">{row.voucherTypeLabel}</td>
                            <td className="px-4 py-2 text-xs text-right tabular-nums">{formatMoneyOrDash(row.debitAmount)}</td>
                            <td className="px-4 py-2 text-xs text-right tabular-nums">{formatMoneyOrDash(row.creditAmount)}</td>
                            <td className="px-4 py-2 text-xs whitespace-nowrap">
                              {row.status === "pending" ? (
                                <Input
                                  type="date"
                                  className={cn(
                                    "h-8 w-[140px] text-xs",
                                    row.isSuggested && "border-navy-300 bg-navy-50/50",
                                  )}
                                  value={row.bankProcessingDate}
                                  min={row.entryDate}
                                  onChange={(e) => handleInlineDateChange(row, e.target.value)}
                                />
                              ) : (
                                <span className="text-foreground">{row.bankProcessingDate}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-xs">
                              <ReconEntryStatusBadge status={row.status} suggested={row.isSuggested} />
                            </td>
                            <td className="px-4 py-2 text-xs whitespace-nowrap">
                              {row.status === "pending" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px] gap-1"
                                  onClick={() => openReconcile(row)}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  Reconcile
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 text-[11px] gap-1"
                                  onClick={() => openView(row)}
                                >
                                  <Eye className="w-3 h-3" />
                                  View
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20">
                    <p className="text-[11px] text-muted-foreground">
                      Showing <span className="font-medium text-foreground">{visibleRows.length}</span> of{" "}
                      <span className="font-medium text-foreground">{gridRows.length}</span> book entries
                    </p>
                  </div>
                </div>
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

      <ReconcileEntrySheet
        row={activeRow}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        onSuccess={() => {
          refresh();
          setToast({ msg: "Entry marked as reconciled", type: "success" });
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

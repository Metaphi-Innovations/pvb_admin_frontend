"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Eye, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { AccountsTableEmpty, AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import {
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportSearchFilter,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import { SortTh, AccountsColumnHeader, AccountsColumnFilterProvider, useAccountsColumnFilterContext, useAccountsFilteredRows } from "../../components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  resolveDateRangePreset,
  type DateRangePresetId,
} from "@/lib/accounts/report-date-presets";
import { cn } from "@/lib/utils";
import {
  buildJournalRegisterRows,
  computeJournalRegisterSummary,
  filterJournalRegisterRows,
  formatJournalRegisterDate,
  type JournalRegisterRow,
} from "./journal-register-data";
import {
  exportJournalRegisterToExcel,
  exportJournalRegisterToPdf,
} from "./journal-register-export";

// â”€â”€â”€ Voucher Detail Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function JournalVoucherDetailModal({
  row,
  onClose,
}: {
  row: JournalRegisterRow | null;
  onClose: () => void;
}) {
  if (!row) return null;

  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <span className="font-mono text-brand-700">{row.journalNo}</span>
            <span className="text-muted-foreground font-normal">— Journal Voucher</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Header info */}
          <div className="grid grid-cols-2 gap-2 bg-muted/30 rounded-lg px-3 py-2.5 text-xs">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Date</p>
              <p className="font-medium">{formatJournalRegisterDate(row.date)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-0.5">Reference No.</p>
              <p className="font-mono font-medium">{row.referenceNo === "—" ? "—" : row.referenceNo}</p>
            </div>
          </div>

          {/* Ledger entries */}
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_auto] gap-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/40 border-b border-border px-3 py-1.5">
              <span>Ledger</span>
              <span className="text-right">Amount (₹)</span>
            </div>
            {/* Debit row */}
            <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2.5 border-b border-border/60">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Dr (Debit)</p>
                <p className="text-xs font-medium text-foreground">{row.debitLedger}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">&nbsp;</p>
                <p className="text-xs font-semibold font-mono text-foreground">
                  {formatMoney(row.debitAmount)}
                </p>
              </div>
            </div>
            {/* Credit row */}
            <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2.5">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Cr (Credit)</p>
                <p className="text-xs font-medium text-foreground">{row.creditLedger}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">&nbsp;</p>
                <p className="text-xs font-semibold font-mono text-foreground">
                  {formatMoney(row.creditAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Narration */}
          {row.narration && row.narration !== "—" && (
            <div className="bg-muted/20 rounded-lg px-3 py-2.5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">Narration</p>
              <p className="text-xs text-foreground leading-relaxed">{row.narration}</p>
            </div>
          )}

          {/* Balance check */}
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs",
              row.debitAmount === row.creditAmount
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700",
            )}
          >
            {row.debitAmount === row.creditAmount ? (
              <>
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">Voucher is balanced</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span className="font-medium">
                  Unbalanced — Debit {formatMoney(row.debitAmount)}, Credit{" "}
                  {formatMoney(row.creditAmount)}
                </span>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// â”€â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function JournalRegisterPageClient() {
  const mounted = useClientMounted();

  // Date range (default: this_year so seeded data is immediately visible)
  const [preset, setPreset] = useState<DateRangePresetId>("this_year");
  const initialDates = useMemo(() => resolveDateRangePreset("this_year"), []);
  const [dateFrom, setDateFrom] = useState(initialDates.from);
  const [dateTo, setDateTo] = useState(initialDates.to);

  const [ledgerSearch, setLedgerSearch] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const [viewRow, setViewRow] = useState<JournalRegisterRow | null>(null);

  const handlePresetChange = useCallback((newPreset: DateRangePresetId) => {
    setPreset(newPreset);
    if (newPreset !== "custom") {
      const { from, to } = resolveDateRangePreset(newPreset);
      setDateFrom(from);
      setDateTo(to);
    }
  }, []);

  const sourceRows = useMemo(() => (mounted ? buildJournalRegisterRows() : []), [mounted]);

  const filtered = useMemo(
    () =>
      filterJournalRegisterRows(sourceRows, {
        dateFrom,
        dateTo,
        ledgerSearch,
        search,
      }),
    [sourceRows, dateFrom, dateTo, ledgerSearch, search],
  );

  const getCellValue = useCallback(
    (row: JournalRegisterRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const columnConfig = useMemo(
    () => ({
      date: { type: "date" as const },
      journalNo: { type: "text" as const },
      referenceNo: { type: "text" as const },
      debitLedger: { type: "text" as const },
      creditLedger: { type: "text" as const },
      narration: { type: "text" as const },
      debitAmount: { type: "amount" as const },
      creditAmount: { type: "amount" as const },
    }),
    [],
  );

  const hasFilters = Boolean(search.trim()) || Boolean(ledgerSearch.trim());

  const clearFilters = useCallback(() => {
    setSearch("");
    setLedgerSearch("");
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, ledgerSearch, search, pageSize]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      ledger: ledgerSearch.trim() || "All ledgers",
      search: search.trim(),
    }),
    [dateFrom, dateTo, ledgerSearch, search],
  );

  return (
    <AccountsColumnFilterProvider
      rows={filtered}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <JournalRegisterBody
        mounted={mounted}
        filtered={filtered}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        preset={preset}
        handlePresetChange={handlePresetChange}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        ledgerSearch={ledgerSearch}
        setLedgerSearch={setLedgerSearch}
        search={search}
        setSearch={setSearch}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        exporting={exporting}
        setExporting={setExporting}
        exportMeta={exportMeta}
        viewRow={viewRow}
        setViewRow={setViewRow}
      />
    </AccountsColumnFilterProvider>
  );
}

function JournalRegisterBody({
  mounted,
  filtered,
  hasFilters,
  clearFilters,
  preset,
  handlePresetChange,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  ledgerSearch,
  setLedgerSearch,
  search,
  setSearch,
  page,
  setPage,
  pageSize,
  setPageSize,
  exporting,
  setExporting,
  exportMeta,
  viewRow,
  setViewRow,
}: {
  mounted: boolean;
  filtered: JournalRegisterRow[];
  hasFilters: boolean;
  clearFilters: () => void;
  preset: DateRangePresetId;
  handlePresetChange: (newPreset: DateRangePresetId) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  ledgerSearch: string;
  setLedgerSearch: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  exportMeta: Parameters<typeof exportJournalRegisterToExcel>[1];
  viewRow: JournalRegisterRow | null;
  setViewRow: (row: JournalRegisterRow | null) => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows(filtered);
  const summary = useMemo(() => computeJournalRegisterSummary(columnFilteredRows), [columnFilteredRows]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredRows.slice(start, start + pageSize);
  }, [columnFilteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, setPage]);

  const handleExportExcel = async () => {
    if (columnFilteredRows.length === 0 || exporting) return;
    setExporting(true);
    try {
      await exportJournalRegisterToExcel(columnFilteredRows, exportMeta, summary);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (columnFilteredRows.length === 0 || exporting) return;
    exportJournalRegisterToPdf(columnFilteredRows, exportMeta, summary);
  };

  return (
    <>
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Reports", "Journal Register")}
        title="Journal Register"
        description="Read-only register of posted journal vouchers for the selected period."
        actions={
          <AccountsExportMenu
            onExcel={handleExportExcel}
            onPdf={handleExportPdf}
            disabled={exporting || columnFilteredRows.length === 0}
          />
        }
        filters={
          <ReportFilterRow className="items-end">
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={handlePresetChange}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />

            {/* Ledger search */}
            <div className="space-y-1 min-w-[180px]">
              <Label className={filterLabelClass}>Ledger</Label>
              <div className="relative">
                <Input
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Search ledger name…"
                  className={cn(filterControlClass, "mt-0 pr-7")}
                />
                {ledgerSearch && (
                  <button
                    type="button"
                    onClick={() => setLedgerSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear ledger search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Reference, narration…"
            />
          </ReportFilterRow>
        }
        layout="split"
        className="h-full min-h-0"
      >
        <div className="flex flex-col flex-1 min-h-0">
          <AccountsTableScroll>
            <AccountsTable minWidth={1120}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                <SortTh label="Date" colKey="date" filterType="date" />
                <SortTh label="Journal No." colKey="journalNo" />
                <SortTh label="Reference No." colKey="referenceNo" />
                <SortTh label="Debit Ledger" colKey="debitLedger" />
                <SortTh label="Credit Ledger" colKey="creditLedger" />
                <SortTh label="Narration" colKey="narration" />
                <SortTh label="Debit Amount" colKey="debitAmount" filterType="amount" align="right" />
                <SortTh label="Credit Amount" colKey="creditAmount" filterType="amount" align="right" />
                <AccountsColumnHeader label="View" colKey="_view" sortable={false} filterable={false} align="center" className="w-10" />
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {!mounted ? (
                  <AccountsTableRow>
                    <AccountsTableCell colSpan={9} className="accounts-table-empty">
                      Loading…
                    </AccountsTableCell>
                  </AccountsTableRow>
                ) : filtered.length === 0 ? (
                  <AccountsTableEmpty
                    colSpan={9}
                    message="No journal voucher entries found for the selected period."
                    onClear={hasFilters ? clearFilters : undefined}
                  />
                ) : columnFilteredRows.length === 0 ? (
                  <AccountsTableRow>
                    <AccountsTableCell colSpan={9} className="accounts-table-empty">
                      No records match the column filters.
                    </AccountsTableCell>
                  </AccountsTableRow>
                ) : (
                  paginated.map((row) => (
                    <AccountsTableRow key={row.id}>
                      <AccountsTableCell className="whitespace-nowrap text-xs">
                        {formatJournalRegisterDate(row.date)}
                      </AccountsTableCell>
                      <AccountsTableCell mono className="font-semibold text-brand-700 text-xs whitespace-nowrap">
                        {row.journalNo}
                      </AccountsTableCell>
                      <AccountsTableCell mono className="text-xs text-muted-foreground whitespace-nowrap">
                        {row.referenceNo}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs max-w-[130px] truncate" title={row.debitLedger}>
                        {row.debitLedger}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-xs max-w-[130px] truncate" title={row.creditLedger}>
                        {row.creditLedger}
                      </AccountsTableCell>
                      <AccountsTableCell
                        className="text-xs text-muted-foreground max-w-[200px] truncate"
                        title={row.narration}
                      >
                        {row.narration}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("whitespace-nowrap", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(row.debitAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell
                        align="right"
                        money
                        className={cn("whitespace-nowrap", MONEY_AMOUNT_CLASS)}
                      >
                        {formatMoney(row.creditAmount)}
                      </AccountsTableCell>
                      <AccountsTableCell className="text-center w-10">
                        <button
                          type="button"
                          onClick={() => setViewRow(row)}
                          className="inline-flex items-center justify-center w-6 h-6 rounded-md text-muted-foreground hover:text-brand-700 hover:bg-brand-50 transition-colors"
                          aria-label={`View ${row.journalNo}`}
                          title={`View ${row.journalNo}`}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </AccountsTableCell>
                    </AccountsTableRow>
                  ))
                )}
              </AccountsTableBody>
              {columnFilteredRows.length > 0 && (
                <AccountsTableFoot>
                  <AccountsTableRow>
                    <AccountsTableCell colSpan={6} className="font-semibold text-xs text-foreground">
                      Total ({summary.count} entries)
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("font-semibold", MONEY_AMOUNT_CLASS, !summary.isBalanced && "text-red-600")}
                    >
                      {formatMoney(summary.totalDebit)}
                    </AccountsTableCell>
                    <AccountsTableCell
                      align="right"
                      money
                      className={cn("font-semibold", MONEY_AMOUNT_CLASS, !summary.isBalanced && "text-red-600")}
                    >
                      {formatMoney(summary.totalCredit)}
                    </AccountsTableCell>
                    <AccountsTableCell />
                  </AccountsTableRow>
                </AccountsTableFoot>
              )}
            </AccountsTable>
          </AccountsTableScroll>

          {columnFilteredRows.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-border bg-muted/20 px-4 py-2 flex-shrink-0">
              <div className="flex items-center gap-2 text-xs">
                {summary.isBalanced ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-emerald-700 font-medium">
                      Total Debit and Total Credit match — report is balanced.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-red-600 font-medium">
                      Warning: Total Debit ({formatMoney(summary.totalDebit)}) and Total Credit (
                      {formatMoney(summary.totalCredit)}) do not match. Difference:{" "}
                      {formatMoney(summary.difference)}.
                    </span>
                  </>
                )}
              </div>
              <AccountsTablePagination
                page={page}
                pageSize={pageSize}
                totalRecords={columnFilteredRows.length}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
                recordLabel="journal vouchers"
              />
            </div>
          )}
        </div>
      </AccountsPageShell>

      <JournalVoucherDetailModal row={viewRow} onClose={() => setViewRow(null)} />
    </>
  );
}

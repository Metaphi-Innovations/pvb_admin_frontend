"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportFromToDateFilter,
  ReportSearchFilter,
} from "@/components/accounts/ReportFilters";
import { SortTh } from "../../components/AccountsUI";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildJournalRegisterRows,
  computeJournalRegisterSummary,
  filterJournalRegisterRows,
  formatJournalRegisterDate,
  getJournalRegisterLedgerOptions,
  journalRegisterViewHref,
  sortJournalRegisterRows,
  type JournalRegisterSortKey,
} from "./journal-register-data";
import {
  exportJournalRegisterToExcel,
  exportJournalRegisterToPdf,
} from "./journal-register-export";

const filterLabelClass = "text-[10px] font-medium uppercase text-muted-foreground leading-none";
const filterControlClass = "h-7 text-xs mt-0";

export default function JournalRegisterPageClient() {
  const mounted = useClientMounted();

  const [dateFrom, setDateFrom] = useState("2026-04-01");
  const [dateTo, setDateTo] = useState("2026-06-30");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [journalNo, setJournalNo] = useState("");
  const [ledgerId, setLedgerId] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<JournalRegisterSortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const activeFyId = getActiveFinancialYearId();
    const years = loadFinancialYears();
    const activeFy = years.find((fy) => fy.id === activeFyId) ?? years.find((fy) => fy.status === "active");

    if (activeFy) {
      setFinancialYearId(String(activeFy.id));
      setDateFrom(activeFy.startDate);
      setDateTo(activeFy.endDate > "2026-06-30" ? "2026-06-30" : activeFy.endDate);
    }
  }, []);

  useEffect(() => {
    if (financialYearId === "all") return;
    const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
    if (!fy) return;
    setDateFrom(fy.startDate);
    setDateTo(fy.endDate);
  }, [financialYearId]);

  const sourceRows = useMemo(() => (mounted ? buildJournalRegisterRows() : []), [mounted]);

  const ledgerOptions = useMemo(() => getJournalRegisterLedgerOptions(sourceRows), [sourceRows]);

  const filtered = useMemo(
    () =>
      filterJournalRegisterRows(sourceRows, {
        dateFrom,
        dateTo,
        financialYearId: financialYearId === "all" ? "all" : Number(financialYearId),
        journalNo,
        ledgerId,
        search,
      }),
    [sourceRows, dateFrom, dateTo, financialYearId, journalNo, ledgerId, search],
  );

  const sorted = useMemo(
    () => sortJournalRegisterRows(filtered, sortKey, sortDir),
    [filtered, sortKey, sortDir],
  );

  const summary = useMemo(() => computeJournalRegisterSummary(filtered), [filtered]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  const hasFilters =
    Boolean(search.trim()) ||
    Boolean(journalNo.trim()) ||
    ledgerId !== "all" ||
    financialYearId !== "all";

  const clearFilters = useCallback(() => {
    setSearch("");
    setJournalNo("");
    setLedgerId("all");
    const activeFyId = getActiveFinancialYearId();
    setFinancialYearId(activeFyId ? String(activeFyId) : "all");
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, financialYearId, journalNo, ledgerId, search, pageSize]);

  const handleSort = (key: JournalRegisterSortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const onColumnSort = (key: string) => handleSort(key as JournalRegisterSortKey);

  const financialYearLabel = useMemo(() => {
    if (financialYearId === "all") return "All years";
    return loadFinancialYears().find((fy) => String(fy.id) === financialYearId)?.name ?? "—";
  }, [financialYearId]);

  const ledgerLabel = useMemo(() => {
    if (ledgerId === "all") return "All ledgers";
    return ledgerOptions.find((l) => String(l.id) === ledgerId)?.name ?? ledgerId;
  }, [ledgerId, ledgerOptions]);

  const exportMeta = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYear: financialYearLabel,
      journalNo: journalNo.trim(),
      ledger: ledgerLabel,
      search: search.trim(),
    }),
    [dateFrom, dateTo, financialYearLabel, journalNo, ledgerLabel, search],
  );

  const handleExportExcel = async () => {
    if (sorted.length === 0 || exporting) return;
    setExporting(true);
    try {
      await exportJournalRegisterToExcel(sorted, exportMeta, summary);
    } finally {
      setExporting(false);
    }
  };

  const handleExportPdf = () => {
    if (sorted.length === 0 || exporting) return;
    exportJournalRegisterToPdf(sorted, exportMeta, summary);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Journal Register")}
      title="Journal Register"
      description="Read-only register of posted journal vouchers for the selected period."
      actions={
        <AccountsExportMenu
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          disabled={exporting || sorted.length === 0}
        />
      }
      filters={
        <ReportFilterRow className="items-end">
          <ReportFinancialYearFilter value={financialYearId} onChange={setFinancialYearId} />
          <ReportFromToDateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <div className="space-y-1 min-w-[130px]">
            <Label className={filterLabelClass}>Journal No.</Label>
            <Input
              value={journalNo}
              onChange={(e) => setJournalNo(e.target.value)}
              placeholder="JV-00001…"
              className={cn(filterControlClass, "mt-0")}
            />
          </div>
          <div className="space-y-1 min-w-[180px]">
            <Label className={filterLabelClass}>Ledger</Label>
            <Select value={ledgerId} onValueChange={setLedgerId}>
              <SelectTrigger className={cn(filterControlClass, "mt-0 w-[180px]")}>
                <SelectValue placeholder="All ledgers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ledgers</SelectItem>
                {ledgerOptions.map((l) => (
                  <SelectItem key={l.id} value={String(l.id)}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Reference, ledger, narration…"
          />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <AccountsTableScroll>
          <AccountsTable minWidth={1100}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortTh label="Date" colKey="date" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                <SortTh label="Journal No." colKey="journalNo" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                <AccountsTableHeadCell uppercase>Reference No.</AccountsTableHeadCell>
                <SortTh label="Debit Ledger" colKey="debitLedger" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                <SortTh label="Credit Ledger" colKey="creditLedger" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} />
                <AccountsTableHeadCell uppercase>Narration</AccountsTableHeadCell>
                <SortTh label="Debit Amount" colKey="debitAmount" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} align="right" />
                <SortTh label="Credit Amount" colKey="creditAmount" sortKey={sortKey} sortDir={sortDir} onSort={onColumnSort} align="right" />
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {!mounted ? (
                <AccountsTableRow>
                  <AccountsTableCell colSpan={8} className="accounts-table-empty">
                    Loading…
                  </AccountsTableCell>
                </AccountsTableRow>
              ) : sorted.length === 0 ? (
                <AccountsTableEmpty
                  colSpan={8}
                  message="No Journal Voucher entries found for the selected period."
                  onClear={hasFilters ? clearFilters : undefined}
                />
              ) : (
                paginated.map((row) => (
                  <AccountsTableRow key={row.id} className="group">
                    <AccountsTableCell className="whitespace-nowrap text-xs">
                      {formatJournalRegisterDate(row.date)}
                    </AccountsTableCell>
                    <AccountsTableCell mono>
                      <Link
                        href={journalRegisterViewHref(row)}
                        className="text-brand-700 hover:underline font-mono text-xs font-semibold"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.journalNo}
                      </Link>
                    </AccountsTableCell>
                    <AccountsTableCell mono className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.referenceNo}
                    </AccountsTableCell>
                    <AccountsTableCell className="text-xs max-w-[140px] truncate" title={row.debitLedger}>
                      {row.debitLedger}
                    </AccountsTableCell>
                    <AccountsTableCell className="text-xs max-w-[140px] truncate" title={row.creditLedger}>
                      {row.creditLedger}
                    </AccountsTableCell>
                    <AccountsTableCell
                      className="text-xs text-muted-foreground max-w-[220px] truncate"
                      title={row.narration}
                    >
                      {row.narration}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className={cn("whitespace-nowrap", MONEY_AMOUNT_CLASS)}>
                      {formatMoney(row.debitAmount)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className={cn("whitespace-nowrap", MONEY_AMOUNT_CLASS)}>
                      {formatMoney(row.creditAmount)}
                    </AccountsTableCell>
                  </AccountsTableRow>
                ))
              )}
            </AccountsTableBody>
            {sorted.length > 0 && (
              <AccountsTableFoot>
                <AccountsTableRow>
                  <AccountsTableCell colSpan={6} className="font-semibold text-[11px] text-foreground">
                    Total
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
                </AccountsTableRow>
              </AccountsTableFoot>
            )}
          </AccountsTable>
        </AccountsTableScroll>

        {sorted.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-border bg-muted/20 px-4 py-2">
            <div className="flex items-center gap-2 text-[11px]">
              {summary.isBalanced ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="text-emerald-700 font-medium">
                    Total Debit and Total Credit match — report is balanced.
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
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
              totalRecords={sorted.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="journal vouchers"
            />
          </div>
        )}
      </div>
    </AccountsPageShell>
  );
}

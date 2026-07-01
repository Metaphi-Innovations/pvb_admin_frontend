"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Download,
  Eye,
  FileDown,
  FileSpreadsheet,
  Percent,
  Receipt,
  Scale,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { EmptySearch } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/listing/Pagination";
import { MiniKPICard } from "@/components/ui/KPICard";
import {
  ReportFilterRow,
  ReportFromToDateFilter,
  ReportTdsPaymentStatusFilter,
  ReportTdsPartyTypeFilter,
  ReportTdsSectionFilter,
} from "@/components/accounts/ReportFilters";
import {
  computeTdsPartyWiseSummary,
  filterTdsPartyWiseRows,
  loadTdsPartyWiseRows,
  resolvePartyGeneralLedgerHref,
  type TdsPartyWiseRow,
  type TdsPaymentStatus,
} from "@/lib/accounts/tds-party-wise-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { defaultDayBookDateFrom, todayIso } from "@/lib/accounts/day-book-data";
import { useTransactionDetailsDrawer } from "@/components/accounts/TransactionDetailsDrawer";
import { cn } from "@/lib/utils";

const STATUS_CFG: Record<
  TdsPaymentStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  paid: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Paid" },
  unpaid: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", label: "Unpaid" },
};

function TdsStatusPill({ status }: { status: TdsPaymentStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

export default function TdsPartyWiseReportClient() {
  const searchParams = useSearchParams();
  const today = todayIso();
  const defaultFrom = defaultDayBookDateFrom();
  const { openTransaction, drawer: transactionDrawer } = useTransactionDetailsDrawer();

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(today);
  const [section, setSection] = useState("all");
  const [ledgerId, setLedgerId] = useState("all");
  const [partyType, setPartyType] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const fromUrl = searchParams.get("section");
    const ledger = searchParams.get("ledger");
    if (fromUrl) setSection(fromUrl.toUpperCase());
    if (ledger) setLedgerId(ledger);
  }, [searchParams]);

  const allRows = useMemo(() => loadTdsPartyWiseRows(), []);

  const filtered = useMemo(
    () =>
      filterTdsPartyWiseRows(allRows, {
        dateFrom,
        dateTo,
        section,
        ledgerId,
        partyType,
        paymentStatus,
        search,
      }),
    [allRows, dateFrom, dateTo, section, ledgerId, partyType, paymentStatus, search],
  );

  const summary = useMemo(() => computeTdsPartyWiseSummary(filtered), [filtered]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const hasFilters =
    Boolean(search.trim()) ||
    dateFrom !== defaultFrom ||
    dateTo !== today ||
    section !== "all" ||
    ledgerId !== "all" ||
    partyType !== "all" ||
    paymentStatus !== "all";

  const clearFilters = useCallback(() => {
    setSearch("");
    setDateFrom(defaultFrom);
    setDateTo(today);
    setSection("all");
    setLedgerId("all");
    setPartyType("all");
    setPaymentStatus("all");
    setPage(1);
  }, [defaultFrom, today]);

  useEffect(() => {
    setPage(1);
  }, [search, dateFrom, dateTo, section, ledgerId, partyType, paymentStatus, pageSize]);

  const exportCsv = () => {
    const headers = [
      "Party Name",
      "Party Type",
      "PAN",
      "TDS Section",
      "TDS Rate",
      "Voucher No",
      "Voucher Date",
      "Bill No",
      "Taxable Amount",
      "TDS Amount",
      "Status",
      "Challan No",
    ];
    const body = filtered.map((r) =>
      [
        r.partyName,
        r.partyType,
        r.pan,
        r.tdsSection,
        r.tdsRate,
        r.voucherNo,
        r.voucherDate,
        r.billNo,
        r.taxableAmount,
        r.tdsAmount,
        r.paymentStatus,
        r.challanNo ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[headers.join(","), ...body].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tds-party-wise-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const openSource = useCallback(
    (row: TdsPartyWiseRow) => {
      openTransaction({ type: "tds", row });
    },
    [openTransaction],
  );

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "TDS Party-wise Report")}
      title="TDS Party-wise Report"
      description="Party-wise TDS deductions, deposits and challan status. Open from Chart of Accounts → TDS Payable."
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem className="text-xs gap-2" onClick={exportCsv}>
              <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2" onClick={exportCsv}>
              <FileDown className="w-3.5 h-3.5" /> Export Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
      filters={
        <ReportFilterRow>
          <div className="space-y-1 min-w-[180px]">
            <span className="text-[10px] font-medium uppercase text-muted-foreground">Search</span>
            <Input
              className="h-8 text-xs mt-0"
              placeholder="Party, PAN, voucher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <ReportFromToDateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <ReportTdsSectionFilter value={section} onChange={setSection} />
          <ReportTdsPartyTypeFilter value={partyType} onChange={setPartyType} />
          <ReportTdsPaymentStatusFilter value={paymentStatus} onChange={setPaymentStatus} />
          {hasFilters && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={clearFilters}>
              <X className="w-3 h-3 mr-1" /> Clear
            </Button>
          )}
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 border-b border-border/60 bg-muted/10">
          <MiniKPICard label="Transactions" value={String(summary.count)} icon={Receipt} accent />
          <MiniKPICard label="Taxable Amount" value={formatMoney(summary.taxable)} icon={Scale} />
          <MiniKPICard label="TDS Deducted" value={formatMoney(summary.tds)} icon={Percent} accent />
          <MiniKPICard label="Unpaid TDS" value={formatMoney(summary.unpaid)} icon={Receipt} />
        </div>

        <AccountsTableScroll>
          {filtered.length === 0 ? (
            <EmptySearch onClear={hasFilters ? clearFilters : undefined} />
          ) : (
            <AccountsTable minWidth={1280}>
              <AccountsTableHead>
                <AccountsTableHeadRow>
                  <AccountsTableHeadCell>Party Name</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Party Type</AccountsTableHeadCell>
                  <AccountsTableHeadCell>PAN</AccountsTableHeadCell>
                  <AccountsTableHeadCell>TDS Section</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">TDS Rate</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Voucher No</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Voucher Date</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Bill No</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">Taxable Amt</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="right">TDS Amt</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Status</AccountsTableHeadCell>
                  <AccountsTableHeadCell>Challan No</AccountsTableHeadCell>
                  <AccountsTableHeadCell align="center" className="w-14">
                    Action
                  </AccountsTableHeadCell>
                </AccountsTableHeadRow>
              </AccountsTableHead>
              <AccountsTableBody>
                {paginated.map((row) => (
                  <AccountsTableRow
                    key={row.id}
                    className="group cursor-pointer"
                    onClick={() => openSource(row)}
                  >
                    <AccountsTableCell className="max-w-[160px]">
                      <Link
                        href={resolvePartyGeneralLedgerHref(row)}
                        className="text-xs font-semibold text-brand-700 hover:underline truncate block"
                        title={row.partyName}
                      >
                        {row.partyName}
                      </Link>
                    </AccountsTableCell>
                    <AccountsTableCell className="whitespace-nowrap text-xs">
                      {row.partyType}
                    </AccountsTableCell>
                    <AccountsTableCell mono className="text-xs whitespace-nowrap">
                      {row.pan}
                    </AccountsTableCell>
                    <AccountsTableCell className="whitespace-nowrap">
                      <span className="font-mono text-xs font-semibold text-brand-700">
                        {row.tdsSection}
                      </span>
                      <span className="block text-[10px] text-muted-foreground truncate max-w-[120px]">
                        {row.tdsSectionName}
                      </span>
                    </AccountsTableCell>
                    <AccountsTableCell align="right" className="text-xs whitespace-nowrap">
                      {row.tdsRate}
                    </AccountsTableCell>
                    <AccountsTableCell>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSource(row);
                        }}
                        className="font-mono text-xs font-semibold text-brand-700 hover:underline whitespace-nowrap"
                      >
                        {row.voucherNo}
                      </button>
                    </AccountsTableCell>
                    <AccountsTableCell className="text-xs whitespace-nowrap">
                      {row.voucherDate}
                    </AccountsTableCell>
                    <AccountsTableCell className="text-xs whitespace-nowrap max-w-[120px] truncate" title={row.billNo}>
                      {row.billNo}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className="whitespace-nowrap">
                      {formatMoney(row.taxableAmount)}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" money className="whitespace-nowrap">
                      {formatMoney(row.tdsAmount)}
                    </AccountsTableCell>
                    <AccountsTableCell>
                      <TdsStatusPill status={row.paymentStatus} />
                    </AccountsTableCell>
                    <AccountsTableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.challanNo ?? "—"}
                    </AccountsTableCell>
                    <AccountsTableCell align="center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSource(row);
                        }}
                        className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        aria-label={`View ${row.voucherNo}`}
                      >
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </AccountsTableCell>
                  </AccountsTableRow>
                ))}
              </AccountsTableBody>
            </AccountsTable>
          )}
        </AccountsTableScroll>

        {filtered.length > 0 && (
          <div className="flex-shrink-0">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalRecords={filtered.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="entries"
            />
          </div>
        )}
      </div>
      {transactionDrawer}
    </AccountsPageShell>
  );
}

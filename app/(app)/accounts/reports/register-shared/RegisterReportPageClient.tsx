"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
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
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportFromToDateFilter,
  ReportSearchFilter,
} from "@/components/accounts/ReportFilters";
import { EmptySearch } from "@/components/ui/EmptyState";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { RegisterPaymentStatusBadge } from "../register-shared/RegisterPaymentStatusBadge";
import { exportRegisterToExcel, exportRegisterToPdf } from "../register-shared/register-export";
import type { RegisterPartyOption, RegisterReportRow } from "../register-shared/register-types";
import {
  buildRegisterExportRows,
  computeRegisterTotals,
  filterRegisterRows,
  formatRegisterDate,
} from "../register-shared/register-utils";

const filterLabelClass = "text-[10px] font-medium uppercase text-muted-foreground leading-none";
const filterControlClass = "h-7 text-xs mt-0";

const INVOICE_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "posted", label: "Posted" },
  { value: "draft", label: "Draft" },
  { value: "cancelled", label: "Cancelled" },
];

const GST_RATE_OPTIONS = [
  { value: "all", label: "All rates" },
  { value: "5", label: "5%" },
  { value: "12", label: "12%" },
  { value: "18", label: "18%" },
  { value: "28", label: "28%" },
];

export interface RegisterReportPageConfig {
  mode: "sales" | "purchase";
  title: string;
  description: string;
  breadcrumbSection: string;
  partyLabel: string;
  partyOptions: RegisterPartyOption[];
  buildRows: () => RegisterReportRow[];
  viewHref: (row: RegisterReportRow) => string;
  exportFilePrefix: string;
}

function RegisterPartyFilter({
  label,
  value,
  onChange,
  parties,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  parties: RegisterPartyOption[];
}) {
  return (
    <div className="space-y-1 min-w-[150px]">
      <Label className={filterLabelClass}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={cn(filterControlClass, "w-[150px]")}>
          <SelectValue placeholder={`All ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          {parties.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function RegisterReportPageClient({ config }: { config: RegisterReportPageConfig }) {
  const router = useRouter();
  const mounted = useClientMounted();

  const [dateFrom, setDateFrom] = useState("2025-04-01");
  const [dateTo, setDateTo] = useState("2026-03-31");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [partyId, setPartyId] = useState("all");
  const [invoiceStatus, setInvoiceStatus] = useState("all");
  const [gstRate, setGstRate] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const activeFyId = getActiveFinancialYearId();
    if (activeFyId) setFinancialYearId(String(activeFyId));
  }, []);

  const sourceRows = useMemo(() => (mounted ? config.buildRows() : []), [mounted, config]);

  const filterParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYearId,
      partyId,
      invoiceStatus,
      gstRate,
      search,
    }),
    [dateFrom, dateTo, financialYearId, partyId, invoiceStatus, gstRate, search],
  );

  const filteredRows = useMemo(
    () => filterRegisterRows(sourceRows, filterParams),
    [sourceRows, filterParams],
  );

  const totals = useMemo(() => computeRegisterTotals(filteredRows), [filteredRows]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, financialYearId, partyId, invoiceStatus, gstRate, search, pageSize]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  const hasFilters =
    search.trim() !== "" ||
    partyId !== "all" ||
    invoiceStatus !== "all" ||
    gstRate !== "all" ||
    financialYearId !== "all";

  const clearFilters = () => {
    setSearch("");
    setPartyId("all");
    setInvoiceStatus("all");
    setGstRate("all");
    const activeFyId = getActiveFinancialYearId();
    setFinancialYearId(activeFyId ? String(activeFyId) : "all");
  };

  const openInvoiceView = useCallback(
    (row: RegisterReportRow) => {
      router.push(config.viewHref(row));
    },
    [router, config],
  );

  const exportMeta = useMemo(() => {
    const years = loadFinancialYears();
    const fy =
      financialYearId === "all"
        ? "All years"
        : (years.find((y) => String(y.id) === financialYearId)?.name ?? financialYearId);
    const party =
      partyId === "all"
        ? "All"
        : (config.partyOptions.find((p) => String(p.id) === partyId)?.name ?? partyId);
    const statusLabel =
      INVOICE_STATUS_OPTIONS.find((o) => o.value === invoiceStatus)?.label ?? invoiceStatus;
    const gstLabel = GST_RATE_OPTIONS.find((o) => o.value === gstRate)?.label ?? gstRate;

    return {
      reportName: config.title,
      dateFrom,
      dateTo,
      financialYear: fy,
      partyLabel: config.partyLabel,
      partyFilter: party,
      invoiceStatus: statusLabel,
      gstRate: gstLabel,
      search,
    };
  }, [
    config.title,
    config.partyLabel,
    config.partyOptions,
    dateFrom,
    dateTo,
    financialYearId,
    partyId,
    invoiceStatus,
    gstRate,
    search,
  ]);

  const handleExportExcel = useCallback(async () => {
    if (filteredRows.length === 0 || exporting) return;
    setExporting(true);
    try {
      const rows = buildRegisterExportRows(filteredRows, config.partyLabel);
      await exportRegisterToExcel(rows, exportMeta, totals, config.exportFilePrefix);
    } finally {
      setExporting(false);
    }
  }, [filteredRows, exportMeta, totals, config, exporting]);

  const handleExportPdf = useCallback(() => {
    if (filteredRows.length === 0 || exporting) return;
    const rows = buildRegisterExportRows(filteredRows, config.partyLabel);
    exportRegisterToPdf(rows, exportMeta, totals);
  }, [filteredRows, exportMeta, totals, config, exporting]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(config.breadcrumbSection, config.title)}
      title={config.title}
      description={config.description}
      actions={
        <AccountsExportMenu
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          disabled={exporting || filteredRows.length === 0}
        />
      }
      filters={
        <ReportFilterRow>
          <ReportFinancialYearFilter value={financialYearId} onChange={setFinancialYearId} />
          <ReportFromToDateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <RegisterPartyFilter
            label={config.partyLabel}
            value={partyId}
            onChange={setPartyId}
            parties={config.partyOptions}
          />
          <div className="space-y-1 min-w-[130px]">
            <Label className={filterLabelClass}>Invoice Status</Label>
            <Select value={invoiceStatus} onValueChange={setInvoiceStatus}>
              <SelectTrigger className={cn(filterControlClass, "w-[130px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVOICE_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[110px]">
            <Label className={filterLabelClass}>GST Rate</Label>
            <Select value={gstRate} onValueChange={setGstRate}>
              <SelectTrigger className={cn(filterControlClass, "w-[110px]")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GST_RATE_OPTIONS.map((o) => (
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
            placeholder="Invoice no., party, GSTIN…"
          />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        summary={
          <AccountsSummaryBar
            items={[
              { label: "Invoices", value: String(totals.count) },
              { label: "Total Taxable Value", value: formatMoney(totals.taxableValue) },
              { label: "Total GST", value: formatMoney(totals.gstAmount) },
              { label: "Grand Total", value: formatMoney(totals.grandTotal) },
            ]}
          />
        }
        footer={
          filteredRows.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={filteredRows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="invoices"
            />
          ) : undefined
        }
      >
        {filteredRows.length === 0 ? (
          <EmptySearch compact onClear={hasFilters ? clearFilters : undefined} />
        ) : (
          <AccountsTable minWidth={1080}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <AccountsTableHeadCell>Invoice Date</AccountsTableHeadCell>
                <AccountsTableHeadCell>Invoice No.</AccountsTableHeadCell>
                <AccountsTableHeadCell>{config.partyLabel}</AccountsTableHeadCell>
                <AccountsTableHeadCell>GSTIN</AccountsTableHeadCell>
                <AccountsTableHeadCell>State</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right">Taxable Value</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right">GST Amount</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right">Invoice Total</AccountsTableHeadCell>
                <AccountsTableHeadCell>Payment Status</AccountsTableHeadCell>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {paginatedRows.map((row) => (
                <AccountsTableRow
                  key={row.id}
                  className="group cursor-pointer"
                  onClick={() => openInvoiceView(row)}
                >
                  <AccountsTableCell className="text-xs whitespace-nowrap">
                    {formatRegisterDate(row.invoiceDate)}
                  </AccountsTableCell>
                  <AccountsTableCell mono className="text-brand-700 font-semibold">
                    {row.invoiceNo}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs font-medium">{row.partyName}</AccountsTableCell>
                  <AccountsTableCell mono className="text-xs">
                    {row.gstin}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">{row.state}</AccountsTableCell>
                  <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                    {formatMoney(row.taxableValue)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                    {formatMoney(row.gstAmount)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                    {formatMoney(row.invoiceTotal)}
                  </AccountsTableCell>
                  <AccountsTableCell>
                    <RegisterPaymentStatusBadge status={row.paymentStatus} />
                  </AccountsTableCell>
                </AccountsTableRow>
              ))}
            </AccountsTableBody>
            <AccountsTableFoot>
              <AccountsTableRow>
                <AccountsTableCell colSpan={5} className="font-semibold text-[11px] text-foreground">
                  Totals
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(totals.taxableValue)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(totals.gstAmount)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(totals.grandTotal)}
                </AccountsTableCell>
                <AccountsTableCell />
              </AccountsTableRow>
            </AccountsTableFoot>
          </AccountsTable>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

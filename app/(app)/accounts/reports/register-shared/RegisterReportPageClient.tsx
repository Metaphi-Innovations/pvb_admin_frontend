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
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportSearchFilter,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import { EmptySearch } from "@/components/ui/EmptyState";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { exportRegisterToExcel, exportRegisterToPdf } from "../register-shared/register-export";
import type { RegisterPartyOption, RegisterReportRow } from "../register-shared/register-types";
import {
  buildRegisterExportRows,
  computeRegisterTotals,
  filterRegisterRows,
  formatRegisterDate,
} from "../register-shared/register-utils";
import { buildRegisterPartyOptions } from "../register-shared/register-live-data";

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
  partyOptions?: RegisterPartyOption[];
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

function RegisterReportTable({
  config,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  toolbarFilteredCount,
}: {
  config: RegisterReportPageConfig;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  toolbarFilteredCount: number;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows<RegisterReportRow>([]);

  const totals = useMemo(
    () => computeRegisterTotals(columnFilteredRows),
    [columnFilteredRows],
  );

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredRows.slice(start, start + pageSize);
  }, [columnFilteredRows, page, pageSize]);

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const openInvoiceView = useCallback(
    (row: RegisterReportRow) => {
      router.push(config.viewHref(row));
    },
    [router, config],
  );

  if (toolbarFilteredCount === 0) {
    return null;
  }

  return (
    <>
      <AccountsTable minWidth={1080}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" />
            <SortTh label="Invoice No." colKey="invoiceNo" />
            <SortTh label={config.partyLabel} colKey="partyName" />
            <SortTh label="GSTIN" colKey="gstin" />
            <SortTh label="State" colKey="state" />
            <SortTh label="Taxable Value" colKey="taxableValue" filterType="amount" align="right" />
            <SortTh label="GST Amount" colKey="gstAmount" filterType="amount" align="right" />
            <SortTh label="Invoice Total" colKey="invoiceTotal" filterType="amount" align="right" />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {columnFilteredRows.length === 0 ? (
            <AccountsTableRow>
              <AccountsTableCell colSpan={8} className="accounts-table-empty">
                No records match the column filters.
              </AccountsTableCell>
            </AccountsTableRow>
          ) : (
            paginatedRows.map((row) => (
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
              </AccountsTableRow>
            ))
          )}
        </AccountsTableBody>
        {columnFilteredRows.length > 0 ? (
          <AccountsTableFoot>
            <AccountsTableRow>
              <AccountsTableCell colSpan={5} className="font-semibold text-xs text-foreground">
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
            </AccountsTableRow>
          </AccountsTableFoot>
        ) : null}
      </AccountsTable>
      {columnFilteredRows.length > 0 ? (
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={columnFilteredRows.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          recordLabel="invoices"
        />
      ) : null}
    </>
  );
}

function RegisterReportBody({
  config,
  filteredRows,
  hasFilters,
  clearFilters,
  exportMeta,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  partyId,
  setPartyId,
  partyOptions,
  invoiceStatus,
  setInvoiceStatus,
  gstRate,
  setGstRate,
  search,
  setSearch,
}: {
  config: RegisterReportPageConfig;
  filteredRows: RegisterReportRow[];
  hasFilters: boolean;
  clearFilters: () => void;
  exportMeta: Parameters<typeof exportRegisterToExcel>[1];
  preset: DateRangePresetId;
  setPreset: (v: DateRangePresetId) => void;
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  partyId: string;
  setPartyId: (v: string) => void;
  partyOptions: RegisterPartyOption[];
  invoiceStatus: string;
  setInvoiceStatus: (v: string) => void;
  gstRate: string;
  setGstRate: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
}) {
  const columnFilteredRows = useAccountsFilteredRows(filteredRows);
  const totals = useMemo(
    () => computeRegisterTotals(columnFilteredRows),
    [columnFilteredRows],
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, partyId, invoiceStatus, gstRate, search, pageSize]);

  const handleExportExcel = useCallback(async () => {
    if (columnFilteredRows.length === 0 || exporting) return;
    setExporting(true);
    try {
      const rows = buildRegisterExportRows(columnFilteredRows, config.partyLabel);
      await exportRegisterToExcel(rows, exportMeta, totals, config.exportFilePrefix);
    } finally {
      setExporting(false);
    }
  }, [columnFilteredRows, exportMeta, totals, config, exporting]);

  const handleExportPdf = useCallback(() => {
    if (columnFilteredRows.length === 0 || exporting) return;
    const rows = buildRegisterExportRows(columnFilteredRows, config.partyLabel);
    exportRegisterToPdf(rows, exportMeta, totals);
  }, [columnFilteredRows, exportMeta, totals, config, exporting]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(config.breadcrumbSection, config.title)}
      title={config.title}
      description={config.description}
      filters={
        <ReportFilterRow
          end={
            <AccountsExportMenu
              onExcel={handleExportExcel}
              onPdf={handleExportPdf}
              disabled={exporting || columnFilteredRows.length === 0}
            />
          }
        >
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <RegisterPartyFilter
            label={config.partyLabel}
            value={partyId}
            onChange={setPartyId}
            parties={partyOptions}
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
      >
        {filteredRows.length === 0 ? (
          <EmptySearch compact onClear={hasFilters ? clearFilters : undefined} />
        ) : (
          <RegisterReportTable
            config={config}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            toolbarFilteredCount={filteredRows.length}
          />
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

export function RegisterReportPageClient({ config }: { config: RegisterReportPageConfig }) {
  const mounted = useClientMounted();

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [partyId, setPartyId] = useState("all");
  const [invoiceStatus, setInvoiceStatus] = useState("all");
  const [gstRate, setGstRate] = useState("all");
  const [search, setSearch] = useState("");

  const sourceRows = useMemo(() => (mounted ? config.buildRows() : []), [mounted, config]);

  const partyOptions = useMemo(
    () =>
      config.partyOptions && config.partyOptions.length > 0
        ? config.partyOptions
        : buildRegisterPartyOptions(sourceRows),
    [config.partyOptions, sourceRows],
  );

  const filterParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYearId: "all",
      partyId,
      invoiceStatus,
      gstRate,
      search,
    }),
    [dateFrom, dateTo, partyId, invoiceStatus, gstRate, search],
  );

  const filteredRows = useMemo(
    () => filterRegisterRows(sourceRows, filterParams),
    [sourceRows, filterParams],
  );

  const hasFilters =
    search.trim() !== "" ||
    partyId !== "all" ||
    invoiceStatus !== "all" ||
    gstRate !== "all";

  const clearFilters = () => {
    setSearch("");
    setPartyId("all");
    setInvoiceStatus("all");
    setGstRate("all");
  };

  const exportMeta = useMemo(() => {
    const party =
      partyId === "all"
        ? "All"
        : (partyOptions.find((p) => String(p.id) === partyId)?.name ?? partyId);
    const statusLabel =
      INVOICE_STATUS_OPTIONS.find((o) => o.value === invoiceStatus)?.label ?? invoiceStatus;
    const gstLabel = GST_RATE_OPTIONS.find((o) => o.value === gstRate)?.label ?? gstRate;

    return {
      reportName: config.title,
      dateFrom,
      dateTo,
      financialYear: "",
      partyLabel: config.partyLabel,
      partyFilter: party,
      invoiceStatus: statusLabel,
      gstRate: gstLabel,
      search,
    };
  }, [
    config.title,
    config.partyLabel,
    partyOptions,
    dateFrom,
    dateTo,
    partyId,
    invoiceStatus,
    gstRate,
    search,
  ]);

  const getCellValue = useCallback(
    (row: RegisterReportRow, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const columnConfig = useMemo(
    () => ({
      invoiceDate: { type: "date" as const },
      invoiceNo: { type: "text" as const },
      partyName: { type: "text" as const },
      gstin: { type: "text" as const },
      state: { type: "text" as const },
      taxableValue: { type: "amount" as const },
      gstAmount: { type: "amount" as const },
      invoiceTotal: { type: "amount" as const },
    }),
    [],
  );

  return (
    <AccountsColumnFilterProvider
      rows={filteredRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="invoiceDate"
      defaultSortDir="desc"
    >
      <RegisterReportBody
        config={config}
        filteredRows={filteredRows}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        exportMeta={exportMeta}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        partyId={partyId}
        setPartyId={setPartyId}
        partyOptions={partyOptions}
        invoiceStatus={invoiceStatus}
        setInvoiceStatus={setInvoiceStatus}
        gstRate={gstRate}
        setGstRate={setGstRate}
        search={search}
        setSearch={setSearch}
      />
    </AccountsColumnFilterProvider>
  );
}

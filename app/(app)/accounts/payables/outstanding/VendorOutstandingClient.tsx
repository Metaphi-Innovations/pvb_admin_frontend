"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";

import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";

import {

  computeSupplierInvoiceOutstanding,

  getPayablesFilterOptions,

  type PayableStatus,

  type SupplierInvoiceOutstandingRow,

} from "@/lib/accounts/payables-data";

import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";

import {

  exportSupplierOutstandingToExcel,

  exportSupplierOutstandingToPdf,

} from "@/lib/accounts/payables-export";

import { formatMoney, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";

import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";

import {

  AccountsColumnFilterProvider,

  useAccountsColumnFilterContext,

  useAccountsFilteredRows,

} from "@/app/(app)/accounts/components/AccountsUI";

import {

  ReportFilterRow,

  ReportDateRangeFilter,

  ReportVendorMultiFilter,

  ReportBranchMultiFilter,

  ReportStatusMultiFilter,

  ReportFilterSummary,

  ReportSearchFilter,

  ReportFilterResetButton,

  ReportAsOnDateFilter,

  useReportDateRange,

} from "@/components/accounts/ReportFilters";

import { resetReportDateRange } from "@/lib/accounts/use-accounts-listing-reset";

import {

  buildBranchFilterSummary,

  buildEntityFilterSummary,

  formatMultiSelectLabel,

  normalizeMultiFilter,

  type ReportFilterSummaryItem,

} from "@/lib/accounts/report-multi-filter-utils";

import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";

import { StatusBadge } from "@/components/ui/StatusBadge";

import { payableStatusToBadge } from "@/lib/accounts/accounts-status-badges";

import {

  AccountsRichTable,

  AccountsTableScroll,

  type AccountsRichColumnDef,

} from "@/components/accounts/AccountsTable";

import {

  AccountsTablePagination,

} from "@/components/accounts/AccountsTableListing";

import { cn } from "@/lib/utils";

const PAYMENT_STATUS_OPTIONS: { value: PayableStatus; label: string }[] = [

  { value: "unpaid", label: "Pending" },

  { value: "partially_paid", label: "Partially Paid" },

  { value: "overdue", label: "Overdue" },

  { value: "paid", label: "Paid" },

];

function formatReportDate(value: string): string {

  if (!value || value === "—") return "—";

  const [y, m, d] = value.slice(0, 10).split("-");

  if (!y || !m || !d) return value;

  return `${d}-${m}-${y}`;

}

const COLUMNS: AccountsRichColumnDef<SupplierInvoiceOutstandingRow>[] = [

  {

    key: "vendorName",

    label: "Supplier",

    filterType: "text",

    render: (r) => (

      <span className="text-xs font-medium leading-snug line-clamp-2" title={r.vendorName}>

        {r.vendorName}

      </span>

    ),

  },

  {

    key: "vendorCode",

    label: "Supplier Code",

    filterType: "text",

    render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.vendorCode}</span>,

  },

  {

    key: "gstin",

    label: "GSTIN",

    filterType: "text",

    sortable: false,

    render: (r) => <span className="font-mono text-xs">{r.gstin}</span>,

  },

  {

    key: "invoiceNo",

    label: "Invoice No.",

    filterType: "text",

    render: (r) => <span className="font-mono text-xs font-semibold text-brand-700">{r.invoiceNo}</span>,

  },

  {

    key: "invoiceDate",

    label: "Invoice Date",

    filterType: "date",

    render: (r) => (

      <span className="text-muted-foreground tabular-nums whitespace-nowrap">

        {formatReportDate(r.invoiceDate)}

      </span>

    ),

  },

  {

    key: "dueDate",

    label: "Due Date",

    filterType: "date",

    render: (r) => (

      <span className="text-muted-foreground tabular-nums whitespace-nowrap">

        {formatReportDate(r.dueDate)}

      </span>

    ),

  },

  {

    key: "billAmount",

    label: "Bill Amount",

    align: "right",

    filterType: "amount",

    render: (r) => <span className={MONEY_CELL_CLASS}>{formatMoney(r.billAmount)}</span>,

  },

  {

    key: "paidAmount",

    label: "Paid Amount",

    align: "right",

    filterType: "amount",

    render: (r) => <span className={MONEY_CELL_CLASS}>{formatMoney(r.paidAmount)}</span>,

  },

  {

    key: "outstanding",

    label: "Outstanding Amount",

    align: "right",

    filterType: "amount",

    render: (r) => (

      <span className={cn(MONEY_CELL_CLASS, "font-semibold text-foreground")}>

        {formatMoney(r.outstanding)}

      </span>

    ),

  },

  {

    key: "status",

    label: "Status",

    filterType: "status",

    sortable: false,

    render: (r) => {

      const badge = payableStatusToBadge(r.status);

      return <StatusBadge status={badge.status} label={badge.label} size="sm" />;

    },

  },

  {

    key: "overdueDays",

    label: "Overdue Days",

    align: "right",

    filterType: "number",

    render: (r) => (

      <span

        className={cn(

          "tabular-nums",

          r.overdueDays > 0 && r.outstanding > 0 ? "text-red-600 font-medium" : "text-muted-foreground",

        )}

      >

        {r.outstanding > 0 ? r.overdueDays : "—"}

      </span>

    ),

  },

];

function VendorOutstandingTable({

  page,

  pageSize,

  onPageChange,

  onPageSizeChange,

  emptyMessage,

  hasFilters,

  onClearFilters,

}: {

  page: number;

  pageSize: number;

  onPageChange: (p: number) => void;

  onPageSizeChange: (s: number) => void;

  emptyMessage: string;

  hasFilters: boolean;

  onClearFilters: () => void;

}) {

  const router = useRouter();

  const ctx = useAccountsColumnFilterContext();

  const visible = useAccountsFilteredRows<SupplierInvoiceOutstandingRow>([]);

  const pagedRows = useMemo(

    () => visible.slice((page - 1) * pageSize, page * pageSize),

    [visible, page, pageSize],

  );

  useEffect(() => {

    onPageChange(1);

  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (

    <>

      <AccountsTableScroll>

        <AccountsRichTable

          columns={COLUMNS}

          rows={pagedRows}

          minWidth={1500}

          getRowKey={(r) => r.billId}

          emptyMessage={emptyMessage}

          emptyAction={

            hasFilters ? (

              <button type="button" className="text-xs text-brand-600 hover:underline mt-1" onClick={onClearFilters}>

                Clear filters

              </button>

            ) : undefined

          }

          onRowClick={(r) =>

            router.push(`/accounts/payables/outstanding/${r.vendorId}?billId=${r.billId}`)

          }

        />

      </AccountsTableScroll>

      {visible.length > 0 && (

        <AccountsTablePagination

          page={page}

          pageSize={pageSize}

          totalRecords={visible.length}

          onPageChange={onPageChange}

          onPageSizeChange={onPageSizeChange}

        />

      )}

    </>

  );

}

function VendorOutstandingExport({

  exportMeta,

  exporting,

  onExportingChange,

}: {

  exportMeta: Parameters<typeof exportSupplierOutstandingToExcel>[1];

  exporting: boolean;

  onExportingChange: (v: boolean) => void;

}) {

  const visible = useAccountsFilteredRows<SupplierInvoiceOutstandingRow>([]);

  const handleExportExcel = useCallback(async () => {

    onExportingChange(true);

    try {

      await exportSupplierOutstandingToExcel(visible, exportMeta);

    } finally {

      onExportingChange(false);

    }

  }, [visible, exportMeta, onExportingChange]);

  const handleExportPdf = useCallback(() => {

    exportSupplierOutstandingToPdf(visible, exportMeta);

  }, [visible, exportMeta]);

  return (

    <AccountsExportMenu

      onExcel={handleExportExcel}

      onPdf={handleExportPdf}

      disabled={exporting || visible.length === 0}

    />

  );

}

export default function VendorOutstandingClient() {

  const [refreshKey, setRefreshKey] = useState(0);

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");

  const [branchIds, setBranchIds] = useState<string[]>([]);

  const [vendorIds, setVendorIds] = useState<string[]>([]);

  const [statuses, setStatuses] = useState<string[]>([]);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(25);

  const [exporting, setExporting] = useState(false);

  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());

  const sectionRefresh = useAccountsSectionRefresh("payables");

  useEffect(() => {

    setRefreshKey((k) => k + 1);

  }, [sectionRefresh]);

  useEffect(() => {

    setPage(1);

  }, [dateFrom, dateTo, branchIds, vendorIds, statuses, search, pageSize, refreshKey, asOnDate]);

  const filterOptions = useMemo(() => getPayablesFilterOptions(), [refreshKey]);

  const vendorSelectOptions = useMemo(

    () => filterOptions.vendors.map((v) => ({ value: String(v.id), label: v.vendorName })),

    [filterOptions.vendors],

  );

  const toolbarFiltered = useMemo(() => {

    const statusValues = normalizeMultiFilter(statuses);

    let data = computeSupplierInvoiceOutstanding(asOnDate, {

      vendorIds,

      branch: branchIds,

      statuses: statusValues,

      dateFrom,

      dateTo,

      financialYearId: undefined,

      search,

    });

    if (statusValues.length === 0) {

      data = data.filter((r) => r.outstanding > 0.009);

    }

    return data;

  }, [asOnDate, dateFrom, dateTo, branchIds, vendorIds, statuses, search, refreshKey]);

  const hasToolbarFilters =

    search.trim() !== "" ||

    branchIds.length > 0 ||

    vendorIds.length > 0 ||

    statuses.length > 0 ||

    preset !== "this_year";

  const clearToolbarFilters = () => {

    setSearch("");

    setBranchIds([]);

    setVendorIds([]);

    setStatuses([]);

    resetReportDateRange(setPreset, setDateFrom, setDateTo, "this_year");

  };

  const emptyMessage = hasToolbarFilters

    ? "No supplier invoices match the selected filters."

    : "No outstanding supplier invoices found.";

  const getCellValue = useCallback((row: SupplierInvoiceOutstandingRow, key: string) => {

    if (key === "overdueDays") {

      return row.outstanding > 0 ? row.overdueDays : 0;

    }

    if (key === "status") return row.status;

    return (row as unknown as Record<string, unknown>)[key];

  }, []);

  const exportMeta = useMemo(() => {

    const vendor = formatMultiSelectLabel(vendorIds, vendorSelectOptions, "Supplier", "All suppliers");

    const statusLabel =

      statuses.length === 0

        ? "All statuses"

        : formatMultiSelectLabel(statuses, PAYMENT_STATUS_OPTIONS, "Status");

    const branchLabel =

      branchIds.length === 0

        ? "All branches"

        : branchIds.length === 1

          ? branchIds[0]

          : `${branchIds.length} branches`;

    return {

      reportName: "Supplier Outstanding",

      dateFrom,

      dateTo,

      financialYear: "",

      supplier: vendor,

      branch: branchLabel,

      paymentStatus: statusLabel,

      search,

    };

  }, [vendorIds, vendorSelectOptions, statuses, branchIds, search, dateFrom, dateTo]);

  const filterSummaryItems = useMemo(
    () =>
      [
        buildBranchFilterSummary(branchIds, () => setBranchIds([])),
        buildEntityFilterSummary(
          "vendor",
          "Suppliers",
          vendorIds,
          vendorSelectOptions,
          () => setVendorIds([]),
        ),
      ].filter((item): item is ReportFilterSummaryItem => item != null),
    [branchIds, vendorIds, vendorSelectOptions],
  );

  return (

    <AccountsColumnFilterProvider

      rows={toolbarFiltered}

      getCellValue={getCellValue}

      columnConfig={{

        vendorName: { type: "text" },

        vendorCode: { type: "text" },

        gstin: { type: "text" },

        invoiceNo: { type: "text" },

        invoiceDate: { type: "date" },

        dueDate: { type: "date" },

        billAmount: { type: "amount" },

        paidAmount: { type: "amount" },

        outstanding: { type: "amount" },

        overdueDays: { type: "number" },

        status: { type: "status" },

      }}

      defaultSortKey="invoiceDate"

      defaultSortDir="desc"

    >

      <AccountsPageShell

        breadcrumbs={accountsBreadcrumb("Payables", "Supplier Outstanding")}

        title="Supplier Outstanding"

        description="Unpaid and partially paid supplier purchase invoices with due dates and ageing."

        filters={

          <>

            <ReportFilterRow

              end={

                <VendorOutstandingExport

                  exportMeta={exportMeta}

                  exporting={exporting}

                  onExportingChange={setExporting}

                />

              }

            >

              <ReportSearchFilter

                value={search}

                onChange={setSearch}

                placeholder="Search supplier, invoice, GSTIN…"

              />

              <ReportBranchMultiFilter

                values={branchIds}

                onChange={setBranchIds}

                options={filterOptions.branches}

              />

              <ReportVendorMultiFilter

                values={vendorIds}

                onChange={setVendorIds}

                vendors={filterOptions.vendors}

              />

              <ReportStatusMultiFilter

                values={statuses}

                onChange={setStatuses}

                options={PAYMENT_STATUS_OPTIONS}

                label="Payment Status"

              />

              <ReportDateRangeFilter

                preset={preset}

                dateFrom={dateFrom}

                dateTo={dateTo}

                onPresetChange={setPreset}

                onDateFromChange={setDateFrom}

                onDateToChange={setDateTo}

              />

              <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />

              <ReportFilterResetButton

                showOnlyWhenActive

                active={hasToolbarFilters}

                onClick={clearToolbarFilters}

              />

            </ReportFilterRow>

            <ReportFilterSummary items={filterSummaryItems} />

          </>

        }

        layout="split"

        className="h-full min-h-0"

      >

        <div className="flex flex-col flex-1 min-h-0">

          <VendorOutstandingTable

            page={page}

            pageSize={pageSize}

            onPageChange={setPage}

            onPageSizeChange={setPageSize}

            emptyMessage={emptyMessage}

            hasFilters={hasToolbarFilters}

            onClearFilters={clearToolbarFilters}

          />

        </div>

      </AccountsPageShell>

    </AccountsColumnFilterProvider>

  );

}


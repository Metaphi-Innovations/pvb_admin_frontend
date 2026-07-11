"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";

import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";

import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";

import {

  computeInvoiceOutstanding,

  type InvoiceOutstandingRow,

  type ReceivableStatus,

} from "@/lib/accounts/receivables-data";

import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";

import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";

import { formatMoneyNumber, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";

import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";

import {

  AccountsColumnFilterProvider,

  useAccountsColumnFilterContext,

  useAccountsFilteredRows,

} from "@/app/(app)/accounts/components/AccountsUI";

import {

  ReportFilterRow,

  ReportDateRangeFilter,

  ReportCustomerMultiFilter,

  ReportBranchMultiFilter,

  ReportSalespersonMultiFilter,

  ReportStatusMultiFilter,

  ReportMoreFilters,

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

  countActiveMoreFilters,

  formatMultiSelectLabel,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";

import { StatusBadge } from "@/components/ui/StatusBadge";

import { receivableStatusToBadge } from "@/lib/accounts/accounts-status-badges";

import {

  AccountsRichTable,

  type AccountsRichColumnDef,

} from "@/components/accounts/AccountsTable";

import {

  AccountsTablePagination,

  AccountsTableListing,

} from "@/components/accounts/AccountsTableListing";

import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";

import { cn } from "@/lib/utils";

import {

  exportReceivablesToExcel,

  exportReceivablesToPdf,

  formatExportAmount,

  formatExportStatus,

} from "../receivables-export";

const PAYMENT_STATUS_OPTIONS: { value: ReceivableStatus; label: string }[] = [

  { value: "paid", label: "Paid" },

  { value: "partially_paid", label: "Partially Received" },

  { value: "unpaid", label: "Pending" },

  { value: "overdue", label: "Overdue" },

];

function formatReportDate(value: string): string {

  if (!value || value === "—") return "—";

  const [y, m, d] = value.slice(0, 10).split("-");

  if (!y || !m || !d) return value;

  return `${d}-${m}-${y}`;

}

function AmountCell({ amount, className }: { amount: number; className?: string }) {

  return (

    <span className={cn("inline-block whitespace-nowrap tabular-nums", MONEY_CELL_CLASS, className)}>

      ₹{formatMoneyNumber(amount)}

    </span>

  );

}

const COLUMNS: AccountsRichColumnDef<InvoiceOutstandingRow>[] = [

  {

    key: "customerName",

    label: "Customer",

    filterType: "text",

    render: (r) => (

      <span className="text-xs font-medium leading-snug line-clamp-2" title={r.customerName}>

        {r.customerName}

      </span>

    ),

  },

  {

    key: "customerCode",

    label: "Customer Code",

    filterType: "text",

    render: (r) => (

      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">{r.customerCode}</span>

    ),

  },

  {

    key: "gstin",

    label: "GSTIN",

    filterType: "text",

    sortable: false,

    render: (r) => <span className="text-xs font-mono whitespace-nowrap">{r.gstin}</span>,

  },

  {

    key: "invoiceNo",

    label: "Invoice No.",

    filterType: "text",

    render: (r) => (

      <span className="text-xs font-mono font-semibold text-brand-700 whitespace-nowrap">{r.invoiceNo}</span>

    ),

  },

  {

    key: "invoiceDate",

    label: "Invoice Date",

    filterType: "date",

    render: (r) => (

      <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">

        {formatReportDate(r.invoiceDate)}

      </span>

    ),

  },

  {

    key: "dueDate",

    label: "Due Date",

    filterType: "date",

    render: (r) => (

      <span className="text-xs whitespace-nowrap tabular-nums">{formatReportDate(r.dueDate)}</span>

    ),

  },

  {

    key: "invoiceAmount",

    label: "Invoice Amount",

    align: "right",

    filterType: "amount",

    render: (r) => <AmountCell amount={r.invoiceAmount} />,

  },

  {

    key: "receivedAmount",

    label: "Received Amount",

    align: "right",

    filterType: "amount",

    render: (r) => <AmountCell amount={r.receivedAmount} />,

  },

  {

    key: "outstandingAmount",

    label: "Outstanding Amount",

    align: "right",

    filterType: "amount",

    render: (r) => <AmountCell amount={r.outstandingAmount} className="font-semibold" />,

  },

  {

    key: "status",

    label: "Status",

    filterType: "status",

    sortable: false,

    render: (r) => {

      const badge = receivableStatusToBadge(r.status);

      return <StatusBadge status={badge.status} label={badge.label} size="sm" />;

    },

  },

  {

    key: "overdueDays",

    label: "Overdue Days",

    align: "center",

    filterType: "number",

    render: (r) => (

      <span

        className={cn(

          "text-xs tabular-nums",

          r.overdueDays > 0 && r.outstandingAmount > 0 ? "text-red-600 font-semibold" : "text-muted-foreground",

        )}

      >

        {r.outstandingAmount > 0 ? r.overdueDays : "—"}

      </span>

    ),

  },

];

function OutstandingExport({

  exportMeta,

}: {

  exportMeta: {

    reportName: string;

    dateFrom: string;

    dateTo: string;

    customer: string;

    branch: string;

    status: string;

    search: string;

  };

}) {

  const visible = useAccountsFilteredRows<InvoiceOutstandingRow>([]);

  const handleExcel = () => {

    void exportReceivablesToExcel(

      visible.map((r) => ({

        Customer: r.customerName,

        "Customer Code": r.customerCode,

        GSTIN: r.gstin,

        "Invoice No.": r.invoiceNo,

        "Invoice Date": r.invoiceDate,

        "Due Date": r.dueDate,

        "Invoice Amount": formatExportAmount(r.invoiceAmount),

        "Received Amount": formatExportAmount(r.receivedAmount),

        "Outstanding Amount": formatExportAmount(r.outstandingAmount),

        "Overdue Days": r.outstandingAmount > 0 ? r.overdueDays : 0,

        Status: formatExportStatus(r.status),

      })),

      exportMeta,

      "customer_outstanding",

    );

  };

  const handlePdf = () => {

    exportReceivablesToPdf(

      [

        "Customer",

        "Code",

        "Invoice No.",

        "Invoice Date",

        "Due Date",

        "Invoice Amt",

        "Received",

        "Outstanding",

        "Overdue Days",

        "Status",

      ],

      visible.map((r) => [

        r.customerName,

        r.customerCode,

        r.invoiceNo,

        formatReportDate(r.invoiceDate),

        formatReportDate(r.dueDate),

        formatExportAmount(r.invoiceAmount),

        formatExportAmount(r.receivedAmount),

        formatExportAmount(r.outstandingAmount),

        String(r.outstandingAmount > 0 ? r.overdueDays : 0),

        formatExportStatus(r.status),

      ]),

      exportMeta,

    );

  };

  return <AccountsExportMenu onExcel={handleExcel} onPdf={handlePdf} disabled={visible.length === 0} />;

}

function CustomerOutstandingTable({

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

  const visible = useAccountsFilteredRows<InvoiceOutstandingRow>([]);

  const pagedRows = useMemo(

    () => visible.slice((page - 1) * pageSize, page * pageSize),

    [visible, page, pageSize],

  );

  useEffect(() => {

    onPageChange(1);

  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (

    <AccountsTableListing

      footer={

        visible.length > 0 ? (

          <AccountsTablePagination

            page={page}

            pageSize={pageSize}

            totalRecords={visible.length}

            onPageChange={onPageChange}

            onPageSizeChange={onPageSizeChange}

          />

        ) : null

      }

    >

      <AccountsRichTable

        columns={COLUMNS}

        rows={pagedRows}

        minWidth={1280}

        getRowKey={(r) => r.invoiceId}

        emptyMessage={emptyMessage}

        emptyAction={

          hasFilters ? (

            <button type="button" className="text-xs text-brand-600 hover:underline mt-1" onClick={onClearFilters}>

              Clear filters

            </button>

          ) : undefined

        }

        onRowClick={(r) => router.push(`/accounts/receivables/outstanding/invoice/${r.invoiceId}`)}

      />

    </AccountsTableListing>

  );

}

export default function CustomerOutstandingClient() {

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");

  const [branchIds, setBranchIds] = useState<string[]>([]);

  const [customerIds, setCustomerIds] = useState<string[]>([]);

  const [salespersonIds, setSalespersonIds] = useState<string[]>([]);

  const [statuses, setStatuses] = useState<string[]>([]);

  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] = useState(25);

  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());

  const sectionRefresh = useAccountsSectionRefresh("receivables");

  useEffect(() => {

    setPage(1);

  }, [dateFrom, dateTo, branchIds, customerIds, salespersonIds, statuses, search, pageSize, asOnDate]);

  const customers = useMemo(() => loadCustomers(), []);

  const customerSelectOptions = useMemo(

    () => customers.map((c) => ({ value: String(c.id), label: c.customerName })),

    [customers],

  );

  const salespeople = useMemo(() => {

    const names = new Set<string>();

    for (const c of customers) {

      if (c.salesManName?.trim()) names.add(c.salesManName.trim());

    }

    return [...names].sort((a, b) => a.localeCompare(b));

  }, [customers]);

  const salespersonSelectOptions = useMemo(

    () => salespeople.map((name) => ({ value: name, label: name })),

    [salespeople],

  );

  const moreFiltersActive = countActiveMoreFilters({ status: statuses });

  const toolbarFiltered = useMemo(

    () =>

      computeInvoiceOutstanding(asOnDate, {

        customerIds,

        branch: branchIds,

        salespersons: salespersonIds,

        statuses,

        dateFrom: dateFrom || undefined,

        dateTo: dateTo || undefined,

        search,

      }),

    [asOnDate, branchIds, customerIds, salespersonIds, statuses, dateFrom, dateTo, search, sectionRefresh],

  );

  const hasToolbarFilters =

    search.trim() !== "" ||

    branchIds.length > 0 ||

    customerIds.length > 0 ||

    salespersonIds.length > 0 ||

    statuses.length > 0 ||

    preset !== "this_month";

  const clearToolbarFilters = () => {

    setSearch("");

    setBranchIds([]);

    setCustomerIds([]);

    setSalespersonIds([]);

    setStatuses([]);

    resetReportDateRange(setPreset, setDateFrom, setDateTo, "this_month");

  };

  const emptyMessage = hasToolbarFilters

    ? "No invoices match the selected filters."

    : "No outstanding customer invoices found.";

  const getCellValue = useCallback((row: InvoiceOutstandingRow, key: string) => {

    if (key === "overdueDays") {

      return row.outstandingAmount > 0 ? row.overdueDays : 0;

    }

    if (key === "status") return row.status;

    return (row as unknown as Record<string, unknown>)[key];

  }, []);

  const exportMeta = useMemo(

    () => ({

      reportName: "Customer Outstanding",

      dateFrom,

      dateTo,

      customer: formatMultiSelectLabel(customerIds, customerSelectOptions, "Customer", "All customers"),

      branch:

        branchIds.length === 0

          ? "All branches"

          : branchIds.length === 1

            ? branchIds[0]

            : `${branchIds.length} branches`,

      status:

        statuses.length === 0

          ? "All statuses"

          : formatMultiSelectLabel(statuses, PAYMENT_STATUS_OPTIONS, "Status"),

      search,

    }),

    [dateFrom, dateTo, customerIds, customerSelectOptions, branchIds, statuses, search],

  );

  const filterSummaryItems = useMemo(
    () =>
      [
        buildBranchFilterSummary(branchIds, () => setBranchIds([])),
        buildEntityFilterSummary(
          "customer",
          "Customers",
          customerIds,
          customerSelectOptions,
          () => setCustomerIds([]),
        ),
      ].filter((item): item is ReportFilterSummaryItem => item != null),
    [branchIds, customerIds, customerSelectOptions],
  );

  return (

    <AccountsColumnFilterProvider

      rows={toolbarFiltered}

      getCellValue={getCellValue}

      columnConfig={{

        customerName: { type: "text" },

        customerCode: { type: "text" },

        gstin: { type: "text" },

        invoiceNo: { type: "text" },

        invoiceDate: { type: "date" },

        dueDate: { type: "date" },

        invoiceAmount: { type: "amount" },

        receivedAmount: { type: "amount" },

        outstandingAmount: { type: "amount" },

        overdueDays: { type: "number" },

        status: { type: "status" },

      }}

      defaultSortKey="invoiceDate"

      defaultSortDir="desc"

    >

      <AccountsPageShell

        breadcrumbs={accountsBreadcrumb("Receivables", "Customer Outstanding")}

        title="Customer Outstanding"

        description="Invoice-wise pending receivables from posted sales invoices."

        hideDescription

        filters={

          <>

            <ReportFilterRow end={<OutstandingExport exportMeta={exportMeta} />}>

              <ReportSearchFilter value={search} onChange={setSearch} placeholder="Search invoice, customer…" />

              <ReportBranchMultiFilter values={branchIds} onChange={setBranchIds} />

              <ReportCustomerMultiFilter

                values={customerIds}

                onChange={setCustomerIds}

                customers={customers}

              />

              <ReportSalespersonMultiFilter

                values={salespersonIds}

                onChange={setSalespersonIds}

                salespeople={salespeople}

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

              <ReportMoreFilters activeCount={moreFiltersActive}>

                <ReportStatusMultiFilter

                  values={statuses}

                  onChange={setStatuses}

                  options={PAYMENT_STATUS_OPTIONS}

                  label="Payment Status"

                />

              </ReportMoreFilters>

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

        <CustomerOutstandingTable

          page={page}

          pageSize={pageSize}

          onPageChange={setPage}

          onPageSizeChange={setPageSize}

          emptyMessage={emptyMessage}

          hasFilters={hasToolbarFilters}

          onClearFilters={clearToolbarFilters}

        />

      </AccountsPageShell>

    </AccountsColumnFilterProvider>

  );

}


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
  ReportCustomerFilter,
  ReportSearchFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
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

const PAYMENT_STATUS_OPTIONS: { value: ReceivableStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially Received" },
  { value: "unpaid", label: "Pending" },
  { value: "overdue", label: "Overdue" },
];

const STATUS_FILTER_OPTIONS = ["paid", "partially_paid", "unpaid", "overdue"];

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
}: {
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
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
        emptyMessage="No records found."
        onRowClick={(r) => router.push(`/accounts/receivables/outstanding/invoice/${r.invoiceId}`)}
      />
    </AccountsTableListing>
  );
}

export default function CustomerOutstandingClient() {
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [customerId, setCustomerId] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState<ReceivableStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const asOnDate = defaultAsOnDate();

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, customerId, paymentStatus, search, pageSize]);

  const customers = useMemo(() => loadCustomers(), []);

  const toolbarFiltered = useMemo(
    () =>
      computeInvoiceOutstanding(asOnDate, {
        customerId: customerId === "all" ? undefined : Number(customerId),
        status: paymentStatus,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        search,
      }),
    [asOnDate, customerId, paymentStatus, dateFrom, dateTo, search, sectionRefresh],
  );

  const getCellValue = useCallback((row: InvoiceOutstandingRow, key: string) => {
    if (key === "overdueDays") {
      return row.outstandingAmount > 0 ? row.overdueDays : 0;
    }
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const exportMeta = useMemo(
    () => ({
      reportName: "Customer Outstanding",
      dateFrom,
      dateTo,
      customer:
        customerId === "all"
          ? "All customers"
          : (customers.find((c) => String(c.id) === customerId)?.customerName ?? "—"),
      status:
        paymentStatus === "all"
          ? "All statuses"
          : (PAYMENT_STATUS_OPTIONS.find((o) => o.value === paymentStatus)?.label ?? "—"),
      search,
    }),
    [dateFrom, dateTo, customerId, customers, paymentStatus, search],
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
          <ReportFilterRow end={<OutstandingExport exportMeta={exportMeta} />}>
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <ReportCustomerFilter value={customerId} onChange={setCustomerId} customers={customers} />
            <div className="space-y-1 min-w-[150px]">
              <label className="text-xs font-medium uppercase text-muted-foreground leading-none">
                Payment Status
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as ReceivableStatus | "all")}
                className="h-7 w-full text-sm mt-0 rounded-md border border-border bg-white px-2"
              >
                {PAYMENT_STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <ReportSearchFilter value={search} onChange={setSearch} placeholder="Search invoice, customer…" />
          </ReportFilterRow>
        }
        layout="split"
        className="h-full min-h-0"
      >
        <CustomerOutstandingTable
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </AccountsPageShell>
    </AccountsColumnFilterProvider>
  );
}

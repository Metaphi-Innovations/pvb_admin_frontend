"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  computeInvoiceOutstanding,
  getReceivableStatusLabel,
  type InvoiceOutstandingRow,
  type ReceivableStatus,
} from "@/lib/accounts/receivables-data";
import { ensureReceivablesDemoData } from "@/lib/accounts/receivables-demo-seed";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { formatMoneyNumber, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { StatusBadge, SortTh } from "@/app/(app)/accounts/components/AccountsUI";
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

type SortKey =
  | "customerName"
  | "customerCode"
  | "invoiceNo"
  | "invoiceDate"
  | "dueDate"
  | "invoiceAmount"
  | "receivedAmount"
  | "outstandingAmount"
  | "overdueDays"
  | "status";

const PAYMENT_STATUS_OPTIONS: { value: ReceivableStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
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

export default function CustomerOutstandingClient() {
  const router = useRouter();
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [customerId, setCustomerId] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState<ReceivableStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("invoiceDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const asOnDate = defaultAsOnDate();

  useEffect(() => {
    ensureReceivablesDemoData();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, customerId, paymentStatus, search, pageSize]);

  const customers = useMemo(() => loadCustomers(), []);

  const rows = useMemo(() => {
    const data = computeInvoiceOutstanding(asOnDate, {
      customerId: customerId === "all" ? undefined : Number(customerId),
      status: paymentStatus,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search,
    });

    const sorted = [...data].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return sorted;
  }, [asOnDate, customerId, paymentStatus, dateFrom, dateTo, search, sortKey, sortDir]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const handleSort = (key: string) => {
    const k = key as SortKey;
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const exportMeta = useMemo(
    () => ({
      reportName: "Customer Outstanding",
      dateFrom,
      dateTo,
      customer:
        customerId === "all"
          ? "All customers"
          : customers.find((c) => String(c.id) === customerId)?.customerName ?? "—",
      status:
        paymentStatus === "all"
          ? "All statuses"
          : PAYMENT_STATUS_OPTIONS.find((o) => o.value === paymentStatus)?.label ?? "—",
      search,
    }),
    [dateFrom, dateTo, customerId, customers, paymentStatus, search],
  );

  const handleExcel = () => {
    void exportReceivablesToExcel(
      rows.map((r) => ({
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
      rows.map((r) => [
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

  const columns = useMemo((): AccountsRichColumnDef<InvoiceOutstandingRow>[] => {
    const sortHeader = (
      key: SortKey,
      label: string,
      align: "left" | "right" | "center" = "left",
    ) => (
      <SortTh
        label={label}
        colKey={key}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        align={align}
      />
    );

    return [
      {
        key: "customerName",
        label: "Customer",
        header: sortHeader("customerName", "Customer"),
        render: (r) => (
          <span className="text-xs font-medium leading-snug line-clamp-2" title={r.customerName}>
            {r.customerName}
          </span>
        ),
      },
      {
        key: "customerCode",
        label: "Customer Code",
        header: sortHeader("customerCode", "Customer Code"),
        render: (r) => (
          <span className="text-[11px] font-mono text-muted-foreground whitespace-nowrap">
            {r.customerCode}
          </span>
        ),
      },
      {
        key: "gstin",
        label: "GSTIN",
        render: (r) => <span className="text-[11px] font-mono whitespace-nowrap">{r.gstin}</span>,
      },
      {
        key: "invoiceNo",
        label: "Invoice No.",
        header: sortHeader("invoiceNo", "Invoice No."),
        render: (r) => (
          <span className="text-xs font-mono font-semibold text-brand-700 whitespace-nowrap">
            {r.invoiceNo}
          </span>
        ),
      },
      {
        key: "invoiceDate",
        label: "Invoice Date",
        header: sortHeader("invoiceDate", "Invoice Date"),
        render: (r) => (
          <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
            {formatReportDate(r.invoiceDate)}
          </span>
        ),
      },
      {
        key: "dueDate",
        label: "Due Date",
        header: sortHeader("dueDate", "Due Date"),
        render: (r) => (
          <span className="text-xs whitespace-nowrap tabular-nums">{formatReportDate(r.dueDate)}</span>
        ),
      },
      {
        key: "invoiceAmount",
        label: "Invoice Amount",
        align: "right",
        header: sortHeader("invoiceAmount", "Invoice Amount", "right"),
        render: (r) => <AmountCell amount={r.invoiceAmount} />,
      },
      {
        key: "receivedAmount",
        label: "Received Amount",
        align: "right",
        header: sortHeader("receivedAmount", "Received Amount", "right"),
        render: (r) => <AmountCell amount={r.receivedAmount} />,
      },
      {
        key: "outstandingAmount",
        label: "Outstanding Amount",
        align: "right",
        header: sortHeader("outstandingAmount", "Outstanding Amount", "right"),
        render: (r) => <AmountCell amount={r.outstandingAmount} className="font-semibold" />,
      },
      {
        key: "overdueDays",
        label: "Overdue Days",
        align: "center",
        header: sortHeader("overdueDays", "Overdue Days", "center"),
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
      {
        key: "status",
        label: "Status",
        header: sortHeader("status", "Status"),
        render: (r) => <StatusBadge status={r.status} />,
      },
    ];
  }, [sortKey, sortDir]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Receivables", "Customer Outstanding")}
      title="Customer Outstanding"
      description="Invoice-wise pending receivables from posted sales invoices."
      hideDescription
      filters={
        <ReportFilterRow
          end={
            <AccountsExportMenu onExcel={handleExcel} onPdf={handlePdf} disabled={rows.length === 0} />
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
          <ReportCustomerFilter value={customerId} onChange={setCustomerId} customers={customers} />
          <div className="space-y-1 min-w-[150px]">
            <label className="text-[10px] font-medium uppercase text-muted-foreground leading-none">
              Payment Status
            </label>
            <select
              value={paymentStatus}
              onChange={(e) => setPaymentStatus(e.target.value as ReceivableStatus | "all")}
              className="h-7 w-full text-xs mt-0 rounded-md border border-border bg-white px-2"
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
      <AccountsTableListing
        footer={
          rows.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={rows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          ) : null
        }
      >
        <AccountsRichTable
          columns={columns}
          rows={pagedRows}
          minWidth={1280}
          getRowKey={(r) => r.invoiceId}
          emptyMessage="No records found."
          onRowClick={(r) =>
            router.push(`/accounts/receivables/outstanding/invoice/${r.invoiceId}`)
          }
        />
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

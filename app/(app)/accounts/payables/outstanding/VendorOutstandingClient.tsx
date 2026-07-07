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
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportVendorFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import {
  AccountsRichTable,
  AccountsTableScroll,
  type AccountsRichColumnDef,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTablePagination,
  AccountsTableToolbar,
} from "@/components/accounts/AccountsTableListing";
import { cn } from "@/lib/utils";

const PAYMENT_STATUS_OPTIONS: { value: PayableStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
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

export default function VendorOutstandingClient() {
  const router = useRouter();
  const [refreshKey, setRefreshKey] = useState(0);
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [vendorId, setVendorId] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState<PayableStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  const sectionRefresh = useAccountsSectionRefresh();

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);


  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, vendorId, paymentStatus, search, pageSize, refreshKey]);

  const asOnDate = dateTo || defaultAsOnDate();

  const filterOptions = useMemo(() => getPayablesFilterOptions(), [refreshKey]);

  const rows = useMemo(() => {
    let data = computeSupplierInvoiceOutstanding(asOnDate, {
      vendorId: vendorId === "all" ? undefined : Number(vendorId),
      status: paymentStatus === "all" ? undefined : paymentStatus,
      dateFrom,
      dateTo,
      financialYearId: undefined,
      search,
    });
    if (paymentStatus === "all") {
      data = data.filter((r) => r.outstanding > 0.009);
    } else if (paymentStatus === "paid") {
      data = data.filter((r) => r.status === "paid");
    }
    return data;
  }, [asOnDate, dateFrom, dateTo, vendorId, paymentStatus, search, refreshKey]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const exportMeta = useMemo(() => {
    const vendor =
      vendorId === "all"
        ? "All suppliers"
        : (filterOptions.vendors.find((v) => String(v.id) === vendorId)?.vendorName ?? "All suppliers");
    const statusLabel =
      PAYMENT_STATUS_OPTIONS.find((o) => o.value === paymentStatus)?.label ?? "All statuses";
    return {
      reportName: "Supplier Outstanding",
      dateFrom,
      dateTo,
      financialYear: "",
      supplier: vendor,
      paymentStatus: statusLabel,
      search,
    };
  }, [vendorId, paymentStatus, search, dateFrom, dateTo, filterOptions.vendors]);

  const handleExportExcel = useCallback(async () => {
    setExporting(true);
    try {
      await exportSupplierOutstandingToExcel(rows, exportMeta);
    } finally {
      setExporting(false);
    }
  }, [rows, exportMeta]);

  const handleExportPdf = useCallback(() => {
    exportSupplierOutstandingToPdf(rows, exportMeta);
  }, [rows, exportMeta]);

  const columns = useMemo((): AccountsRichColumnDef<SupplierInvoiceOutstandingRow>[] => [
    {
      key: "vendorName",
      label: "Supplier",
      render: (r) => (
        <span className="text-xs font-medium leading-snug line-clamp-2" title={r.vendorName}>
          {r.vendorName}
        </span>
      ),
    },
    {
      key: "vendorCode",
      label: "Supplier Code",
      render: (r) => <span className="font-mono text-xs text-muted-foreground">{r.vendorCode}</span>,
    },
    {
      key: "gstin",
      label: "GSTIN",
      render: (r) => <span className="font-mono text-xs">{r.gstin}</span>,
    },
    {
      key: "invoiceNo",
      label: "Invoice No.",
      render: (r) => <span className="font-mono text-xs font-semibold text-brand-700">{r.invoiceNo}</span>,
    },
    {
      key: "invoiceDate",
      label: "Invoice Date",
      render: (r) => (
        <span className="text-muted-foreground tabular-nums whitespace-nowrap">
          {formatReportDate(r.invoiceDate)}
        </span>
      ),
    },
    {
      key: "dueDate",
      label: "Due Date",
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
      render: (r) => <span className={MONEY_CELL_CLASS}>{formatMoney(r.billAmount)}</span>,
    },
    {
      key: "paidAmount",
      label: "Paid Amount",
      align: "right",
      render: (r) => <span className={MONEY_CELL_CLASS}>{formatMoney(r.paidAmount)}</span>,
    },
    {
      key: "outstanding",
      label: "Outstanding Amount",
      align: "right",
      render: (r) => (
        <span className={cn(MONEY_CELL_CLASS, "font-semibold text-foreground")}>
          {formatMoney(r.outstanding)}
        </span>
      ),
    },
    {
      key: "overdueDays",
      label: "Overdue Days",
      align: "right",
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
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status} />,
    },
  ], []);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Payables", "Supplier Outstanding")}
      title="Supplier Outstanding"
      description="Unpaid and partially paid supplier purchase invoices with due dates and ageing."
      filters={
        <ReportFilterRow>
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <ReportVendorFilter value={vendorId} onChange={setVendorId} vendors={filterOptions.vendors} />
          <div className="space-y-1 min-w-[140px]">
            <Label className="text-xs font-medium uppercase text-muted-foreground leading-none">
              Payment Status
            </Label>
            <Select
              value={paymentStatus}
              onValueChange={(v) => setPaymentStatus(v as PayableStatus | "all")}
            >
              <SelectTrigger className="h-9 text-sm font-medium mt-0 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <AccountsTableToolbar
          search={{ value: search, onChange: setSearch, placeholder: "Search supplier, invoice, GSTIN…" }}
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          exportDisabled={exporting || rows.length === 0}
        />
        <AccountsTableScroll>
          <AccountsRichTable
            columns={columns}
            rows={pagedRows}
            minWidth={1500}
            getRowKey={(r) => r.billId}
            emptyMessage="No supplier invoices found for the selected filters."
            onRowClick={(r) =>
              router.push(`/accounts/payables/outstanding/${r.vendorId}?billId=${r.billId}`)
            }
          />
        </AccountsTableScroll>
        {rows.length > 0 && (
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={rows.length}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </div>
    </AccountsPageShell>
  );
}

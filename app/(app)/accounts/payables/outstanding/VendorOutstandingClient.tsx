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

const STATUS_FILTER_OPTIONS = ["unpaid", "partially_paid", "paid", "overdue"];

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
}: {
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
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
          emptyMessage="No supplier invoices found for the selected filters."
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

function VendorOutstandingToolbar({
  search,
  onSearchChange,
  exportMeta,
  exporting,
  onExportingChange,
}: {
  search: string;
  onSearchChange: (v: string) => void;
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
    <AccountsTableToolbar
      search={{ value: search, onChange: onSearchChange, placeholder: "Search supplier, invoice, GSTIN…" }}
      onExcel={handleExportExcel}
      onPdf={handleExportPdf}
      exportDisabled={exporting || visible.length === 0}
    />
  );
}

export default function VendorOutstandingClient() {
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

  const toolbarFiltered = useMemo(() => {
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

  const getCellValue = useCallback((row: SupplierInvoiceOutstandingRow, key: string) => {
    if (key === "overdueDays") {
      return row.outstanding > 0 ? row.overdueDays : 0;
    }
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

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
      }}
      defaultSortKey="invoiceDate"
      defaultSortDir="desc"
    >
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
          <VendorOutstandingToolbar
            search={search}
            onSearchChange={setSearch}
            exportMeta={exportMeta}
            exporting={exporting}
            onExportingChange={setExporting}
          />
          <VendorOutstandingTable
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        </div>
      </AccountsPageShell>
    </AccountsColumnFilterProvider>
  );
}

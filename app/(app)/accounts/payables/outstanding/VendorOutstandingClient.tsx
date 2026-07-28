"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Settings2 } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsListingTableCard,
  AccountsListingTabsRow,
} from "@/components/accounts/AccountsListingHeader";
import { AgeingBreakpointPanel } from "@/components/accounts/AgeingBreakpointPanel";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  breakpointsToDraft,
  DEFAULT_AGEING_BREAKPOINTS,
  getAgeingBucketLabels,
  ageingBucketColumnKey,
  type AgeingBreakpoints,
} from "@/lib/accounts/ageing-breakpoints";
import {
  computeVendorOutstanding,
  computeSupplierInvoiceOutstanding,
  computeVendorAgeingRows,
  computePaymentAllocationSummary,
  type VendorOutstandingRow,
  type SupplierInvoiceOutstandingRow,
  type VendorAgeingRow,
} from "@/lib/accounts/payables-data";
import { useAccountsSectionRefresh } from "@/lib/accounts/use-accounts-section-refresh";
import { loadVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { formatMoneyNumber, MONEY_CELL_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import {
  AccountsColumnFilterProvider,
  SectionTabs,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  ReportFilterRow,
  ReportAsOnDateFilter,
  ReportVendorFilter,
  ReportSearchFilter,
  ReportFilterResetButton,
} from "@/components/accounts/ReportFilters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { payableStatusToBadge } from "@/lib/accounts/accounts-status-badges";
import {
  AccountsRichTable,
  AccountsTableScroll,
  type AccountsRichColumnDef,
} from "@/components/accounts/AccountsTable";
import { AccountsTablePagination } from "@/components/accounts/AccountsTableListing";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import {
  AccountsTableActionCell,
  AccountsViewAction,
  accountsActionColClass,
} from "@/components/accounts/AccountsTableActions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  exportSupplierOutstandingToExcel,
  exportSupplierOutstandingToPdf,
  exportSupplierAgeingToExcel,
  exportSupplierAgeingToPdf,
} from "@/lib/accounts/payables-export";
import {
  buildReportExcelDocumentHtml,
  buildStandardReportTableHtml,
  downloadReportExcelHtml,
  escapeHtml,
  exportTabularReportToPdf,
  todayExportDateSuffix,
} from "@/lib/accounts/report-export-presentation";

type WorkspaceView = "summary" | "bills" | "ageing";
type DueStatusFilter = "all" | "overdue" | "not_due";

const VIEW_TABS = [
  { id: "summary", label: "Vendor Summary" },
  { id: "bills", label: "Bill View" },
  { id: "ageing", label: "Ageing View" },
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

function parseViewParam(raw: string | null): WorkspaceView {
  if (raw === "bills" || raw === "bill" || raw === "invoice" || raw === "invoices") return "bills";
  if (raw === "ageing" || raw === "aging") return "ageing";
  if (raw === "summary" || raw === "vendors" || raw === "suppliers") return "summary";
  return "summary";
}

function resolveInitialView(searchParams: URLSearchParams): WorkspaceView {
  const view = searchParams.get("view");
  const tab = searchParams.get("tab");
  if (view) return parseViewParam(view);
  if (tab) return parseViewParam(tab);
  return "summary";
}

function statusLabel(status: string): string {
  return status.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function SummaryTable({
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
  const visible = useAccountsFilteredRows<VendorOutstandingRow>([]);
  const paged = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const columns: AccountsRichColumnDef<VendorOutstandingRow>[] = useMemo(
    () => [
      {
        key: "vendorName",
        label: "Vendor Name",
        filterType: "text",
        render: (r) => (
          <span className="text-xs font-medium leading-snug line-clamp-2" title={r.vendorName}>
            {r.vendorName}
          </span>
        ),
      },
      {
        key: "vendorCode",
        label: "Vendor Code",
        filterType: "text",
        render: (r) => (
          <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">
            {r.vendorCode}
          </span>
        ),
      },
      {
        key: "outstanding",
        label: "Total Outstanding",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.outstanding} className="font-semibold" />,
      },
      {
        key: "overdueAmount",
        label: "Overdue Amount",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.overdueAmount} />,
      },
      {
        key: "notDueAmount",
        label: "Not Due Amount",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.notDueAmount} />,
      },
      {
        key: "oldestDueDate",
        label: "Oldest Due",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{formatReportDate(r.oldestDueDate)}</span>
        ),
      },
      {
        key: "lastPaymentDate",
        label: "Last Payment Date",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{formatReportDate(r.lastPaymentDate)}</span>
        ),
      },
      {
        key: "status",
        label: "Status",
        filterType: "status",
        render: (r) => {
          const badge = payableStatusToBadge(r.status);
          return <StatusBadge status={badge.status} label={badge.label} size="sm" showDot />;
        },
      },
      {
        key: "_actions",
        label: "",
        sortable: false,
        filterable: false,
        align: "right",
        className: accountsActionColClass("single"),
        render: (r) => (
          <AccountsTableActionCell variant="single">
            <AccountsViewAction
              title="View vendor"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/accounts/payables/outstanding/${r.vendorId}`);
              }}
            />
          </AccountsTableActionCell>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsRichTable
          columns={columns}
          rows={paged}
          minWidth={1100}
          getRowKey={(r) => r.vendorId}
          emptyMessage="No vendors with outstanding balances."
          onRowClick={(r) => router.push(`/accounts/payables/outstanding/${r.vendorId}`)}
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
    </div>
  );
}

function BillTable({
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
  const paged = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const columns: AccountsRichColumnDef<SupplierInvoiceOutstandingRow>[] = useMemo(
    () => [
      {
        key: "vendorName",
        label: "Vendor",
        filterType: "text",
        render: (r) => (
          <span className="text-xs font-medium leading-snug line-clamp-2">{r.vendorName}</span>
        ),
      },
      {
        key: "invoiceNo",
        label: "Purchase Invoice No.",
        filterType: "text",
        render: (r) => (
          <span className="text-xs font-mono font-semibold text-brand-700">{r.invoiceNo}</span>
        ),
      },
      {
        key: "invoiceDate",
        label: "Invoice Date",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{formatReportDate(r.invoiceDate)}</span>
        ),
      },
      {
        key: "dueDate",
        label: "Due Date",
        filterType: "date",
        render: (r) => (
          <span className="text-xs whitespace-nowrap">{formatReportDate(r.dueDate)}</span>
        ),
      },
      {
        key: "billAmount",
        label: "Original Amount",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.billAmount} />,
      },
      {
        key: "paidAmount",
        label: "Paid Amount",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.paidAmount} />,
      },
      {
        key: "debitNoteAdjusted",
        label: "Debit Note Adj.",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.debitNoteAdjusted} />,
      },
      {
        key: "outstanding",
        label: "Outstanding",
        align: "right",
        filterType: "amount",
        render: (r) => <AmountCell amount={r.outstanding} className="font-semibold" />,
      },
      {
        key: "overdueDays",
        label: "Overdue Days",
        align: "right",
        filterType: "number",
        render: (r) => (
          <span className="text-xs tabular-nums">
            {r.outstanding > 0 ? r.overdueDays : "—"}
          </span>
        ),
      },
      {
        key: "status",
        label: "Status",
        filterType: "status",
        render: (r) => {
          const badge = payableStatusToBadge(r.status);
          return <StatusBadge status={badge.status} label={badge.label} size="sm" showDot />;
        },
      },
    ],
    [],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsRichTable
          columns={columns}
          rows={paged}
          minWidth={1200}
          getRowKey={(r) => r.billId}
          emptyMessage="No open purchase bills."
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
    </div>
  );
}

function AgeingTable({
  columns,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  columns: AccountsRichColumnDef<VendorAgeingRow>[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
}) {
  const router = useRouter();
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows<VendorAgeingRow>([]);
  const paged = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <AccountsTableScroll>
        <AccountsRichTable
          columns={columns}
          rows={paged}
          minWidth={1280}
          getRowKey={(r) => r.vendorId}
          emptyMessage="No ageing balances."
          onRowClick={(r) => router.push(`/accounts/payables/outstanding/${r.vendorId}`)}
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
    </div>
  );
}

export default function VendorOutstandingClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sectionRefresh = useAccountsSectionRefresh("payables");

  const [view, setView] = useState<WorkspaceView>(() =>
    resolveInitialView(new URLSearchParams(searchParams.toString())),
  );
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [search, setSearch] = useState("");
  const [vendorId, setVendorId] = useState("all");
  const [dueStatus, setDueStatus] = useState<DueStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [appliedBreakpoints, setAppliedBreakpoints] =
    useState<AgeingBreakpoints>(DEFAULT_AGEING_BREAKPOINTS);
  const [breakpointDraft, setBreakpointDraft] = useState(() =>
    breakpointsToDraft(DEFAULT_AGEING_BREAKPOINTS),
  );
  const [breakpointError, setBreakpointError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setView(resolveInitialView(new URLSearchParams(searchParams.toString())));
  }, [searchParams]);

  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, [sectionRefresh]);

  const setWorkspaceView = useCallback(
    (next: WorkspaceView) => {
      setView(next);
      setPage(1);
      const params = new URLSearchParams(searchParams.toString());
      params.delete("tab");
      if (next === "summary") params.delete("view");
      else params.set("view", next === "bills" ? "bills" : next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const vendors = useMemo(() => loadVendors(), [refreshKey]);

  const pendingAllocations = useMemo(() => {
    void refreshKey;
    return computePaymentAllocationSummary().pendingAllocationCount;
  }, [refreshKey, sectionRefresh]);

  const summaryRows = useMemo(() => {
    void refreshKey;
    let rows = computeVendorOutstanding(asOnDate).filter((r) => r.outstanding > 0.009);
    if (vendorId !== "all") rows = rows.filter((r) => String(r.vendorId) === vendorId);
    if (dueStatus === "overdue") rows = rows.filter((r) => r.overdueAmount > 0.009);
    if (dueStatus === "not_due") {
      rows = rows.filter((r) => r.notDueAmount > 0.009 && r.overdueAmount <= 0.009);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.vendorName.toLowerCase().includes(q) || r.vendorCode.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [asOnDate, vendorId, dueStatus, search, refreshKey, sectionRefresh]);

  const billRows = useMemo(() => {
    void refreshKey;
    let rows = computeSupplierInvoiceOutstanding(asOnDate).filter((r) => r.outstanding > 0.009);
    if (vendorId !== "all") rows = rows.filter((r) => String(r.vendorId) === vendorId);
    if (dueStatus === "overdue") rows = rows.filter((r) => r.overdueDays > 0);
    if (dueStatus === "not_due") rows = rows.filter((r) => r.overdueDays <= 0);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.vendorName.toLowerCase().includes(q) ||
          r.vendorCode.toLowerCase().includes(q) ||
          r.invoiceNo.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [asOnDate, vendorId, dueStatus, search, refreshKey, sectionRefresh]);

  const ageingRows = useMemo(() => {
    void refreshKey;
    let rows = computeVendorAgeingRows(asOnDate, {}, appliedBreakpoints);
    if (vendorId !== "all") rows = rows.filter((r) => String(r.vendorId) === vendorId);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.vendorName.toLowerCase().includes(q) || r.vendorCode.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [asOnDate, vendorId, search, appliedBreakpoints, refreshKey, sectionRefresh]);

  const bucketLabels = useMemo(
    () => getAgeingBucketLabels(appliedBreakpoints),
    [appliedBreakpoints],
  );
  /** Always show every standard bucket column (incl. zeros). */
  const ageingBucketIndices = useMemo(
    () => appliedBreakpoints.map((_, index) => index),
    [appliedBreakpoints],
  );

  const ageingColumns: AccountsRichColumnDef<VendorAgeingRow>[] = useMemo(() => {
    const bucketCount = ageingBucketIndices.length;
    const bucketColumns: AccountsRichColumnDef<VendorAgeingRow>[] = ageingBucketIndices.map(
      (index) => ({
        key: ageingBucketColumnKey(index),
        label: bucketLabels[index] ?? "",
        align: "right" as const,
        filterType: "amount" as const,
        className: "min-w-[120px]",
        render: (r: VendorAgeingRow) => {
          const amount = r.buckets[index] ?? 0;
          const isOldest = index === bucketCount - 1;
          const isLate = index === bucketCount - 2;
          return (
            <AmountCell
              amount={amount}
              className={cn(
                amount > 0 && isOldest && "font-semibold text-red-600",
                amount > 0 && isLate && "font-semibold text-brand-700",
              )}
            />
          );
        },
      }),
    );
    return [
      {
        key: "vendorName",
        label: "Vendor Name",
        filterType: "text",
        className: "min-w-[200px]",
        render: (r) => (
          <Link
            href={`/accounts/payables/outstanding/${r.vendorId}`}
            className="text-sm font-semibold text-brand-700 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {r.vendorName}
          </Link>
        ),
      },
      {
        key: "totalOutstanding",
        label: "Total Outstanding",
        align: "right",
        filterType: "amount",
        className: "min-w-[140px]",
        render: (r) => <AmountCell amount={r.totalOutstanding} className="font-semibold text-sm" />,
      },
      ...bucketColumns,
    ];
  }, [bucketLabels, ageingBucketIndices]);

  const hasFilters = search.trim() !== "" || vendorId !== "all" || dueStatus !== "all";

  const clearFilters = () => {
    setSearch("");
    setVendorId("all");
    setDueStatus("all");
  };

  const exportMeta = useMemo(
    () => ({
      reportName:
        view === "summary"
          ? "Vendor Outstanding"
          : view === "bills"
            ? "Purchase Bill Outstanding"
            : "Supplier Ageing",
      financialYear: "All",
      asOnDate,
      supplier:
        vendorId === "all"
          ? "All suppliers"
          : (vendors.find((v) => String(v.id) === vendorId)?.vendorName ?? "—"),
      paymentStatus:
        dueStatus === "all" ? "All" : dueStatus === "overdue" ? "Overdue" : "Not Due",
      search,
      ageingBuckets: ageingBucketIndices.map((i) => bucketLabels[i] ?? "").join(" · "),
    }),
    [view, asOnDate, vendorId, vendors, dueStatus, search, ageingBucketIndices, bucketLabels],
  );

  const handleExcel = async () => {
    if (view === "bills") {
      await exportSupplierOutstandingToExcel(billRows, exportMeta);
      return;
    }
    if (view === "ageing") {
      await exportSupplierAgeingToExcel(
        ageingRows,
        exportMeta,
        bucketLabels,
        ageingBucketIndices,
      );
      return;
    }
    const columns = [
      { label: "Vendor" },
      { label: "Code" },
      { label: "Outstanding (₹)", align: "right" as const, className: "num" },
      { label: "Overdue (₹)", align: "right" as const, className: "num" },
      { label: "Not Due (₹)", align: "right" as const, className: "num" },
      { label: "Oldest Due" },
      { label: "Last Payment" },
      { label: "Status" },
    ];
    const bodyHtml = summaryRows
      .map(
        (r) => `<tr>
      <td>${escapeHtml(r.vendorName)}</td>
      <td class="mono">${escapeHtml(r.vendorCode)}</td>
      <td class="num">${formatMoneyNumber(r.outstanding)}</td>
      <td class="num">${formatMoneyNumber(r.overdueAmount)}</td>
      <td class="num">${formatMoneyNumber(r.notDueAmount)}</td>
      <td>${escapeHtml(r.oldestDueDate)}</td>
      <td>${escapeHtml(r.lastPaymentDate)}</td>
      <td>${escapeHtml(statusLabel(r.status))}</td>
    </tr>`,
      )
      .join("");
    const html = buildReportExcelDocumentHtml({
      title: exportMeta.reportName,
      header: {
        reportTitle: exportMeta.reportName,
        asOnDate: exportMeta.asOnDate,
        filters: [
          { label: "Supplier", value: exportMeta.supplier },
          { label: "Due Status", value: exportMeta.paymentStatus },
        ],
      },
      bodyHtml: buildStandardReportTableHtml({ columns, bodyHtml }),
      landscape: true,
    });
    downloadReportExcelHtml(html, `Vendor_Outstanding_${todayExportDateSuffix()}.xls`);
  };

  const handlePdf = () => {
    if (view === "bills") {
      exportSupplierOutstandingToPdf(billRows, exportMeta);
      return;
    }
    if (view === "ageing") {
      exportSupplierAgeingToPdf(ageingRows, exportMeta, bucketLabels, ageingBucketIndices);
      return;
    }
    exportTabularReportToPdf({
      title: exportMeta.reportName,
      header: {
        reportTitle: exportMeta.reportName,
        asOnDate: exportMeta.asOnDate,
        filters: [
          { label: "Supplier", value: exportMeta.supplier },
          { label: "Due Status", value: exportMeta.paymentStatus },
        ],
      },
      columns: [
        { label: "Vendor" },
        { label: "Code" },
        { label: "Outstanding", align: "right" },
        { label: "Overdue", align: "right" },
        { label: "Not Due", align: "right" },
        { label: "Oldest Due" },
        { label: "Last Payment" },
        { label: "Status" },
      ],
      bodyHtml: summaryRows
        .map(
          (r) => `<tr>
      <td>${escapeHtml(r.vendorName)}</td>
      <td>${escapeHtml(r.vendorCode)}</td>
      <td class="num">${formatMoneyNumber(r.outstanding)}</td>
      <td class="num">${formatMoneyNumber(r.overdueAmount)}</td>
      <td class="num">${formatMoneyNumber(r.notDueAmount)}</td>
      <td>${escapeHtml(formatReportDate(r.oldestDueDate))}</td>
      <td>${escapeHtml(formatReportDate(r.lastPaymentDate))}</td>
      <td>${escapeHtml(statusLabel(r.status))}</td>
    </tr>`,
        )
        .join(""),
      landscape: true,
    });
  };

  const getSummaryCell = useCallback((row: VendorOutstandingRow, key: string) => {
    if (key === "status") return row.status;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const getBillCell = useCallback((row: SupplierInvoiceOutstandingRow, key: string) => {
    if (key === "overdueDays") return row.outstanding > 0 ? row.overdueDays : 0;
    if (key === "status") return row.status;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const getAgeingCell = useCallback((row: VendorAgeingRow, key: string) => {
    const bucketMatch = /^bucket_(\d+)$/.exec(key);
    if (bucketMatch) return row.buckets[Number(bucketMatch[1])] ?? 0;
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const providerRows =
    view === "summary" ? summaryRows : view === "bills" ? billRows : ageingRows;

  const columnConfig: Record<string, { type: "text" | "amount" | "date" | "number" | "status" }> =
    view === "summary"
      ? {
          vendorName: { type: "text" },
          vendorCode: { type: "text" },
          outstanding: { type: "amount" },
          overdueAmount: { type: "amount" },
          notDueAmount: { type: "amount" },
          oldestDueDate: { type: "date" },
          lastPaymentDate: { type: "date" },
          status: { type: "status" },
        }
      : view === "bills"
        ? {
            vendorName: { type: "text" },
            invoiceNo: { type: "text" },
            invoiceDate: { type: "date" },
            dueDate: { type: "date" },
            billAmount: { type: "amount" },
            paidAmount: { type: "amount" },
            debitNoteAdjusted: { type: "amount" },
            outstanding: { type: "amount" },
            overdueDays: { type: "number" },
            status: { type: "status" },
          }
        : {
            vendorName: { type: "text" },
            totalOutstanding: { type: "amount" },
            ...Object.fromEntries(
              ageingBucketIndices.map((i) => [
                ageingBucketColumnKey(i),
                { type: "amount" as const },
              ]),
            ),
          };

  const getCellValue =
    view === "summary" ? getSummaryCell : view === "bills" ? getBillCell : getAgeingCell;

  const defaultSortKey =
    view === "summary" ? "outstanding" : view === "bills" ? "invoiceDate" : "totalOutstanding";

  return (
    <AccountsColumnFilterProvider
      rows={providerRows as never[]}
      getCellValue={getCellValue as never}
      columnConfig={columnConfig}
      defaultSortKey={defaultSortKey}
      defaultSortDir="desc"
    >
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Payables", "Outstanding")}
        title="Outstanding"
        description="Vendor payables — outstanding balances from posted purchase invoices."
        hideDescription
        actions={
          pendingAllocations > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-medium gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
              onClick={() => router.push("/accounts/payables/payment-allocation")}
            >
              Pending Payment Allocations: {pendingAllocations}
            </Button>
          ) : undefined
        }
        filters={
          <ReportFilterRow
            end={
              <AccountsExportMenu
                onExcel={() => void handleExcel()}
                onPdf={handlePdf}
                disabled={providerRows.length === 0}
              />
            }
          >
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder={view === "bills" ? "Search bill, vendor…" : "Search vendor…"}
            />
            <ReportVendorFilter value={vendorId} onChange={setVendorId} vendors={vendors} />
            {view !== "ageing" && (
              <Select
                value={dueStatus}
                onValueChange={(v) => setDueStatus(v as DueStatusFilter)}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue placeholder="Due status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="not_due">Not Due</SelectItem>
                </SelectContent>
              </Select>
            )}
            <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
            <ReportFilterResetButton
              showOnlyWhenActive
              active={hasFilters}
              onClick={clearFilters}
            />
          </ReportFilterRow>
        }
        layout="split"
        className="h-full min-h-0"
      >
        <AccountsListingTableCard className="flex flex-col flex-1 min-h-0">
          <AccountsListingTabsRow className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-border/70">
            <SectionTabs
              tabs={VIEW_TABS}
              active={view}
              onChange={(id) => setWorkspaceView(id as WorkspaceView)}
            />
            {view === "ageing" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
                    <Settings2 className="w-3.5 h-3.5" /> Ageing buckets
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[340px] p-3">
                  <AgeingBreakpointPanel
                    draft={breakpointDraft}
                    onDraftChange={setBreakpointDraft}
                    onApply={setAppliedBreakpoints}
                    error={breakpointError}
                    onErrorChange={setBreakpointError}
                  />
                </PopoverContent>
              </Popover>
            )}
          </AccountsListingTabsRow>
          {view === "summary" && (
            <SummaryTable
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
          {view === "bills" && (
            <BillTable
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
          {view === "ageing" && (
            <AgeingTable
              columns={ageingColumns}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </AccountsListingTableCard>
      </AccountsPageShell>
    </AccountsColumnFilterProvider>
  );
}

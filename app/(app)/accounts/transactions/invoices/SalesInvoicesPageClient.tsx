"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useClientMounted } from "@/lib/use-client-mounted";
import { Ban, Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableEmpty,
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportBranchMultiFilter,
  ReportDateRangeFilter,
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportFromDateFilter,
  ReportMoreFilters,
  ReportSearchFilter,
  ReportToDateFilter,
  useReportDateRange,
} from "@/components/accounts/ReportFilters";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { formatMoney } from "@/lib/accounts/money-format";
import {
  AccountsEditAction,
  AccountsTableActionCell,
  AccountsViewAction,
  ACCOUNTS_ACTION_BTN_CLASS,
  ACCOUNTS_ACTION_ICON_CLASS,
} from "@/components/accounts/AccountsTableActions";
import { cn } from "@/lib/utils";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { resolveDateRangePreset } from "@/lib/accounts/report-date-presets";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { accountsDataService } from "@/lib/accounts/accounts-data-service";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import type { AccountsColumnFilterConfig } from "@/lib/accounts/column-filter-types";
import {
  cancelInvoice,
  getInvoiceById,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { downloadInvoicePdf } from "@/app/(app)/accounts/invoices/invoice-pdf";
import { InvoiceCancelDialog } from "@/app/(app)/accounts/invoices/components/InvoiceCancelDialog";
import { InvoiceStatusBadge } from "@/app/(app)/accounts/invoices/components/InvoiceStatusBadge";
import { CustomerPartyNameCell } from "@/app/(app)/accounts/invoices/components/CustomerPartyInfo";
import { SalesInvoicesTabs } from "./SalesInvoicesTabs";
import {
  SalesInvoiceEInvoiceStatusCell,
  SalesInvoiceEWayStatusCell,
} from "./SalesInvoiceStatutoryStatusCell";
import {
  LISTING_EINVOICE_STATUS_OPTIONS,
  LISTING_EWAY_STATUS_OPTIONS,
} from "./sales-invoice-statutory";
import {
  getSalesInvoiceBranchOptions,
  listSalesInvoicesByTab,
  SALES_INVOICE_TAB_META,
  SALES_INVOICE_VISIBLE_TABS,
  type SalesInvoiceListRow,
  type SalesInvoiceTabId,
} from "./sales-invoice-tab-data";
import "./sales-invoices-compact.css";

type TabCache = {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  rows: SalesInvoiceListRow[];
  search: string;
  page: number;
  pageSize: number;
};

function createEmptyTabCache(): TabCache {
  return {
    loaded: false,
    loading: false,
    error: null,
    rows: [],
    search: "",
    page: 1,
    pageSize: 25,
  };
}

function applyToolbarFilters(
  rows: SalesInvoiceListRow[],
  opts: { search: string; dateFrom: string; dateTo: string; branches: string[] },
): SalesInvoiceListRow[] {
  let list = [...rows];
  if (opts.search.trim()) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.invoiceNo.toLowerCase().includes(q) ||
        r.orderNo.toLowerCase().includes(q) ||
        r.dispatchNo.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerCode.toLowerCase().includes(q) ||
        r.partyOrTransfer.toLowerCase().includes(q) ||
        r.invoiceTypeLabel.toLowerCase().includes(q) ||
        r.referencePrimary.toLowerCase().includes(q) ||
        r.fromWarehouse.toLowerCase().includes(q) ||
        r.toWarehouse.toLowerCase().includes(q),
    );
  }
  if (opts.dateFrom || opts.dateTo) {
    list = list.filter((r) => {
      const dateKey = (r.invoiceDate || "").trim();
      if (!dateKey) return true;
      if (opts.dateFrom && dateKey < opts.dateFrom) return false;
      if (opts.dateTo && dateKey > opts.dateTo) return false;
      return true;
    });
  }
  if (opts.branches.length) list = list.filter((r) => opts.branches.includes(r.branch));
  return list;
}

function exportSalesInvoiceTabCsv(tab: SalesInvoiceTabId, rows: SalesInvoiceListRow[]) {
  const meta = SALES_INVOICE_TAB_META[tab];
  let headers: string[];
  let toRow: (r: SalesInvoiceListRow) => (string | number)[];

  if (tab === "all") {
    headers = [
      "Invoice Date",
      "Invoice No.",
      "Invoice Type",
      "Reference No.",
      "Party / Transfer",
      "Qty / Item Count",
      "Total Amount",
      "Status",
      "E-Invoice Status",
      "E-Way Bill Status",
    ];
    toRow = (r) => [
      r.invoiceDate || "—",
      r.invoiceNo,
      r.invoiceTypeLabel,
      [r.referencePrimary, r.referenceSecondary].filter(Boolean).join(" / "),
      r.partyOrTransfer,
      r.qtyOrItemCount,
      formatMoney(r.sourceType === "sample_order" ? 0 : r.totalAmount),
      r.invoiceStatus,
      r.eInvoiceStatusLabel,
      r.ewayBillStatusLabel,
    ];
  } else if (tab === "stock_transfer") {
    headers = [
      "Invoice Date",
      "Invoice No.",
      "Stock Transfer No.",
      "Dispatch No.",
      "From Warehouse",
      "To Warehouse",
      "Total Amount",
      "Qty",
      "Status",
      "E-Invoice Status",
      "E-Way Bill Status",
    ];
    toRow = (r) => [
      r.invoiceDate || "—",
      r.invoiceNo,
      r.orderNo,
      r.dispatchNo,
      r.fromWarehouse || "—",
      r.toWarehouse || "—",
      formatMoney(r.totalAmount),
      r.qtyOrItemCount,
      r.invoiceStatus,
      r.eInvoiceStatusLabel,
      r.ewayBillStatusLabel,
    ];
  } else {
    headers = [
      "Invoice Date",
      "Invoice No.",
      tab === "sample_order" ? "Sample Order No." : "Sales Order No.",
      "Dispatch No.",
      "Customer",
      "Total Amount",
      "Qty",
      "Status",
      "E-Invoice Status",
      "E-Way Bill Status",
    ];
    toRow = (r) => [
      r.invoiceDate || "—",
      r.invoiceNo,
      r.orderNo,
      r.dispatchNo,
      r.customerName,
      formatMoney(tab === "sample_order" ? 0 : r.totalAmount),
      r.qtyOrItemCount,
      r.invoiceStatus,
      r.eInvoiceStatusLabel,
      r.ewayBillStatusLabel,
    ];
  }

  const lines = rows.map((r) =>
    toRow(r)
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = meta.exportFileName;
  a.click();
  URL.revokeObjectURL(url);
}

function StatutoryStatusHeaders() {
  return (
    <>
      <SortTh
        label="E-Invoice / IRN"
        colKey="eInvoiceStatusLabel"
        filterType="status"
      />
      <SortTh
        label="E-Way Bill"
        colKey="ewayBillStatusLabel"
        filterType="status"
      />
    </>
  );
}

function StatutoryStatusCells({ row }: { row: SalesInvoiceListRow }) {
  return (
    <>
      <AccountsTableCell>
        <SalesInvoiceEInvoiceStatusCell details={row.eInvoiceDetails} />
      </AccountsTableCell>
      <AccountsTableCell>
        <SalesInvoiceEWayStatusCell details={row.ewayBillDetails} />
      </AccountsTableCell>
    </>
  );
}

function SalesInvoicesListing({
  tab,
  mounted,
  toolbarRows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  loading,
  error,
  clearFilters,
  hasToolbarFilters,
  onCancel,
  onPrint,
}: {
  tab: SalesInvoiceTabId;
  mounted: boolean;
  toolbarRows: SalesInvoiceListRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  loading: boolean;
  error: string | null;
  clearFilters?: () => void;
  hasToolbarFilters: boolean;
  onCancel: (row: SalesInvoiceListRow) => void;
  onPrint: (row: SalesInvoiceListRow) => void;
}) {
  const visible = useAccountsFilteredRows(toolbarRows);
  return (
    <AccountsTableListing
      footer={
        mounted && !loading && visible.length > 0 ? (
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={visible.length}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            recordLabel="invoices"
          />
        ) : null
      }
    >
      <SalesInvoicesTable
        tab={tab}
        mounted={mounted}
        toolbarRows={toolbarRows}
        page={page}
        pageSize={pageSize}
        onPageChange={onPageChange}
        loading={loading}
        error={error}
        clearFilters={clearFilters}
        hasToolbarFilters={hasToolbarFilters}
        onCancel={onCancel}
        onPrint={onPrint}
      />
    </AccountsTableListing>
  );
}

function RowActions({
  row,
  onCancel,
  onPrint,
}: {
  row: SalesInvoiceListRow;
  onCancel: (row: SalesInvoiceListRow) => void;
  onPrint: (row: SalesInvoiceListRow) => void;
}) {
  return (
    <AccountsTableActionCell variant="multi">
      <AccountsViewAction href={row.viewHref} title="View Invoice" />
      {row.canPdf ? (
        <button
          type="button"
          title="Print / Download Invoice"
          aria-label="Print / Download Invoice"
          className={cn(ACCOUNTS_ACTION_BTN_CLASS)}
          onClick={() => onPrint(row)}
        >
          <Download className={ACCOUNTS_ACTION_ICON_CLASS} />
        </button>
      ) : null}
      {row.canEdit && row.editHref ? (
        <AccountsEditAction href={row.editHref} title="Edit Invoice" />
      ) : null}
      {row.canCancel ? (
        <button
          type="button"
          title="Cancel Invoice"
          aria-label="Cancel Invoice"
          className={cn(ACCOUNTS_ACTION_BTN_CLASS, "hover:bg-red-50")}
          onClick={() => onCancel(row)}
        >
          <Ban className={cn(ACCOUNTS_ACTION_ICON_CLASS, "text-red-500")} />
        </button>
      ) : null}
    </AccountsTableActionCell>
  );
}

function ReferenceCell({ row }: { row: SalesInvoiceListRow }) {
  if (row.sourceType === "service") {
    return <span className="text-xs text-foreground">{row.referencePrimary}</span>;
  }
  return (
    <div className="min-w-0 leading-tight">
      <p className="text-xs font-mono font-semibold text-brand-700 truncate">{row.referencePrimary}</p>
      {row.referenceSecondary ? (
        <p className="text-[11px] font-mono text-muted-foreground mt-0.5 truncate">
          {row.referenceSecondary}
        </p>
      ) : null}
    </div>
  );
}

function PartyCell({ row }: { row: SalesInvoiceListRow }) {
  if (row.sourceType === "stock_transfer") {
    return (
      <div className="min-w-0 leading-tight">
        <p className="text-xs font-semibold text-foreground truncate">{row.fromWarehouse || "—"}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
          → {row.toWarehouse || "—"}
        </p>
      </div>
    );
  }
  return (
    <CustomerPartyNameCell
      customerName={row.customerName}
      customerCode={row.customerCode}
      branch={row.branch}
    />
  );
}

function SalesInvoicesTable({
  tab,
  mounted,
  toolbarRows,
  page,
  pageSize,
  onPageChange,
  loading,
  error,
  clearFilters,
  hasToolbarFilters,
  onCancel,
  onPrint,
}: {
  tab: SalesInvoiceTabId;
  mounted: boolean;
  toolbarRows: SalesInvoiceListRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  loading: boolean;
  error: string | null;
  clearFilters?: () => void;
  hasToolbarFilters: boolean;
  onCancel: (row: SalesInvoiceListRow) => void;
  onPrint: (row: SalesInvoiceListRow) => void;
}) {
  const meta = SALES_INVOICE_TAB_META[tab];
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(toolbarRows);
  const pagedRows = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const isAll = tab === "all";
  const isStockTransfer = tab === "stock_transfer";
  const isSampleOrder = tab === "sample_order";
  const colSpan = isAll ? 11 : isStockTransfer ? 11 : 10;


  const emptyStates =
    !mounted || loading ? (
      <AccountsTableEmpty colSpan={colSpan} message="Loading invoices…" />
    ) : error ? (
      <AccountsTableEmpty colSpan={colSpan} message={error} />
    ) : toolbarRows.length === 0 ? (
      <AccountsTableEmpty
        colSpan={colSpan}
        message={meta.emptyMessage}
        onClear={hasToolbarFilters ? clearFilters : undefined}
      />
    ) : visible.length === 0 ? (
      <AccountsTableEmpty colSpan={colSpan} message="No records match the column filters." />
    ) : null;

  if (isAll) {
    return (
      <AccountsTable minWidth={1380}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" />
            <SortTh label="Invoice No." colKey="invoiceNo" />
            <SortTh label="Invoice Type" colKey="invoiceTypeLabel" filterType="select" />
            <SortTh label="Reference No." colKey="referencePrimary" />
            <SortTh label="Party / Transfer" colKey="partyOrTransfer" className="accounts-col-party" />
            <SortTh label="Qty / Item Count" colKey="qtyOrItemCount" filterType="amount" align="right" />
            <SortTh label="Total Amount" colKey="totalAmount" filterType="amount" align="right" />
            <SortTh label="Status" colKey="invoiceStatus" filterType="status" />
            <StatutoryStatusHeaders />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className="accounts-col-actions-wide"
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {emptyStates ??
            pagedRows.map((r) => (
              <AccountsTableRow key={r.id}>
                <AccountsTableCell className="tabular-nums">{r.invoiceDate || "—"}</AccountsTableCell>
                <AccountsTableCell mono className="font-semibold text-brand-700">
                  <Link href={r.viewHref} className="hover:underline">
                    {r.invoiceNo}
                  </Link>
                </AccountsTableCell>
                <AccountsTableCell>
                  <span className="text-xs font-medium text-foreground">{r.invoiceTypeLabel}</span>
                </AccountsTableCell>
                <AccountsTableCell>
                  <ReferenceCell row={r} />
                </AccountsTableCell>
                <AccountsTableCell className="accounts-col-party">
                  <PartyCell row={r} />
                </AccountsTableCell>
                <AccountsTableCell align="right" className="tabular-nums">
                  {r.qtyOrItemCount}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="font-semibold">
                  <MoneyAmount amount={r.sourceType === "sample_order" ? 0 : r.totalAmount} />
                </AccountsTableCell>
                <AccountsTableCell>
                  <InvoiceStatusBadge status={r.invoiceStatus} />
                </AccountsTableCell>
                <StatutoryStatusCells row={r} />
                <AccountsTableCell align="right">
                  <RowActions row={r} onCancel={onCancel} onPrint={onPrint} />
                </AccountsTableCell>
              </AccountsTableRow>
            ))}
        </AccountsTableBody>
      </AccountsTable>
    );
  }

  if (isStockTransfer) {
    return (
      <AccountsTable minWidth={1380}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" />
            <SortTh label="Invoice No." colKey="invoiceNo" />
            <SortTh label="Stock Transfer No." colKey="orderNo" />
            <SortTh label="Dispatch No." colKey="dispatchNo" />
            <SortTh label="From Warehouse" colKey="fromWarehouse" />
            <SortTh label="To Warehouse" colKey="toWarehouse" />
            <SortTh label="Total Amount" colKey="totalAmount" filterType="amount" align="right" />
            <SortTh label="Qty" colKey="qtyOrItemCount" filterType="amount" align="right" />
            <StatutoryStatusHeaders />
            <AccountsColumnHeader
              label="Actions"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className="accounts-col-actions-wide"
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {emptyStates ??
            pagedRows.map((r) => (
              <AccountsTableRow key={r.id}>
                <AccountsTableCell className="tabular-nums">{r.invoiceDate || "—"}</AccountsTableCell>
                <AccountsTableCell mono className="font-semibold text-brand-700">
                  <Link href={r.viewHref} className="hover:underline">
                    {r.invoiceNo}
                  </Link>
                </AccountsTableCell>
                <AccountsTableCell mono>{r.orderNo}</AccountsTableCell>
                <AccountsTableCell mono>{r.dispatchNo}</AccountsTableCell>
                <AccountsTableCell>{r.fromWarehouse || "—"}</AccountsTableCell>
                <AccountsTableCell>{r.toWarehouse || "—"}</AccountsTableCell>
                <AccountsTableCell align="right" money className="font-semibold">
                  <MoneyAmount amount={r.totalAmount} />
                </AccountsTableCell>
                <AccountsTableCell align="right" className="tabular-nums">
                  {r.qtyOrItemCount}
                </AccountsTableCell>
                <StatutoryStatusCells row={r} />
                <AccountsTableCell align="right">
                  <RowActions row={r} onCancel={onCancel} onPrint={onPrint} />
                </AccountsTableCell>
              </AccountsTableRow>
            ))}
        </AccountsTableBody>
      </AccountsTable>
    );
  }

  return (
    <AccountsTable minWidth={1320}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" />
          <SortTh label="Invoice No." colKey="invoiceNo" />
          <SortTh
            label={isSampleOrder ? "Sample Order No." : "Sales Order No."}
            colKey="orderNo"
          />
          <SortTh label="Dispatch No." colKey="dispatchNo" />
          <SortTh label="Customer" colKey="customerName" className="accounts-col-party" />
          <SortTh label="Total Amount" colKey="totalAmount" filterType="amount" align="right" />
          <SortTh label="Qty" colKey="qtyOrItemCount" filterType="amount" align="right" />
          <StatutoryStatusHeaders />
          <AccountsColumnHeader
            label="Actions"
            colKey="_actions"
            sortable={false}
            filterable={false}
            align="right"
            className="accounts-col-actions-wide"
          />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {emptyStates ??
          pagedRows.map((r) => (
            <AccountsTableRow key={r.id}>
              <AccountsTableCell className="tabular-nums">{r.invoiceDate || "—"}</AccountsTableCell>
              <AccountsTableCell mono className="font-semibold text-brand-700">
                <Link href={r.viewHref} className="hover:underline">
                  {r.invoiceNo}
                </Link>
              </AccountsTableCell>
              <AccountsTableCell mono>{r.orderNo}</AccountsTableCell>
              <AccountsTableCell mono>{r.dispatchNo}</AccountsTableCell>
              <AccountsTableCell className="accounts-col-party">
                <CustomerPartyNameCell
                  customerName={r.customerName}
                  customerCode={r.customerCode}
                  branch={r.branch}
                />
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="font-semibold">
                <MoneyAmount amount={isSampleOrder ? 0 : r.totalAmount} />
              </AccountsTableCell>
              <AccountsTableCell align="right" className="tabular-nums">
                {r.qtyOrItemCount}
              </AccountsTableCell>
              <StatutoryStatusCells row={r} />
              <AccountsTableCell align="right">
                <RowActions row={r} onCancel={onCancel} onPrint={onPrint} />
              </AccountsTableCell>
            </AccountsTableRow>
          ))}
      </AccountsTableBody>
    </AccountsTable>
  );
}

export default function SalesInvoicesPageClient() {
  const mounted = useClientMounted();
  const [activeTab, setActiveTab] = useState<SalesInvoiceTabId>("all");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_month");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branches, setBranches] = useState<string[]>([]);
  const [cancelTarget, setCancelTarget] = useState<SalesInvoiceListRow | null>(null);

  const [tabState, setTabState] = useState<Record<SalesInvoiceTabId, TabCache>>({
    all: createEmptyTabCache(),
    sales_order: createEmptyTabCache(),
    stock_transfer: createEmptyTabCache(),
    sample_order: createEmptyTabCache(),
    service: createEmptyTabCache(),
  });

  const filterKey = `${financialYearId}|${dateFrom}|${dateTo}|${branches.join(",")}`;
  const prevFilterKey = useRef(filterKey);

  const fetchTab = useCallback((tab: SalesInvoiceTabId) => {
    setTabState((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], loading: true, error: null },
    }));
    try {
      accountsDataService.invalidate();
      const rows = listSalesInvoicesByTab(tab);
      setTabState((prev) => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          loaded: true,
          loading: false,
          error: null,
          rows,
        },
      }));
    } catch (e) {
      setTabState((prev) => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          loaded: true,
          loading: false,
          error: e instanceof Error ? e.message : "Failed to load invoices.",
          rows: [],
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchTab("all");
  }, [mounted, fetchTab]);

  useEffect(() => {
    if (!mounted) return;
    const refresh = () => fetchTab(activeTab);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mounted, activeTab, fetchTab]);

  useEffect(() => {
    if (!mounted) return;
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    setTabState((prev) => {
      const next = { ...prev };
      (Object.keys(next) as SalesInvoiceTabId[]).forEach((tab) => {
        next[tab] = {
          ...next[tab],
          loaded: false,
          rows: [],
          page: 1,
        };
      });
      return next;
    });
    fetchTab(activeTab);
  }, [filterKey, mounted, activeTab, fetchTab]);

  const handleTabChange = (tab: SalesInvoiceTabId) => {
    setActiveTab(tab);
    if (!tabState[tab].loaded && !tabState[tab].loading) {
      fetchTab(tab);
    }
  };

  const active = tabState[activeTab];

  const branchOptions = useMemo(() => {
    if (!mounted) return [];
    const set = new Set<string>();
    SALES_INVOICE_VISIBLE_TABS.forEach((tab) => {
      if (tabState[tab].loaded) {
        for (const r of tabState[tab].rows) if (r.branch && r.branch !== "—") set.add(r.branch);
      }
    });
    if (set.size === 0) return getSalesInvoiceBranchOptions(activeTab);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [mounted, tabState, activeTab]);

  const handleFinancialYearChange = useCallback(
    (fyId: string) => {
      setFinancialYearId(fyId);
      if (fyId !== "all") {
        const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
        if (fy) {
          const today = new Date().toISOString().slice(0, 10);
          setDateFrom(fy.startDate);
          setDateTo(today < fy.endDate ? today : fy.endDate);
          setPreset("custom");
        }
      }
    },
    [setDateFrom, setDateTo, setPreset],
  );

  const clearFilters = useCallback(() => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], search: "", page: 1 },
    }));
    setFinancialYearId("all");
    setBranches([]);
    setPreset("this_month");
    const { from, to } = resolveDateRangePreset("this_month");
    setDateFrom(from);
    setDateTo(to);
  }, [activeTab, setDateFrom, setDateTo, setPreset]);

  const hasToolbarFilters =
    Boolean(active.search.trim()) ||
    preset !== "this_month" ||
    financialYearId !== "all" ||
    branches.length > 0;

  const toolbarRows = useMemo(
    () =>
      applyToolbarFilters(active.rows, {
        search: active.search,
        dateFrom,
        dateTo,
        branches,
      }),
    [active.rows, active.search, dateFrom, dateTo, branches],
  );

  const tabCounts = useMemo(() => {
    const counts: Partial<Record<SalesInvoiceTabId, number | null>> = {};
    if (!mounted) return counts;
    SALES_INVOICE_VISIBLE_TABS.forEach((tab) => {
      const cache = tabState[tab];
      if (!cache.loaded) {
        try {
          counts[tab] = applyToolbarFilters(listSalesInvoicesByTab(tab), {
            search: cache.search,
            dateFrom,
            dateTo,
            branches,
          }).length;
        } catch {
          counts[tab] = null;
        }
        return;
      }
      counts[tab] = applyToolbarFilters(cache.rows, {
        search: cache.search,
        dateFrom,
        dateTo,
        branches,
      }).length;
    });
    return counts;
  }, [mounted, tabState, dateFrom, dateTo, branches]);

  const setActiveSearch = (search: string) => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], search, page: 1 },
    }));
  };

  const setActivePage = useCallback(
    (page: number) => {
      setTabState((prev) => ({
        ...prev,
        [activeTab]: { ...prev[activeTab], page },
      }));
    },
    [activeTab],
  );

  const setActivePageSize = (pageSize: number) => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], pageSize, page: 1 },
    }));
  };

  useEffect(() => {
    setActivePage(1);
  }, [active.search, dateFrom, dateTo, financialYearId, branches, active.pageSize, setActivePage]);

  const handlePresetChange = (value: ReturnType<typeof useReportDateRange>["preset"]) => {
    setPreset(value);
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      setDateFrom(from);
      setDateTo(to);
    }
  };

  const handlePrint = useCallback((row: SalesInvoiceListRow) => {
    const rec = getInvoiceById(row.invoiceId);
    if (rec) downloadInvoicePdf(rec);
  }, []);

  const handleCancelConfirm = useCallback(
    (reason: string) => {
      if (!cancelTarget) return;
      cancelInvoice(cancelTarget.invoiceId, reason);
      setCancelTarget(null);
      SALES_INVOICE_VISIBLE_TABS.forEach((tab) => fetchTab(tab));
    },
    [cancelTarget, fetchTab],
  );

  const getCellValue = useCallback((row: SalesInvoiceListRow, key: string) => {
    if (key === "totalAmount") {
      return formatMoney(row.sourceType === "sample_order" ? 0 : row.totalAmount);
    }
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const statutoryFilterCols = {
    eInvoiceStatusLabel: {
      type: "status" as const,
      options: [...LISTING_EINVOICE_STATUS_OPTIONS],
    },
    ewayBillStatusLabel: {
      type: "status" as const,
      options: [...LISTING_EWAY_STATUS_OPTIONS],
    },
  };

  const columnConfig: AccountsColumnFilterConfig =
    activeTab === "all"
      ? {
          invoiceDate: { type: "date" },
          invoiceNo: { type: "text" },
          invoiceTypeLabel: {
            type: "select",
            options: ["Sales Order", "Stock Transfer", "Sample Order", "Service"],
          },
          referencePrimary: { type: "text" },
          partyOrTransfer: { type: "text" },
          qtyOrItemCount: { type: "amount" },
          totalAmount: { type: "amount" },
          invoiceStatus: {
            type: "status",
            options: ["draft", "sent", "cancelled"],
            optionLabels: { draft: "Draft", sent: "Sent", cancelled: "Cancelled" },
          },
          ...statutoryFilterCols,
        }
      : activeTab === "stock_transfer"
        ? {
            invoiceDate: { type: "date" },
            invoiceNo: { type: "text" },
            orderNo: { type: "text" },
            dispatchNo: { type: "text" },
            fromWarehouse: { type: "text" },
            toWarehouse: { type: "text" },
            totalAmount: { type: "amount" },
            qtyOrItemCount: { type: "amount" },
            ...statutoryFilterCols,
          }
        : {
            invoiceDate: { type: "date" },
            invoiceNo: { type: "text" },
            orderNo: { type: "text" },
            dispatchNo: { type: "text" },
            customerName: { type: "text" },
            totalAmount: { type: "amount" },
            qtyOrItemCount: { type: "amount" },
            ...statutoryFilterCols,
          };

  return (
    <div className="sales-invoices-compact h-full min-h-0">
      <AccountsColumnFilterProvider
        key={activeTab}
        rows={toolbarRows}
        getCellValue={getCellValue}
        columnConfig={columnConfig}
        defaultSortKey="invoiceDate"
        defaultSortDir="desc"
      >
        <AccountsPageShell
          breadcrumbs={accountsBreadcrumb("Transactions", "Sales Invoice")}
          title="Sales Invoices"
          description="Generated tax invoices by source — sales order, stock transfer, sample order, and service."
          hideDescription
          layout="split"
          className="h-full min-h-0"
          subHeader={
            <SalesInvoicesTabs
              value={activeTab}
              onChange={handleTabChange}
              counts={tabCounts}
            />
          }
          filters={
            <ReportFilterRow
              end={
                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    size="sm"
                    className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
                  >
                    <Link href="/accounts/transactions/invoices/new-service">
                      <Plus className="w-3.5 h-3.5" />
                      Create Service Invoice
                    </Link>
                  </Button>
                  <AccountsExportMenu
                    onExcel={() => exportSalesInvoiceTabCsv(activeTab, toolbarRows)}
                    onPdf={() => exportSalesInvoiceTabCsv(activeTab, toolbarRows)}
                    disabled={toolbarRows.length === 0}
                  />
                </div>
              }
            >
              <ReportFinancialYearFilter
                value={financialYearId}
                onChange={handleFinancialYearChange}
              />
              <ReportDateRangeFilter
                preset={preset}
                dateFrom={dateFrom}
                dateTo={dateTo}
                onPresetChange={handlePresetChange}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                inlineCustomDates={false}
              />
              <ReportFromDateFilter value={dateFrom} onChange={setDateFrom} />
              <ReportToDateFilter value={dateTo} onChange={setDateTo} />
              <ReportBranchMultiFilter
                values={branches}
                onChange={setBranches}
                options={branchOptions}
              />
              <ReportMoreFilters activeCount={active.search.trim() ? 1 : 0}>
                <ReportSearchFilter
                  value={active.search}
                  onChange={setActiveSearch}
                  placeholder={`Search invoice, ${SALES_INVOICE_TAB_META[activeTab].sourceNoLabel.toLowerCase()}, dispatch…`}
                />
              </ReportMoreFilters>
            </ReportFilterRow>
          }
        >
          <SalesInvoicesListing
            tab={activeTab}
            mounted={mounted}
            toolbarRows={toolbarRows}
            page={active.page}
            pageSize={active.pageSize}
            onPageChange={setActivePage}
            onPageSizeChange={setActivePageSize}
            loading={active.loading}
            error={active.error}
            clearFilters={clearFilters}
            hasToolbarFilters={hasToolbarFilters}
            onCancel={setCancelTarget}
            onPrint={handlePrint}
          />
        </AccountsPageShell>
      </AccountsColumnFilterProvider>

      <InvoiceCancelDialog
        open={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        invoiceNo={cancelTarget?.invoiceNo ?? ""}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}

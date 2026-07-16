"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useClientMounted } from "@/lib/use-client-mounted";
import { Ban, Download } from "lucide-react";
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
import { SalesInvoicesTabs } from "./SalesInvoicesTabs";
import {
  getSalesInvoiceBranchOptions,
  listSalesInvoicesByTab,
  SALES_INVOICE_TAB_META,
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

  if (tab === "stock_transfer") {
    headers = [
      "Invoice Date",
      "Invoice No.",
      "Order No.",
      "Dispatch No.",
      "From Warehouse",
      "To Warehouse",
      "Total Amount",
      "Total Item Count",
    ];
    toRow = (r) => [
      r.invoiceDate || "—",
      r.invoiceNo,
      r.orderNo,
      r.dispatchNo,
      r.fromWarehouse || "—",
      r.toWarehouse || "—",
      formatMoney(r.totalAmount),
      r.itemCount,
    ];
  } else {
    headers = [
      "Invoice Date",
      "Invoice No.",
      "Order No.",
      "Dispatch No.",
      "Customer Name",
      "Customer Code",
      "Total Amount",
      "Total Item Count",
    ];
    toRow = (r) => [
      r.invoiceDate || "—",
      r.invoiceNo,
      r.orderNo,
      r.dispatchNo,
      r.customerName,
      r.customerCode || "—",
      formatMoney(tab === "sample_order" ? 0 : r.totalAmount),
      r.itemCount,
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

  const isStockTransfer = tab === "stock_transfer";
  const isSampleOrder = tab === "sample_order";
  const colSpan = isStockTransfer ? 9 : 8;

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

  if (isStockTransfer) {
    return (
      <AccountsTable minWidth={1180}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" />
            <SortTh label="Invoice No." colKey="invoiceNo" />
            <SortTh label="Order No." colKey="orderNo" />
            <SortTh label="Dispatch No." colKey="dispatchNo" />
            <SortTh label="From Warehouse" colKey="fromWarehouse" />
            <SortTh label="To Warehouse" colKey="toWarehouse" />
            <SortTh label="Total Amount" colKey="totalAmount" filterType="amount" align="right" />
            <SortTh label="Total Item Count" colKey="itemCount" filterType="amount" align="right" />
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
                  {r.itemCount}
                </AccountsTableCell>
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
    <AccountsTable minWidth={1120}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Invoice Date" colKey="invoiceDate" filterType="date" />
          <SortTh label="Invoice No." colKey="invoiceNo" />
          <SortTh label="Order No." colKey="orderNo" />
          <SortTh label="Dispatch No." colKey="dispatchNo" />
          <SortTh label="Customer" colKey="customerName" className="accounts-col-party" />
          <SortTh label="Total Amount" colKey="totalAmount" filterType="amount" align="right" />
          <SortTh label="Total Item Count" colKey="itemCount" filterType="amount" align="right" />
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
                <div className="min-w-0 leading-tight">
                  <p className="text-xs font-semibold text-foreground truncate">{r.customerName}</p>
                  {r.customerCode ? (
                    <p className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                      {r.customerCode}
                    </p>
                  ) : null}
                </div>
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="font-semibold">
                <MoneyAmount amount={isSampleOrder ? 0 : r.totalAmount} />
              </AccountsTableCell>
              <AccountsTableCell align="right" className="tabular-nums">
                {r.itemCount}
              </AccountsTableCell>
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
  const [activeTab, setActiveTab] = useState<SalesInvoiceTabId>("sales_order");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } =
    useReportDateRange("this_month");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branches, setBranches] = useState<string[]>([]);
  const [cancelTarget, setCancelTarget] = useState<SalesInvoiceListRow | null>(null);

  const [tabState, setTabState] = useState<Record<SalesInvoiceTabId, TabCache>>({
    sales_order: createEmptyTabCache(),
    stock_transfer: createEmptyTabCache(),
    sample_order: createEmptyTabCache(),
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
    fetchTab("sales_order");
  }, [mounted, fetchTab]);

  // Refresh when returning from invoice generation / edit
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
    (Object.keys(tabState) as SalesInvoiceTabId[]).forEach((tab) => {
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
    const counts: Record<SalesInvoiceTabId, number | null> = {
      sales_order: null,
      stock_transfer: null,
      sample_order: null,
    };
    if (!mounted) return counts;
    (Object.keys(counts) as SalesInvoiceTabId[]).forEach((tab) => {
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
      // Refetch every tab so counts stay in sync after cancel
      (["sales_order", "stock_transfer", "sample_order"] as SalesInvoiceTabId[]).forEach(
        (tab) => fetchTab(tab),
      );
    },
    [cancelTarget, fetchTab],
  );

  const getCellValue = useCallback((row: SalesInvoiceListRow, key: string) => {
    if (key === "totalAmount") {
      return formatMoney(row.sourceType === "sample_order" ? 0 : row.totalAmount);
    }
    return (row as unknown as Record<string, unknown>)[key];
  }, []);

  const columnConfig: AccountsColumnFilterConfig =
    activeTab === "stock_transfer"
      ? {
          invoiceDate: { type: "date" },
          invoiceNo: { type: "text" },
          orderNo: { type: "text" },
          dispatchNo: { type: "text" },
          fromWarehouse: { type: "text" },
          toWarehouse: { type: "text" },
          totalAmount: { type: "amount" },
          itemCount: { type: "amount" },
        }
      : {
          invoiceDate: { type: "date" },
          invoiceNo: { type: "text" },
          orderNo: { type: "text" },
          dispatchNo: { type: "text" },
          customerName: { type: "text" },
          totalAmount: { type: "amount" },
          itemCount: { type: "amount" },
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
          description="Generated tax invoices by source — sales order, stock transfer, and sample order."
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
                <AccountsExportMenu
                  onExcel={() => exportSalesInvoiceTabCsv(activeTab, toolbarRows)}
                  onPdf={() => exportSalesInvoiceTabCsv(activeTab, toolbarRows)}
                  disabled={toolbarRows.length === 0}
                />
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

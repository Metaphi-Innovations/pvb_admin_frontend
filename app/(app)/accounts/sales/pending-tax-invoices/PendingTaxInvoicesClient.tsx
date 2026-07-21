"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useClientMounted } from "@/lib/use-client-mounted";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { CustomerPartyNameCell } from "@/app/(app)/accounts/invoices/components/CustomerPartyInfo";
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
import { PendingInvoicesTabs } from "./PendingInvoicesTabs";
import {
  getPendingInvoiceBranchOptions,
  listPendingInvoicesByTab,
  PENDING_INVOICE_TAB_META,
  type PendingInvoiceListRow,
  type PendingInvoiceTabId,
} from "./pending-invoice-tab-data";
import "./pending-invoices-compact.css";

type TabCache = {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  rows: PendingInvoiceListRow[];
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
  rows: PendingInvoiceListRow[],
  opts: { search: string; dateFrom: string; dateTo: string; branches: string[] },
): PendingInvoiceListRow[] {
  let list = [...rows];
  if (opts.search.trim()) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.sourceNo.toLowerCase().includes(q) ||
        r.dispatchNo.toLowerCase().includes(q) ||
        r.partyName.toLowerCase().includes(q) ||
        r.customerCode.toLowerCase().includes(q) ||
        r.salesperson.toLowerCase().includes(q) ||
        r.fromWarehouse.toLowerCase().includes(q) ||
        r.toWarehouse.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        (r.generatedBy?.toLowerCase().includes(q) ?? false),
    );
  }
  if (opts.dateFrom || opts.dateTo) {
    list = list.filter((r) => {
      const dateKey = (r.dispatchDate || r.orderDate || "").trim();
      if (!dateKey) return true;
      if (opts.dateFrom && dateKey < opts.dateFrom) return false;
      if (opts.dateTo && dateKey > opts.dateTo) return false;
      return true;
    });
  }
  if (opts.branches.length) list = list.filter((r) => opts.branches.includes(r.branch));
  return list;
}

function exportPendingTabCsv(tab: PendingInvoiceTabId, rows: PendingInvoiceListRow[]) {
  const meta = PENDING_INVOICE_TAB_META[tab];
  let headers: string[];
  let toRow: (r: PendingInvoiceListRow) => (string | number)[];

  if (tab === "sales_order") {
    headers = [
      "Dispatch Date",
      "Dispatch No.",
      "Sales Order No.",
      "Customer",
      "Qty",
      "Invoice Value",
      "Branch",
    ];
    toRow = (r) => [
      r.dispatchDate || "—",
      r.dispatchNo,
      r.sourceNo,
      r.partyName,
      r.qty,
      formatMoney(r.invoiceValue),
      r.branch || "—",
    ];
  } else if (tab === "sample_order") {
    headers = [
      "Dispatch Date",
      "Dispatch No.",
      "Sample Order No.",
      "Customer",
      "Qty",
      "Invoice Value",
    ];
    toRow = (r) => [
      r.dispatchDate || "—",
      r.dispatchNo,
      r.sourceNo,
      r.partyName,
      r.qty,
      formatMoney(0),
    ];
  } else {
    headers = [
      "Dispatch Date",
      "Dispatch No.",
      "Stock Transfer No.",
      "From Warehouse",
      "To Warehouse",
      "Qty",
      "Invoice Value",
    ];
    toRow = (r) => [
      r.dispatchDate || "—",
      r.dispatchNo,
      r.sourceNo,
      r.fromWarehouse || "—",
      r.toWarehouse || "—",
      r.qty,
      formatMoney(r.invoiceValue),
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

function PendingInvoicesListing({
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
}: {
  tab: PendingInvoiceTabId;
  mounted: boolean;
  toolbarRows: PendingInvoiceListRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  loading: boolean;
  error: string | null;
  clearFilters?: () => void;
  hasToolbarFilters: boolean;
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
      <PendingInvoicesTable
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
      />
    </AccountsTableListing>
  );
}

function PendingInvoicesTable({
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
}: {
  tab: PendingInvoiceTabId;
  mounted: boolean;
  toolbarRows: PendingInvoiceListRow[];
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  loading: boolean;
  error: string | null;
  clearFilters?: () => void;
  hasToolbarFilters: boolean;
}) {
  const meta = PENDING_INVOICE_TAB_META[tab];
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(toolbarRows);
  const pagedRows = useMemo(
    () => visible.slice((page - 1) * pageSize, page * pageSize),
    [visible, page, pageSize],
  );

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, onPageChange]);

  const isSalesOrder = tab === "sales_order";
  const isSampleOrder = tab === "sample_order";
  const isStockTransfer = tab === "stock_transfer";
  const colSpan = isSalesOrder ? 8 : isStockTransfer ? 8 : 7;

  const generateAction = (r: PendingInvoiceListRow) => {
    const alreadyInvoiced = Boolean(r.invoiceId);
    return (
      <Button
        asChild={!alreadyInvoiced}
        size="sm"
        disabled={alreadyInvoiced}
        className="h-7 px-2.5 text-xs bg-brand-600 hover:bg-brand-700 text-white disabled:opacity-50"
      >
        {alreadyInvoiced ? (
          <span>Generate Invoice</span>
        ) : (
          <Link href={r.generateHref}>Generate Invoice</Link>
        )}
      </Button>
    );
  };

  const emptyStates =
    !mounted || loading ? (
      <AccountsTableEmpty colSpan={colSpan} message="Loading pending invoices…" />
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

  if (isSalesOrder) {
    return (
      <AccountsTable minWidth={1100}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Dispatch Date" colKey="dispatchDate" filterType="date" />
            <SortTh label="Dispatch No." colKey="dispatchNo" />
            <SortTh label="Sales Order No." colKey="sourceNo" />
            <SortTh label="Customer" colKey="partyName" className="accounts-col-party" />
            <SortTh label="Qty" colKey="qty" filterType="amount" align="right" />
            <SortTh label="Invoice Value" colKey="invoiceValue" filterType="amount" align="right" />
            <SortTh label="Branch" colKey="branch" />
            <AccountsColumnHeader
              label="Action"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className="accounts-col-actions"
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {emptyStates ??
            pagedRows.map((r) => (
              <AccountsTableRow key={r.id}>
                <AccountsTableCell className="tabular-nums">{r.dispatchDate || "—"}</AccountsTableCell>
                <AccountsTableCell mono>{r.dispatchNo}</AccountsTableCell>
                <AccountsTableCell mono className="font-semibold text-brand-700">
                  {r.detailHref ? (
                    <Link href={r.detailHref} className="hover:underline">
                      {r.sourceNo}
                    </Link>
                  ) : (
                    r.sourceNo
                  )}
                </AccountsTableCell>
                <AccountsTableCell className="accounts-col-party">
                  <CustomerPartyNameCell
                    customerName={r.partyName}
                    customerCode={r.customerCode}
                    branch={r.branch}
                  />
                </AccountsTableCell>
                <AccountsTableCell align="right" className="tabular-nums">
                  {r.qty}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="font-semibold">
                  <MoneyAmount amount={r.invoiceValue} />
                </AccountsTableCell>
                <AccountsTableCell>{r.branch || "—"}</AccountsTableCell>
                <AccountsTableCell align="right">{generateAction(r)}</AccountsTableCell>
              </AccountsTableRow>
            ))}
        </AccountsTableBody>
      </AccountsTable>
    );
  }

  if (isSampleOrder) {
    return (
      <AccountsTable minWidth={1040}>
        <AccountsTableHead>
          <AccountsTableHeadRow>
            <SortTh label="Dispatch Date" colKey="dispatchDate" filterType="date" />
            <SortTh label="Dispatch No." colKey="dispatchNo" />
            <SortTh label="Sample Order No." colKey="sourceNo" />
            <SortTh label="Customer" colKey="partyName" className="accounts-col-party" />
            <SortTh label="Qty" colKey="qty" filterType="amount" align="right" />
            <SortTh label="Invoice Value" colKey="invoiceValue" filterType="amount" align="right" />
            <AccountsColumnHeader
              label="Action"
              colKey="_actions"
              sortable={false}
              filterable={false}
              align="right"
              className="accounts-col-actions"
            />
          </AccountsTableHeadRow>
        </AccountsTableHead>
        <AccountsTableBody>
          {emptyStates ??
            pagedRows.map((r) => (
              <AccountsTableRow key={r.id}>
                <AccountsTableCell className="tabular-nums">{r.dispatchDate || "—"}</AccountsTableCell>
                <AccountsTableCell mono>{r.dispatchNo}</AccountsTableCell>
                <AccountsTableCell mono className="font-semibold text-brand-700">
                  {r.detailHref ? (
                    <Link href={r.detailHref} className="hover:underline">
                      {r.sourceNo}
                    </Link>
                  ) : (
                    r.sourceNo
                  )}
                </AccountsTableCell>
                <AccountsTableCell className="accounts-col-party">
                  <CustomerPartyNameCell
                    customerName={r.partyName}
                    customerCode={r.customerCode}
                    branch={r.branch}
                  />
                </AccountsTableCell>
                <AccountsTableCell align="right" className="tabular-nums">
                  {r.qty}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className="font-semibold">
                  <MoneyAmount amount={0} />
                </AccountsTableCell>
                <AccountsTableCell align="right">{generateAction(r)}</AccountsTableCell>
              </AccountsTableRow>
            ))}
        </AccountsTableBody>
      </AccountsTable>
    );
  }

  return (
    <AccountsTable minWidth={1180}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Dispatch Date" colKey="dispatchDate" filterType="date" />
          <SortTh label="Dispatch No." colKey="dispatchNo" />
          <SortTh label="Stock Transfer No." colKey="sourceNo" />
          <SortTh label="From Warehouse" colKey="fromWarehouse" />
          <SortTh label="To Warehouse" colKey="toWarehouse" />
          <SortTh label="Qty" colKey="qty" filterType="amount" align="right" />
          <SortTh label="Invoice Value" colKey="invoiceValue" filterType="amount" align="right" />
          <AccountsColumnHeader
            label="Action"
            colKey="_actions"
            sortable={false}
            filterable={false}
            align="right"
            className="accounts-col-actions"
          />
        </AccountsTableHeadRow>
      </AccountsTableHead>
      <AccountsTableBody>
        {emptyStates ??
          pagedRows.map((r) => (
            <AccountsTableRow key={r.id}>
              <AccountsTableCell className="tabular-nums">{r.dispatchDate || "—"}</AccountsTableCell>
              <AccountsTableCell mono>{r.dispatchNo}</AccountsTableCell>
              <AccountsTableCell mono className="font-semibold text-brand-700">
                {r.detailHref ? (
                  <Link href={r.detailHref} className="hover:underline">
                    {r.sourceNo}
                  </Link>
                ) : (
                  r.sourceNo
                )}
              </AccountsTableCell>
              <AccountsTableCell>{r.fromWarehouse || "—"}</AccountsTableCell>
              <AccountsTableCell>{r.toWarehouse || "—"}</AccountsTableCell>
              <AccountsTableCell align="right" className="tabular-nums">
                {r.qty}
              </AccountsTableCell>
              <AccountsTableCell align="right" money className="font-semibold">
                <MoneyAmount amount={r.invoiceValue} />
              </AccountsTableCell>
              <AccountsTableCell align="right">{generateAction(r)}</AccountsTableCell>
            </AccountsTableRow>
          ))}
      </AccountsTableBody>
    </AccountsTable>
  );
}

export default function PendingTaxInvoicesClient() {
  const mounted = useClientMounted();
  const [activeTab, setActiveTab] = useState<PendingInvoiceTabId>("sales_order");
  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_month");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [branches, setBranches] = useState<string[]>([]);

  const [tabState, setTabState] = useState<Record<PendingInvoiceTabId, TabCache>>({
    sales_order: createEmptyTabCache(),
    stock_transfer: createEmptyTabCache(),
    sample_order: createEmptyTabCache(),
  });

  const filterKey = `${financialYearId}|${dateFrom}|${dateTo}|${branches.join(",")}`;
  const prevFilterKey = useRef(filterKey);

  const fetchTab = useCallback((tab: PendingInvoiceTabId) => {
    setTabState((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], loading: true, error: null },
    }));
    try {
      // Drop any cached pending-invoice snapshot so post-generate refreshes see fresh data
      accountsDataService.invalidate();
      const rows = listPendingInvoicesByTab(tab);
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
          error: e instanceof Error ? e.message : "Failed to load pending invoices.",
          rows: [],
        },
      }));
    }
  }, []);

  // Load default tab first; other tabs load on open
  useEffect(() => {
    if (!mounted) return;
    fetchTab("sales_order");
  }, [mounted, fetchTab]);

  // Refresh active tab when returning from invoice generation
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

  // Shared filter change → invalidate inactive caches; refetch active
  useEffect(() => {
    if (!mounted) return;
    if (prevFilterKey.current === filterKey) return;
    prevFilterKey.current = filterKey;
    setTabState((prev) => {
      const next = { ...prev };
      (Object.keys(next) as PendingInvoiceTabId[]).forEach((tab) => {
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

  const handleTabChange = (tab: PendingInvoiceTabId) => {
    setActiveTab(tab);
    setTabState((prev) => {
      if (prev[tab].loaded || prev[tab].loading) return prev;
      return prev;
    });
    if (!tabState[tab].loaded && !tabState[tab].loading) {
      fetchTab(tab);
    }
  };

  const active = tabState[activeTab];

  const branchOptions = useMemo(() => {
    if (!mounted) return [];
    const set = new Set<string>();
    (Object.keys(tabState) as PendingInvoiceTabId[]).forEach((tab) => {
      if (tabState[tab].loaded) {
        for (const r of tabState[tab].rows) if (r.branch) set.add(r.branch);
      } else if (tab === activeTab) {
        for (const b of getPendingInvoiceBranchOptions(tab)) set.add(b);
      }
    });
    // Prefer options from active tab source so Branch filter stays useful before other tabs load
    if (set.size === 0 && mounted) {
      return getPendingInvoiceBranchOptions(activeTab);
    }
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

  // Tab counts — filtered with shared filters + each tab's own search
  const tabCounts = useMemo(() => {
    const counts: Record<PendingInvoiceTabId, number | null> = {
      sales_order: null,
      stock_transfer: null,
      sample_order: null,
    };
    if (!mounted) return counts;
    (Object.keys(counts) as PendingInvoiceTabId[]).forEach((tab) => {
      const cache = tabState[tab];
      if (!cache.loaded) {
        // Lightweight count for unloaded tabs so labels stay useful
        try {
          counts[tab] = applyToolbarFilters(listPendingInvoicesByTab(tab), {
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

  const getCellValue = useCallback((row: PendingInvoiceListRow, key: string) => {
    if (key === "invoiceValue") {
      return formatMoney(activeTab === "sample_order" ? 0 : row.invoiceValue);
    }
    if (key === "totalAmount") {
      return formatMoney(activeTab === "sample_order" ? 0 : row.totalAmount);
    }
    return (row as unknown as Record<string, unknown>)[key];
  }, [activeTab]);

  const columnConfig: AccountsColumnFilterConfig =
    activeTab === "sales_order"
      ? {
          dispatchDate: { type: "date" },
          dispatchNo: { type: "text" },
          sourceNo: { type: "text" },
          partyName: { type: "text" },
          qty: { type: "amount" },
          invoiceValue: { type: "amount" },
          branch: { type: "text" },
        }
      : activeTab === "sample_order"
        ? {
            dispatchDate: { type: "date" },
            dispatchNo: { type: "text" },
            sourceNo: { type: "text" },
            partyName: { type: "text" },
            qty: { type: "amount" },
            invoiceValue: { type: "amount" },
          }
        : {
            dispatchDate: { type: "date" },
            dispatchNo: { type: "text" },
            sourceNo: { type: "text" },
            fromWarehouse: { type: "text" },
            toWarehouse: { type: "text" },
            qty: { type: "amount" },
            invoiceValue: { type: "amount" },
          };

  return (
    <div className="pending-invoices-compact h-full min-h-0">
      <AccountsColumnFilterProvider
        key={activeTab}
        rows={toolbarRows}
        getCellValue={getCellValue}
        columnConfig={columnConfig}
        defaultSortKey="dispatchDate"
        defaultSortDir="desc"
      >
        <AccountsPageShell
          breadcrumbs={accountsBreadcrumb("Transactions", "Pending Invoices")}
          title="Pending Invoices"
          description="Dispatch-completed orders from Warehouse — generate tax invoice and post to ledger."
          hideDescription
          layout="split"
          className="h-full min-h-0"
          subHeader={
            <PendingInvoicesTabs
              value={activeTab}
              onChange={handleTabChange}
              counts={tabCounts}
            />
          }
          filters={
            <ReportFilterRow
              end={
                <AccountsExportMenu
                  onExcel={() => exportPendingTabCsv(activeTab, toolbarRows)}
                  onPdf={() => exportPendingTabCsv(activeTab, toolbarRows)}
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
                  placeholder={`Search ${PENDING_INVOICE_TAB_META[activeTab].sourceNoLabel.toLowerCase()}, dispatch, party…`}
                />
              </ReportMoreFilters>
            </ReportFilterRow>
          }
        >
          <PendingInvoicesListing
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
          />
        </AccountsPageShell>
      </AccountsColumnFilterProvider>
    </div>
  );
}

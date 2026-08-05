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
import {
  exportTabularReportToPdf,
  buildReportDocumentHtml,
  buildStandardReportTableHtml,
  todayExportDateSuffix,
} from "@/lib/accounts/report-export-presentation";
import { SalesInvoiceNumberService } from "@/services/sales-invoice-number.service";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { resolveDateRangePreset, type DateRangePresetId } from "@/lib/accounts/report-date-presets";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { accountsDataService } from "@/lib/accounts/accounts-data-service";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import type { AccountsColumnFilterConfig, ColumnValueOption } from "@/lib/accounts/column-filter-types";
import { PendingInvoicesTabs } from "./PendingInvoicesTabs";
import {
  getPendingInvoiceBranchOptions,
  listPendingInvoicesByTab,
  PENDING_INVOICE_TAB_META,
  type PendingInvoiceListRow,
  type PendingInvoiceTabId,
} from "./pending-invoice-tab-data";
import { pendingInvoicesService } from "@/services/pending-invoices.service";
import { WarehouseService } from "@/services/warehouse.service";
import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "@/app/(app)/accounts/reports/pl/pl-hooks";
import "./pending-invoices-compact.css";
type TabCache = {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  rows: PendingInvoiceListRow[];
  search: string;
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  total: number;
  columnFilters: Record<string, any>;
  preset: DateRangePresetId;
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  branches: string[];
};

function createEmptyTabCache(): TabCache {
  const { from, to } = resolveDateRangePreset("this_year");
  return {
    loaded: false,
    loading: false,
    error: null,
    rows: [],
    search: "",
    page: 1,
    pageSize: 25,
    sortKey: "dispatchDate",
    sortDir: "desc",
    total: 0,
    columnFilters: {},
    preset: "this_year",
    dateFrom: from,
    dateTo: to,
    financialYearId: "all",
    branches: [],
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

async function exportPendingTabExcel(tab: PendingInvoiceTabId, rows: PendingInvoiceListRow[]) {
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
      r.invoiceValue,
      r.branch || "—",
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
      r.invoiceValue,
    ];
  }

  const dataRows = rows.map((r) => toRow(r));
  const filename = meta.exportFileName;

  const excelBlob = await SalesInvoiceNumberService.generateExcel({ headers, rows: dataRows, filename });
  const url = URL.createObjectURL(excelBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function exportPendingTabPdf(tab: PendingInvoiceTabId, rows: PendingInvoiceListRow[]) {
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

  const columns = headers.map((h, i) => ({
    label: h,
    align: h === "Qty" || h === "Invoice Value" ? ("right" as const) : ("left" as const),
    className: h === "Qty" || h === "Invoice Value" ? "num" : undefined,
  }));

  const bodyHtml = rows
    .map((r) => {
      const vals = toRow(r);
      const cells = vals
        .map((v, i) => {
          const isNum = headers[i] === "Qty" || headers[i] === "Invoice Value";
          return `<td class="${isNum ? "num" : ""}">${v}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const htmlContent = buildReportDocumentHtml({
    title: meta.label,
    header: {
      reportTitle: meta.label,
    },
    bodyHtml: buildStandardReportTableHtml({ columns, bodyHtml }),
    landscape: headers.length > 6,
  });

  const filename = `${meta.label.replace(/\s+/g, "_")}_${todayExportDateSuffix()}.pdf`;
  const pdfBlob = await SalesInvoiceNumberService.generatePdf({ htmlContent, filename });
  const url = URL.createObjectURL(pdfBlob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function SortSync({
  sortKey,
  sortDir,
  columnFilters,
  onSortChange,
  onFilterChange,
}: {
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: Record<string, any>;
  onSortChange: (sortKey: string, sortDir: "asc" | "desc") => void;
  onFilterChange: (filters: Record<string, any>) => void;
}) {
  const ctx = useAccountsColumnFilterContext();

  useEffect(() => {
    if (!ctx) return;
    if (ctx.sortKey && (ctx.sortKey !== sortKey || ctx.sortDir !== sortDir)) {
      onSortChange(ctx.sortKey, ctx.sortDir ?? "asc");
    }
  }, [ctx?.sortKey, ctx?.sortDir, sortKey, sortDir, onSortChange]);

  useEffect(() => {
    if (!ctx) return;
    const ctxFiltersStr = JSON.stringify(ctx.columnFilters || {});
    const propFiltersStr = JSON.stringify(columnFilters || {});
    if (ctxFiltersStr !== propFiltersStr) {
      onFilterChange(ctx.columnFilters || {});
    }
  }, [ctx?.columnFilters, columnFilters, onFilterChange]);

  return null;
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
  totalRecords,
  dispatchNoOptions,
  sourceNoOptions,
  partyNameOptions,
  branchOptions,
  dispatchDateOptions,
  qtyOptions,
  invoiceValueOptions,
  toWarehouseOptions,
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
  totalRecords: number;
  dispatchNoOptions?: ColumnValueOption[];
  sourceNoOptions?: ColumnValueOption[];
  partyNameOptions?: ColumnValueOption[];
  branchOptions?: ColumnValueOption[];
  dispatchDateOptions?: ColumnValueOption[];
  qtyOptions?: ColumnValueOption[];
  invoiceValueOptions?: ColumnValueOption[];
  toWarehouseOptions?: ColumnValueOption[];
}) {
  const visible = toolbarRows;
  return (
    <AccountsTableListing
      footer={
        mounted && !loading && totalRecords > 0 ? (
          <AccountsTablePagination
            page={page}
            pageSize={pageSize}
            totalRecords={totalRecords}
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
        totalRecords={totalRecords}
        dispatchNoOptions={dispatchNoOptions}
        sourceNoOptions={sourceNoOptions}
        partyNameOptions={partyNameOptions}
        branchOptions={branchOptions}
        dispatchDateOptions={dispatchDateOptions}
        qtyOptions={qtyOptions}
        invoiceValueOptions={invoiceValueOptions}
        toWarehouseOptions={toWarehouseOptions}
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
  totalRecords,
  dispatchNoOptions,
  sourceNoOptions,
  partyNameOptions,
  branchOptions,
  dispatchDateOptions,
  qtyOptions,
  invoiceValueOptions,
  toWarehouseOptions,
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
  totalRecords: number;
  dispatchNoOptions?: ColumnValueOption[];
  sourceNoOptions?: ColumnValueOption[];
  partyNameOptions?: ColumnValueOption[];
  branchOptions?: ColumnValueOption[];
  dispatchDateOptions?: ColumnValueOption[];
  qtyOptions?: ColumnValueOption[];
  invoiceValueOptions?: ColumnValueOption[];
  toWarehouseOptions?: ColumnValueOption[];
}) {
  const meta = PENDING_INVOICE_TAB_META[tab];
  const ctx = useAccountsColumnFilterContext();
  const visible = useAccountsFilteredRows(toolbarRows);
  const pagedRows = visible;

  useEffect(() => {
    onPageChange(1);
  }, [ctx?.columnFilters, onPageChange]);

  const isSalesOrder = tab === "sales_order";
  const isSampleOrder = (tab as string) === "sample_order";
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
            <SortTh label="Dispatch Date" colKey="dispatchDate" filterType="date" valueOptions={dispatchDateOptions} />
            <SortTh label="Dispatch No." colKey="dispatchNo" valueOptions={dispatchNoOptions} />
            <SortTh label="Sales Order No." colKey="sourceNo" valueOptions={sourceNoOptions} />
            <SortTh label="Customer" colKey="partyName" className="accounts-col-party" valueOptions={partyNameOptions} />
            <SortTh label="Qty" colKey="qty" align="right" filterable={false} />
            <SortTh label="Invoice Value" colKey="invoiceValue" align="right" filterable={false} />
            <SortTh label="Branch" colKey="branch" valueOptions={branchOptions} />
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
                    gstin={r.gstin}
                    customerId={r.customerId}
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

  /*
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
                    gstin={r.gstin}
                    customerId={r.customerId}
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
  */



  return (
    <AccountsTable minWidth={1180}>
      <AccountsTableHead>
        <AccountsTableHeadRow>
          <SortTh label="Dispatch Date" colKey="dispatchDate" filterType="date" valueOptions={dispatchDateOptions} />
          <SortTh label="Dispatch No." colKey="dispatchNo" valueOptions={dispatchNoOptions} />
          <SortTh label="Stock Transfer No." colKey="sourceNo" valueOptions={sourceNoOptions} />
          <SortTh label="From Warehouse" colKey="fromWarehouse" valueOptions={branchOptions} />
          <SortTh label="To Warehouse" colKey="toWarehouse" valueOptions={toWarehouseOptions} />
          <SortTh label="Qty" colKey="qty" align="right" filterable={false} />
          <SortTh label="Invoice Value" colKey="invoiceValue" align="right" filterable={false} />
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

  const [tabState, setTabState] = useState<Record<PendingInvoiceTabId, TabCache>>({
    sales_order: createEmptyTabCache(),
    stock_transfer: createEmptyTabCache(),
    // sample_order: createEmptyTabCache(),
  });

  const active = tabState[activeTab];

  // Scoped setters to modify only the active tab's filter criteria
  const setPreset = useCallback((preset: DateRangePresetId) => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], preset, page: 1 },
    }));
  }, [activeTab]);

  const setDateFrom = useCallback((dateFrom: string) => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], dateFrom, page: 1 },
    }));
  }, [activeTab]);

  const setDateTo = useCallback((dateTo: string) => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], dateTo, page: 1 },
    }));
  }, [activeTab]);

  const setFinancialYearId = useCallback((financialYearId: string) => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], financialYearId, page: 1 },
    }));
  }, [activeTab]);

  const setBranches = useCallback((branches: string[]) => {
    setTabState((prev) => ({
      ...prev,
      [activeTab]: { ...prev[activeTab], branches, page: 1 },
    }));
  }, [activeTab]);

  const preset = active.preset;
  const dateFrom = active.dateFrom;
  const dateTo = active.dateTo;
  const financialYearId = active.financialYearId;
  const branches = active.branches;

  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebouncedValue(searchText, 300);
  const preloadedRef = useRef(false);

  useEffect(() => {
    setSearchText(tabState[activeTab].search);
  }, [activeTab]);

  useEffect(() => {
    setTabState((prev) => {
      if (prev[activeTab].search === debouncedSearchText) return prev;
      return {
        ...prev,
        [activeTab]: { ...prev[activeTab], search: debouncedSearchText, page: 1 },
      };
    });
  }, [debouncedSearchText, activeTab]);

  const fetchTab = useCallback(async (
    tab: PendingInvoiceTabId,
    page: number,
    pageSize: number,
    search: string,
    sortKey: string,
    sortDir: "asc" | "desc",
    columnFilters: Record<string, any>,
    dateFromVal: string,
    dateToVal: string,
    branchesVal: string[]
  ) => {
    setTabState((prev) => ({
      ...prev,
      [tab]: { ...prev[tab], loading: true, error: null },
    }));
    try {
      const sourceType = tab === "sales_order" ? "normal_sales" : "stock_transfer";
      
      const queryParams: any = {
        source_type: sourceType,
        page,
        page_size: pageSize,
      };

      if (dateFromVal) {
        queryParams.from_date = dateFromVal;
      }
      if (dateToVal) {
        queryParams.to_date = dateToVal;
      }
      if (branchesVal.length > 0) {
        queryParams.branch_names = branchesVal.join(",");
      }
      if (search.trim()) {
        queryParams.search = search.trim();
      }
      if (Object.keys(columnFilters || {}).length > 0) {
        queryParams.filters = JSON.stringify(columnFilters);
      }

      let backendSortField = "dispatchDate";
      if (sortKey === "dispatchNo") backendSortField = "dispatchNo";
      else if (sortKey === "partyName") backendSortField = "partyName";
      else if (sortKey === "branch") backendSortField = "branch";
      else if (sortKey === "sourceNo") backendSortField = "sourceNo";
      
      const ordering = sortDir === "desc" ? `-${backendSortField}` : backendSortField;
      queryParams.ordering = ordering;

      const res = await pendingInvoicesService.list(queryParams);

      const rows: PendingInvoiceListRow[] = res.data.map((item: any) => {
        const generateParams = new URLSearchParams();
        generateParams.set("dispatchId", item.dispatch_id);
        generateParams.set("dispatch", item.dispatch_no);
        generateParams.set("sourceType", tab);
        
        return {
          id: item.dispatch_id,
          sourceType: tab,
          sourceRecordId: null,
          invoiceId: null,
          dispatchId: item.dispatch_id,
          dispatchNo: item.dispatch_no,
          sourceNo: item.source_order_no,
          partyName: item.customer_name,
          dispatchDate: item.dispatch_date ? item.dispatch_date.split("T")[0] : "—",
          branch: item.branch,
          taxableValue: item.invoice_value,
          gstAmount: 0,
          invoiceValue: item.invoice_value,
          status: "Ready for Dispatch",
          generatedBy: null,
          schemeLabel: null,
          settlementLabel: null,
          orderDate: item.dispatch_date ? item.dispatch_date.split("T")[0] : "—",
          customerCode: item.customer_code || "",
          gstin: item.customer_gstin || "",
          customerId: item.customer_id || "",
          salesperson: "—",
          itemCount: 0,
          qty: item.total_qty,
          fromWarehouse: tab === "stock_transfer" ? item.branch : "",
          toWarehouse: tab === "stock_transfer" ? item.customer_name : "",
          totalAmount: item.invoice_value,
          generateHref: `/accounts/transactions/invoices/new?${generateParams.toString()}`,
          detailHref: null,
          printHref: null,
        };
      });

      setTabState((prev) => ({
        ...prev,
        [tab]: {
          ...prev[tab],
          loaded: true,
          loading: false,
          error: null,
          rows,
          total: res.pagination?.total || rows.length,
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
          total: 0,
        },
      }));
    }
  }, []);

  // Refresh active tab when returning from invoice generation
  useEffect(() => {
    if (!mounted) return;
    const refresh = () => {
      const cache = tabState[activeTab];
      fetchTab(
        activeTab,
        cache.page,
        cache.pageSize,
        cache.search,
        cache.sortKey,
        cache.sortDir,
        cache.columnFilters,
        cache.dateFrom,
        cache.dateTo,
        cache.branches
      );
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mounted, activeTab, tabState, fetchTab]);

  // Pre-load both tabs once on mount so counts are immediately available without loops
  useEffect(() => {
    if (!mounted || preloadedRef.current) return;
    preloadedRef.current = true;

    (Object.keys(tabState) as PendingInvoiceTabId[]).forEach((tab) => {
      const cache = tabState[tab];
      fetchTab(
        tab,
        cache.page,
        cache.pageSize,
        cache.search,
        cache.sortKey,
        cache.sortDir,
        cache.columnFilters,
        cache.dateFrom,
        cache.dateTo,
        cache.branches
      );
    });
  }, [mounted, fetchTab, tabState]);

  // Trigger fetch when any query parameter of the ACTIVE tab changes
  useEffect(() => {
    if (!mounted) return;
    const cache = tabState[activeTab];
    fetchTab(
      activeTab,
      cache.page,
      cache.pageSize,
      cache.search,
      cache.sortKey,
      cache.sortDir,
      cache.columnFilters,
      cache.dateFrom,
      cache.dateTo,
      cache.branches
    );
  }, [
    mounted,
    activeTab,
    tabState[activeTab].page,
    tabState[activeTab].pageSize,
    tabState[activeTab].search,
    tabState[activeTab].sortKey,
    tabState[activeTab].sortDir,
    JSON.stringify(tabState[activeTab].columnFilters),
    tabState[activeTab].dateFrom,
    tabState[activeTab].dateTo,
    JSON.stringify(tabState[activeTab].branches),
    tabState[activeTab].financialYearId,
    fetchTab,
  ]);

  const handlePresetChange = useCallback((value: DateRangePresetId) => {
    if (value !== "custom") {
      const { from, to } = resolveDateRangePreset(value);
      setTabState((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          preset: value,
          dateFrom: from,
          dateTo: to,
          page: 1,
        },
      }));
    } else {
      setTabState((prev) => ({
        ...prev,
        [activeTab]: {
          ...prev[activeTab],
          preset: value,
          page: 1,
        },
      }));
    }
  }, [activeTab]);

  const handleTabChange = useCallback((tab: PendingInvoiceTabId) => {
    setActiveTab(tab);
  }, []);

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses", "dropdown"],
    queryFn: () => WarehouseService.dropdown(),
    enabled: mounted,
  });

  const branchOptions = useMemo(() => {
    if (!mounted || !warehouses) return [];
    return warehouses.map((w) => w.warehouse_name).sort((a, b) => a.localeCompare(b));
  }, [mounted, warehouses]);

  const sourceType = activeTab === "sales_order" ? "normal_sales" : "stock_transfer";

  const { data: dispatchNoOptionsRaw } = useQuery({
    queryKey: ["pending-invoices", "filter-options", "dispatchNo", activeTab],
    queryFn: () => pendingInvoicesService.getFilterDropdown("dispatchNo", sourceType),
    enabled: mounted,
    staleTime: 2 * 60 * 1000,
  });

  const { data: sourceNoOptionsRaw } = useQuery({
    queryKey: ["pending-invoices", "filter-options", "sourceNo", activeTab],
    queryFn: () => pendingInvoicesService.getFilterDropdown("sourceNo", sourceType),
    enabled: mounted,
    staleTime: 2 * 60 * 1000,
  });

  const { data: partyNameOptionsRaw } = useQuery({
    queryKey: ["pending-invoices", "filter-options", "partyName", activeTab],
    queryFn: () => pendingInvoicesService.getFilterDropdown("partyName", sourceType),
    enabled: mounted,
    staleTime: 2 * 60 * 1000,
  });

  const { data: branchOptionsRaw } = useQuery({
    queryKey: ["pending-invoices", "filter-options", "branch", activeTab],
    queryFn: () => pendingInvoicesService.getFilterDropdown("branch", sourceType),
    enabled: mounted,
    staleTime: 2 * 60 * 1000,
  });

  const { data: dispatchDateOptionsRaw } = useQuery({
    queryKey: ["pending-invoices", "filter-options", "dispatchDate", activeTab],
    queryFn: () => pendingInvoicesService.getFilterDropdown("dispatchDate", sourceType),
    enabled: mounted,
    staleTime: 2 * 60 * 1000,
  });

  const { data: qtyOptionsRaw } = useQuery({
    queryKey: ["pending-invoices", "filter-options", "qty", activeTab],
    queryFn: () => pendingInvoicesService.getFilterDropdown("qty", sourceType),
    enabled: mounted,
    staleTime: 2 * 60 * 1000,
  });

  const { data: invoiceValueOptionsRaw } = useQuery({
    queryKey: ["pending-invoices", "filter-options", "invoiceValue", activeTab],
    queryFn: () => pendingInvoicesService.getFilterDropdown("invoiceValue", sourceType),
    enabled: mounted,
    staleTime: 2 * 60 * 1000,
  });

  const { data: toWarehouseOptionsRaw } = useQuery({
    queryKey: ["pending-invoices", "filter-options", "toWarehouse", activeTab],
    queryFn: () => pendingInvoicesService.getFilterDropdown("toWarehouse", sourceType),
    enabled: mounted,
    staleTime: 2 * 60 * 1000,
  });

  const dispatchNoOptions = useMemo(() => {
    return (dispatchNoOptionsRaw || []).map((item: any) => ({
      value: String(item.dispatchNo),
      count: 0,
    }));
  }, [dispatchNoOptionsRaw]);

  const sourceNoOptions = useMemo(() => {
    return (sourceNoOptionsRaw || []).map((item: any) => ({
      value: String(item.sourceNo),
      count: 0,
    }));
  }, [sourceNoOptionsRaw]);

  const partyNameOptions = useMemo(() => {
    return (partyNameOptionsRaw || []).map((item: any) => ({
      value: String(item.partyName),
      count: 0,
    }));
  }, [partyNameOptionsRaw]);

  const branchOptionsFiltered = useMemo(() => {
    return (branchOptionsRaw || []).map((item: any) => ({
      value: String(item.branch),
      count: 0,
    }));
  }, [branchOptionsRaw]);

  const dispatchDateOptions = useMemo(() => {
    return (dispatchDateOptionsRaw || []).map((item: any) => ({
      value: String(item.dispatchDate),
      count: 0,
    }));
  }, [dispatchDateOptionsRaw]);

  const qtyOptions = useMemo(() => {
    return (qtyOptionsRaw || []).map((item: any) => ({
      value: String(item.qty),
      count: 0,
    }));
  }, [qtyOptionsRaw]);

  const invoiceValueOptions = useMemo(() => {
    return (invoiceValueOptionsRaw || []).map((item: any) => ({
      value: String(item.invoiceValue),
      count: 0,
    }));
  }, [invoiceValueOptionsRaw]);

  const toWarehouseOptions = useMemo(() => {
    return (toWarehouseOptionsRaw || []).map((item: any) => ({
      value: String(item.toWarehouse),
      count: 0,
    }));
  }, [toWarehouseOptionsRaw]);

  const handleFinancialYearChange = useCallback(
    (fyId: string) => {
      if (fyId !== "all") {
        const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
        if (fy) {
          const today = new Date().toISOString().slice(0, 10);
          const toDateVal = today < fy.endDate ? today : fy.endDate;
          setTabState((prev) => ({
            ...prev,
            [activeTab]: {
              ...prev[activeTab],
              financialYearId: fyId,
              dateFrom: fy.startDate,
              dateTo: toDateVal,
              preset: "custom",
              page: 1,
            },
          }));
        }
      } else {
        setTabState((prev) => ({
          ...prev,
          [activeTab]: {
            ...prev[activeTab],
            financialYearId: fyId,
            page: 1,
          },
        }));
      }
    },
    [activeTab],
  );

  const clearFilters = useCallback(() => {
    const { from, to } = resolveDateRangePreset("this_year");
    setTabState((prev) => ({
      ...prev,
      [activeTab]: {
        ...prev[activeTab],
        search: "",
        page: 1,
        financialYearId: "all",
        branches: [],
        preset: "this_year",
        dateFrom: from,
        dateTo: to,
        columnFilters: {},
      },
    }));
    setSearchText("");
  }, [activeTab]);

  const hasToolbarFilters =
    Boolean(active.search.trim()) ||
    preset !== "this_year" ||
    financialYearId !== "all" ||
    branches.length > 0;

  const toolbarRows = active.rows;

  // Tab counts — filtered with shared filters + each tab's own search
  const tabCounts = useMemo(() => {
    return {
      sales_order: tabState.sales_order.total,
      stock_transfer: tabState.stock_transfer.total,
    };
  }, [tabState]);

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

  const getCellValue = useCallback((row: PendingInvoiceListRow, key: string) => {
    if (key === "invoiceValue") {
      return formatMoney((activeTab as string) === "sample_order" ? 0 : row.invoiceValue);
    }
    if (key === "totalAmount") {
      return formatMoney((activeTab as string) === "sample_order" ? 0 : row.totalAmount);
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
      : (activeTab as string) === "sample_order"
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
        defaultSortKey={active.sortKey}
        defaultSortDir={active.sortDir}
      >
        <SortSync
          sortKey={active.sortKey}
          sortDir={active.sortDir}
          columnFilters={active.columnFilters}
          onSortChange={(key, dir) =>
            setTabState((prev) => ({
              ...prev,
              [activeTab]: {
                ...prev[activeTab],
                sortKey: key,
                sortDir: dir,
                page: 1,
              },
            }))
          }
          onFilterChange={(filters) =>
            setTabState((prev) => ({
              ...prev,
              [activeTab]: {
                ...prev[activeTab],
                columnFilters: filters,
                page: 1,
              },
            }))
          }
        />
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
                    onExcel={() => exportPendingTabExcel(activeTab, toolbarRows)}
                    onPdf={() => exportPendingTabPdf(activeTab, toolbarRows)}
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
              <ReportMoreFilters activeCount={searchText.trim() ? 1 : 0}>
                <ReportSearchFilter
                  value={searchText}
                  onChange={setSearchText}
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
            totalRecords={active.total}
            dispatchNoOptions={dispatchNoOptions}
            sourceNoOptions={sourceNoOptions}
            partyNameOptions={partyNameOptions}
            branchOptions={branchOptionsFiltered}
            dispatchDateOptions={dispatchDateOptions}
            qtyOptions={qtyOptions}
            invoiceValueOptions={invoiceValueOptions}
            toWarehouseOptions={toWarehouseOptions}
          />
        </AccountsPageShell>
      </AccountsColumnFilterProvider>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download, FileDown, FileSpreadsheet } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsSummaryBar } from "@/components/accounts/AccountsSummaryBar";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportAsOnDateFilter,
  ReportFilterRow,
  ReportFinancialYearFilter,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import {
  AccountsClearAllColumnFiltersButton,
  AccountsColumnFilterProvider,
  SectionTabs,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import { EmptySearch } from "@/components/ui/EmptyState";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { defaultAsOnDate } from "@/lib/accounts/report-date-presets";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildStockLedgerDrillHref,
  buildStockValuationRows,
  computeStockValuationTotals,
  filterStockValuationRows,
  formatQtyWithUnit,
  getValuationPeriodStart,
  type CostRateMethod,
  type StockValuationRow,
  type StockValuationStatusFilter,
  type StockValuationTab,
} from "./stock-valuation-data";
import {
  exportStockValuationToExcel,
  exportStockValuationToPdf,
  type StockValuationExportBasis,
  type StockValuationExportMeta,
} from "./stock-valuation-export";
import "./stock-valuation-compact.css";

/** Default backend valuation method — not shown as a UI filter. */
const DEFAULT_COST_RATE_METHOD: CostRateMethod = "weighted_average";

const STOCK_STATUS_OPTIONS: { value: StockValuationStatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Available", label: "Available" },
  { value: "Near Expiry", label: "Near Expiry" },
  { value: "Expired", label: "Expired" },
  { value: "Zero Stock", label: "Zero Stock" },
  { value: "Negative Stock", label: "Negative Stock" },
];

const TABS: { id: StockValuationTab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "detailed", label: "Detailed" },
];

function ReportStockStatusFilter({
  value,
  onChange,
}: {
  value: StockValuationStatusFilter;
  onChange: (value: StockValuationStatusFilter) => void;
}) {
  return (
    <div className="space-y-0.5 shrink-0">
      <Label className={filterLabelClass}>Stock Status</Label>
      <Select value={value} onValueChange={(v) => onChange(v as StockValuationStatusFilter)}>
        <SelectTrigger className={cn(filterControlClass, "w-[120px]")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STOCK_STATUS_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StockValuationExportMenu({
  disabled,
  onExport,
}: {
  disabled?: boolean;
  onExport: (format: "excel" | "pdf", basis: StockValuationExportBasis) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "text-xs px-2.5 h-8")}
          disabled={disabled}
        >
          <Download className="w-4 h-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem
          className="text-xs gap-2"
          onClick={() => onExport("excel", "cost")}
        >
          <FileSpreadsheet className="w-4 h-4" /> Excel (Cost Valuation)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs gap-2"
          onClick={() => onExport("excel", "market")}
        >
          <FileSpreadsheet className="w-4 h-4" /> Excel (Market Valuation)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-xs gap-2"
          onClick={() => onExport("pdf", "cost")}
        >
          <FileDown className="w-4 h-4" /> PDF (Cost Valuation)
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-xs gap-2"
          onClick={() => onExport("pdf", "market")}
        >
          <FileDown className="w-4 h-4" /> PDF (Market Valuation)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatMoneyOrDash(
  value: number | null | undefined,
  missing: boolean,
): string {
  if (missing || value == null) return "—";
  return formatMoney(value);
}

function formatCostValue(row: StockValuationRow): string {
  if (row.costRateMissing && row.closingQty !== 0) return "—";
  return formatMoney(row.costValue);
}

export default function StockValuationPageClient() {
  const mounted = useClientMounted();

  const [tab, setTab] = useState<StockValuationTab>("summary");
  const [asOnDate, setAsOnDate] = useState(defaultAsOnDate());
  const [financialYearId, setFinancialYearId] = useState("all");
  const [stockStatus, setStockStatus] = useState<StockValuationStatusFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const activeFyId = getActiveFinancialYearId();
    if (activeFyId) setFinancialYearId(String(activeFyId));
    setAsOnDate(defaultAsOnDate());
  }, []);

  const sourceRows = useMemo(() => {
    if (!mounted) return [];
    return buildStockValuationRows(asOnDate, DEFAULT_COST_RATE_METHOD, "all", {
      financialYearId,
      grouping: "product_warehouse",
    });
  }, [mounted, asOnDate, financialYearId]);

  const filteredRows = useMemo(
    () =>
      filterStockValuationRows(sourceRows, {
        asOnDate,
        financialYearId,
        stockStatus,
      }),
    [sourceRows, asOnDate, financialYearId, stockStatus],
  );

  const getCellValue = useCallback((row: StockValuationRow, key: string) => {
    const record = row as unknown as Record<string, unknown>;
    if (key === "marketRate") return row.marketRateMissing ? null : row.marketRate;
    if (key === "marketValue") return row.marketRateMissing ? null : row.marketValue;
    return record[key];
  }, []);

  const columnConfig = useMemo(() => {
    const base = {
      productName: { type: "text" as const },
      warehouse: { type: "text" as const },
      closingQty: { type: "amount" as const },
      costRate: { type: "amount" as const },
      costValue: { type: "amount" as const },
      marketRate: { type: "amount" as const },
      marketValue: { type: "amount" as const },
      finalStockValue: { type: "amount" as const },
    };
    if (tab === "detailed") {
      return {
        ...base,
        openingQty: { type: "amount" as const },
        inwardQty: { type: "amount" as const },
        outwardQty: { type: "amount" as const },
      };
    }
    return base;
  }, [tab]);

  const activeFyId = mounted ? getActiveFinancialYearId() : null;

  const hasFilters =
    stockStatus !== "all" ||
    financialYearId !== (activeFyId ? String(activeFyId) : "all");

  const clearFilters = useCallback(() => {
    setStockStatus("all");
    setFinancialYearId(activeFyId ? String(activeFyId) : "all");
    setAsOnDate(defaultAsOnDate());
  }, [activeFyId]);

  const periodStart = useMemo(
    () => getValuationPeriodStart(financialYearId, asOnDate),
    [financialYearId, asOnDate],
  );

  const buildExportMeta = useCallback(
    (exportBasis: StockValuationExportBasis): StockValuationExportMeta => {
      const years = loadFinancialYears();
      const fy =
        financialYearId === "all"
          ? "All years"
          : (years.find((y) => String(y.id) === financialYearId)?.name ?? financialYearId);

      return {
        asOnDate,
        financialYear: fy,
        costRateMethod: DEFAULT_COST_RATE_METHOD,
        warehouse: "All warehouses",
        product: "All products",
        stockStatus:
          STOCK_STATUS_OPTIONS.find((o) => o.value === stockStatus)?.label ?? stockStatus,
        grouping: "Product + Warehouse-wise",
        tab,
        showWarehouse: true,
        exportBasis,
      };
    },
    [asOnDate, financialYearId, stockStatus, tab],
  );

  useEffect(() => {
    setPage(1);
  }, [asOnDate, stockStatus, tab, pageSize, financialYearId]);

  if (!mounted) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
        title="Stock Valuation"
        description="Inventory stock valuation as on date from posted stock movements."
        hideDescription
        className="stock-valuation-compact"
      >
        <div className="p-4 text-sm text-muted-foreground">Loading stock valuation…</div>
      </AccountsPageShell>
    );
  }

  return (
    <AccountsColumnFilterProvider
      key={tab}
      rows={filteredRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="productName"
      defaultSortDir="asc"
    >
      <StockValuationBody
        tab={tab}
        setTab={setTab}
        filteredRows={filteredRows}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        buildExportMeta={buildExportMeta}
        exporting={exporting}
        setExporting={setExporting}
        financialYearId={financialYearId}
        setFinancialYearId={setFinancialYearId}
        asOnDate={asOnDate}
        setAsOnDate={setAsOnDate}
        periodStart={periodStart}
        stockStatus={stockStatus}
        setStockStatus={setStockStatus}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
      />
    </AccountsColumnFilterProvider>
  );
}

function StockValuationBody({
  tab,
  setTab,
  filteredRows,
  hasFilters,
  clearFilters,
  buildExportMeta,
  exporting,
  setExporting,
  financialYearId,
  setFinancialYearId,
  asOnDate,
  setAsOnDate,
  periodStart,
  stockStatus,
  setStockStatus,
  page,
  setPage,
  pageSize,
  setPageSize,
}: {
  tab: StockValuationTab;
  setTab: (t: StockValuationTab) => void;
  filteredRows: StockValuationRow[];
  hasFilters: boolean;
  clearFilters: () => void;
  buildExportMeta: (basis: StockValuationExportBasis) => StockValuationExportMeta;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  financialYearId: string;
  setFinancialYearId: (v: string) => void;
  asOnDate: string;
  setAsOnDate: (v: string) => void;
  periodStart: string;
  stockStatus: StockValuationStatusFilter;
  setStockStatus: (v: StockValuationStatusFilter) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows(filteredRows);
  const totals = useMemo(() => computeStockValuationTotals(columnFilteredRows), [columnFilteredRows]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredRows.slice(start, start + pageSize);
  }, [columnFilteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, setPage]);

  const handleExport = useCallback(
    async (format: "excel" | "pdf", basis: StockValuationExportBasis) => {
      if (columnFilteredRows.length === 0 || exporting) return;

      const allWarehouses = new Set(filteredRows.map((r) => r.warehouse));
      const allProducts = new Set(filteredRows.map((r) => r.productName));
      const viewedWarehouses = [...new Set(columnFilteredRows.map((r) => r.warehouse))];
      const viewedProducts = [...new Set(columnFilteredRows.map((r) => r.productName))];

      const meta: StockValuationExportMeta = {
        ...buildExportMeta(basis),
        warehouse:
          viewedWarehouses.length === allWarehouses.size
            ? "All warehouses"
            : viewedWarehouses.length === 1
              ? viewedWarehouses[0]
              : `${viewedWarehouses.length} selected`,
        product:
          viewedProducts.length === allProducts.size
            ? "All products"
            : viewedProducts.length === 1
              ? viewedProducts[0]
              : `${viewedProducts.length} selected`,
      };

      if (format === "excel") {
        setExporting(true);
        try {
          await exportStockValuationToExcel(columnFilteredRows, meta, totals);
        } finally {
          setExporting(false);
        }
      } else {
        exportStockValuationToPdf(columnFilteredRows, meta, totals);
      }
    },
    [
      columnFilteredRows,
      filteredRows,
      buildExportMeta,
      totals,
      exporting,
      setExporting,
    ],
  );

  const marketCardValue =
    !totals.marketValueAvailable || totals.totalMarketValue == null
      ? "Not Available"
      : formatMoney(totals.totalMarketValue);

  const summaryItems = [
    {
      label: "Total Closing Quantity",
      value: totals.totalClosingQty.toLocaleString("en-IN"),
    },
    { label: "Total Cost Value", value: formatMoney(totals.totalCostValue) },
    { label: "Total Market Value", value: marketCardValue },
    { label: "Final Stock Value", value: formatMoney(totals.totalFinalStockValue) },
  ];

  const drillHref = (row: StockValuationRow) =>
    buildStockLedgerDrillHref({
      productCode: row.productCode,
      warehouse: row.warehouse,
      financialYearId,
      asOnDate,
      periodStart,
    });

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Stock Valuation")}
      title="Stock Valuation"
      description="Inventory stock value as on date."
      hideDescription
      layout="split"
      className="stock-valuation-compact h-full min-h-0"
      filters={
        <ReportFilterRow
          className="items-end gap-x-2 gap-y-2"
          end={
            <>
              <AccountsClearAllColumnFiltersButton />
              <StockValuationExportMenu
                onExport={handleExport}
                disabled={exporting || columnFilteredRows.length === 0}
              />
            </>
          }
        >
          <ReportFinancialYearFilter value={financialYearId} onChange={setFinancialYearId} />
          <ReportAsOnDateFilter value={asOnDate} onChange={setAsOnDate} />
          <ReportStockStatusFilter value={stockStatus} onChange={setStockStatus} />
        </ReportFilterRow>
      }
    >
      {/* Single table card + one scroll region — nested scroll was trapping wheel/touchpad */}
      <AccountsTableListing
        className="h-full min-h-0"
        subheader={
          <SectionTabs
            tabs={TABS}
            active={tab}
            onChange={(id) => setTab(id as StockValuationTab)}
            compact
          />
        }
        summary={<AccountsSummaryBar items={summaryItems} className="!border-b" />}
        footer={
          columnFilteredRows.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={columnFilteredRows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="product lines"
            />
          ) : undefined
        }
      >
        {filteredRows.length === 0 ? (
          <EmptySearch compact onClear={hasFilters ? clearFilters : undefined} />
        ) : columnFilteredRows.length === 0 ? (
          <div className="accounts-table-empty py-6 text-center text-sm text-muted-foreground">
            No records match the column filters.
          </div>
        ) : (
          <AccountsTable minWidth={tab === "detailed" ? 1180 : 980}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortTh label="Product Name" colKey="productName" />
                <SortTh label="Warehouse" colKey="warehouse" />
                {tab === "detailed" ? (
                  <>
                    <SortTh label="Opening Quantity" colKey="openingQty" filterType="amount" align="right" />
                    <SortTh label="Inward Quantity" colKey="inwardQty" filterType="amount" align="right" />
                    <SortTh label="Outward Quantity" colKey="outwardQty" filterType="amount" align="right" />
                  </>
                ) : null}
                <SortTh label="Closing Quantity" colKey="closingQty" filterType="amount" align="right" />
                <SortTh label="Cost Rate" colKey="costRate" filterType="amount" align="right" />
                <SortTh label="Cost Value" colKey="costValue" filterType="amount" align="right" />
                <SortTh label="Market Rate" colKey="marketRate" filterType="amount" align="right" />
                <SortTh label="Market Value" colKey="marketValue" filterType="amount" align="right" />
                <SortTh label="Final Stock Value" colKey="finalStockValue" filterType="amount" align="right" />
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {paginatedRows.map((row) => (
                <AccountsTableRow key={row.id}>
                  <AccountsTableCell className="text-xs font-medium align-middle">
                    <Link
                      href={drillHref(row)}
                      className="text-brand-700 hover:underline"
                    >
                      {row.productName}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs align-middle">
                    {row.warehouse}
                  </AccountsTableCell>
                  {tab === "detailed" ? (
                    <>
                      <AccountsTableCell align="right" className="text-xs tabular-nums align-middle">
                        {formatQtyWithUnit(row.openingQty, row.unit)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" className="text-xs tabular-nums align-middle">
                        {formatQtyWithUnit(row.inwardQty, row.unit)}
                      </AccountsTableCell>
                      <AccountsTableCell align="right" className="text-xs tabular-nums align-middle">
                        {formatQtyWithUnit(row.outwardQty, row.unit)}
                      </AccountsTableCell>
                    </>
                  ) : null}
                  <AccountsTableCell align="right" className="text-xs tabular-nums font-medium align-middle">
                    <Link
                      href={drillHref(row)}
                      className="text-brand-700 hover:underline"
                    >
                      {formatQtyWithUnit(row.closingQty, row.unit)}
                    </Link>
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {row.costRateMissing ? "—" : formatMoney(row.costRate)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {formatCostValue(row)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {formatMoneyOrDash(row.marketRate, row.marketRateMissing)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={cn(MONEY_AMOUNT_CLASS, "align-middle")}>
                    {formatMoneyOrDash(row.marketValue, row.marketRateMissing)}
                  </AccountsTableCell>
                  <AccountsTableCell
                    align="right"
                    money
                    className={cn("font-medium align-middle", MONEY_AMOUNT_CLASS)}
                  >
                    {formatMoney(row.finalStockValue)}
                  </AccountsTableCell>
                </AccountsTableRow>
              ))}
            </AccountsTableBody>
            <AccountsTableFoot>
              <AccountsTableRow>
                <AccountsTableCell
                  colSpan={2}
                  className="font-semibold text-xs text-foreground align-middle"
                >
                  Totals
                </AccountsTableCell>
                {tab === "detailed" ? (
                  <>
                    <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums align-middle">
                      {totals.totalOpeningQty.toLocaleString("en-IN")}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums align-middle">
                      {totals.totalInwardQty.toLocaleString("en-IN")}
                    </AccountsTableCell>
                    <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums align-middle">
                      {totals.totalOutwardQty.toLocaleString("en-IN")}
                    </AccountsTableCell>
                  </>
                ) : null}
                <AccountsTableCell align="right" className="font-semibold text-xs tabular-nums align-middle">
                  {totals.totalClosingQty.toLocaleString("en-IN")}
                </AccountsTableCell>
                <AccountsTableCell />
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(totals.totalCostValue)}
                </AccountsTableCell>
                <AccountsTableCell />
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {!totals.marketValueAvailable || totals.totalMarketValue == null
                    ? "—"
                    : formatMoney(totals.totalMarketValue)}
                </AccountsTableCell>
                <AccountsTableCell align="right" money className={cn("font-semibold align-middle", MONEY_AMOUNT_CLASS)}>
                  {formatMoney(totals.totalFinalStockValue)}
                </AccountsTableCell>
              </AccountsTableRow>
            </AccountsTableFoot>
          </AccountsTable>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

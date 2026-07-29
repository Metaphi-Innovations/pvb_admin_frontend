"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ChevronDown,
  ChevronRight,
  Package,
  Boxes,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import {
  AccountsReportBody,
  AccountsReportKpiCard,
  AccountsReportKpiGrid,
} from "@/components/accounts/AccountsReportLayout";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import {
  AccountsClearAllColumnFiltersButton,
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
import {
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportDateRangeFilter,
  ReportFinancialYearFilter,
  ReportSearchFilter,
  ReportWarehouseMultiFilter,
  ReportProductMultiFilter,
  ReportFilterSummary,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import {
  buildEntityFilterSummary,
  formatMultiSelectLabel,
  type ReportFilterSummaryItem,
} from "@/lib/accounts/report-multi-filter-utils";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { resolveFinancialYearLabel } from "@/lib/accounts/pl-compute";
import type { DateRangePresetId } from "@/lib/accounts/report-date-presets";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import { ensureFinancialYearsCurrent, loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import {
  buildInventoryRegisterReport,
  formatInventoryRegisterDate,
  formatQty,
  getInventoryRegisterCategoryOptions,
  getInventoryRegisterProductOptions,
  getInventoryRegisterWarehouseOptions,
  type InventoryRegisterFilters,
  type InventoryRegisterProductRow,
  type InventoryRegisterTotals,
} from "./inventory-register-data";
import {
  exportInventoryRegisterToExcel,
  exportInventoryRegisterToPdf,
} from "./inventory-register-export";

const PLACEHOLDER_DATE = "2025-04-01";

function defaultFyDateRange(): { from: string; to: string; fyId: string } {
  ensureFinancialYearsCurrent();
  const activeFyId = getActiveFinancialYearId();
  const fy = loadFinancialYears().find((f) => f.id === activeFyId);
  const today = new Date().toISOString().slice(0, 10);
  if (!fy) return { from: PLACEHOLDER_DATE, to: today, fyId: "all" };
  return {
    from: fy.startDate,
    to: today < fy.endDate ? today : fy.endDate,
    fyId: String(fy.id),
  };
}

export default function InventoryRegisterPageClient() {
  const mounted = useClientMounted();
  const router = useRouter();

  const [preset, setPreset] = useState<DateRangePresetId>("custom");
  const [dateFrom, setDateFrom] = useState(PLACEHOLDER_DATE);
  const [dateTo, setDateTo] = useState(PLACEHOLDER_DATE);
  const [datesReady, setDatesReady] = useState(false);
  const [financialYearId, setFinancialYearId] = useState("all");
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const { from, to, fyId } = defaultFyDateRange();
    setDateFrom(from);
    setDateTo(to);
    setFinancialYearId(fyId);
    setDatesReady(true);
  }, []);

  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleFinancialYearChange = useCallback((fyId: string) => {
    setFinancialYearId(fyId);
    if (fyId !== "all") {
      const fy = loadFinancialYears().find((f) => String(f.id) === fyId);
      if (fy) {
        setDateFrom(fy.startDate);
        const today = new Date().toISOString().slice(0, 10);
        setDateTo(today < fy.endDate ? today : fy.endDate);
        setPreset("custom");
      }
    }
  }, []);

  const productOptions = useMemo(
    () =>
      mounted
        ? getInventoryRegisterProductOptions().map((p) => ({
            value: p.id,
            label: p.name,
            searchText: p.code,
          }))
        : [],
    [mounted, refreshKey],
  );
  const warehouseOptions = useMemo(
    () => (mounted ? getInventoryRegisterWarehouseOptions() : []),
    [mounted, refreshKey],
  );
  const categoryOptions = useMemo(
    () => (mounted ? getInventoryRegisterCategoryOptions() : []),
    [mounted, refreshKey],
  );

  const filters = useMemo(
    (): InventoryRegisterFilters => ({
      dateFrom,
      dateTo,
      financialYearId,
      warehouse: warehouses,
      productId: productIds,
      category,
      search,
    }),
    [dateFrom, dateTo, financialYearId, warehouses, productIds, category, search, refreshKey],
  );

  const report = useMemo(() => {
    if (!mounted || !datesReady) {
      return {
        rows: [],
        totals: {
          totalProducts: 0,
          totalOpeningStock: 0,
          totalStockIn: 0,
          totalStockOut: 0,
          totalClosingStock: 0,
        },
        hasData: false,
      };
    }
    return buildInventoryRegisterReport(filters);
  }, [mounted, datesReady, filters]);

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, financialYearId, warehouses, productIds, category, search, pageSize]);

  const hasFilters =
    search.trim() !== "" ||
    warehouses.length > 0 ||
    productIds.length > 0 ||
    category !== "all" ||
    financialYearId !== "all";

  const clearFilters = () => {
    setSearch("");
    setWarehouses([]);
    setProductIds([]);
    setCategory("all");
    const { fyId } = defaultFyDateRange();
    setFinancialYearId(fyId);
  };

  const filterSummaryItems = useMemo((): ReportFilterSummaryItem[] =>
    [
      buildEntityFilterSummary(
        "warehouse",
        "Warehouses",
        warehouses,
        warehouseOptions.map((w) => ({ value: w, label: w })),
        () => setWarehouses([]),
      ),
      buildEntityFilterSummary("product", "Products", productIds, productOptions, () => setProductIds([])),
    ].filter((item): item is ReportFilterSummaryItem => item != null),
  [warehouses, productIds, warehouseOptions, productOptions]);

  const exportMeta = useMemo(() => {
    return {
      dateFrom,
      dateTo,
      financialYear: resolveFinancialYearLabel(financialYearId),
      warehouse: formatMultiSelectLabel(
        warehouses,
        warehouseOptions.map((w) => ({ value: w, label: w })),
        "Warehouse",
        "All",
      ),
      product: formatMultiSelectLabel(productIds, productOptions, "Product", "All"),
      category: category === "all" ? "All" : category,
      search,
    };
  }, [dateFrom, dateTo, financialYearId, warehouses, productIds, productOptions, warehouseOptions, category, search]);

  const getInventoryCellValue = useCallback(
    (row: InventoryRegisterProductRow, key: string) => {
      switch (key) {
        case "productCode":
          return row.productCode;
        case "productName":
          return row.productName;
        case "openingStock":
          return row.openingStock;
        case "stockIn":
          return row.stockIn;
        case "stockOut":
          return row.stockOut;
        case "closingStock":
          return row.closingStock;
        case "unit":
          return row.unit;
        default:
          return "";
      }
    },
    [],
  );

  const toggleExpand = (rowKey: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

  const handleExportExcel = useCallback(async () => {
    if (!report.hasData || exporting) return;
    setExporting(true);
    try {
      await exportInventoryRegisterToExcel(report.rows, exportMeta, report.totals, expandedKeys);
    } finally {
      setExporting(false);
    }
  }, [report, exportMeta, expandedKeys, exporting]);

  const handleExportPdf = useCallback(() => {
    if (!report.hasData || exporting) return;
    exportInventoryRegisterToPdf(report.rows, exportMeta, report.totals, expandedKeys);
  }, [report, exportMeta, expandedKeys, exporting]);

  const { totals } = report;

  return (
    <AccountsColumnFilterProvider
      rows={report.rows}
      getCellValue={getInventoryCellValue}
      defaultSortKey="productName"
      defaultSortDir="asc"
    >
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Inventory Register")}
      title="Inventory Register"
      description="Product-wise stock movement summary with drill-down to transaction-level movements."
      filters={
        <>
          <ReportFilterRow
            end={
              <>
                <AccountsClearAllColumnFiltersButton />
                <AccountsExportMenu
                  onExcel={handleExportExcel}
                  onPdf={handleExportPdf}
                  disabled={exporting || !report.hasData}
                />
              </>
            }
          >
            <ReportFinancialYearFilter value={financialYearId} onChange={handleFinancialYearChange} />
            <ReportDateRangeFilter
              preset={preset}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onPresetChange={setPreset}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
            <ReportWarehouseMultiFilter
              values={warehouses}
              onChange={setWarehouses}
              options={warehouseOptions}
            />
            <ReportProductMultiFilter
              values={productIds}
              onChange={setProductIds}
              products={productOptions}
            />
            <div className="space-y-0.5 min-w-[140px]">
              <Label className={filterLabelClass}>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className={cn(filterControlClass, "mt-0 w-[140px]")}>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    All categories
                  </SelectItem>
                  {categoryOptions.map((c) => (
                    <SelectItem key={c} value={c} className="text-xs">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ReportSearchFilter
              value={search}
              onChange={setSearch}
              placeholder="Product, code, category…"
            />
            {hasFilters && (
              <Button variant="outline" size="sm" className="h-8 text-sm px-2" onClick={clearFilters}>
                Reset
              </Button>
            )}
          </ReportFilterRow>
          <ReportFilterSummary items={filterSummaryItems} />
        </>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsReportBody>
        <AccountsReportKpiGrid>
          <AccountsReportKpiCard label="Total Products" value={totals.totalProducts} icon={Package} accent isCount />
          <AccountsReportKpiCard
            label="Total Opening Stock"
            value={totals.totalOpeningStock}
            icon={Boxes}
            formatValue={(v) => formatQty(v, true)}
          />
          <AccountsReportKpiCard
            label="Total Stock In"
            value={totals.totalStockIn}
            icon={ArrowDownToLine}
            formatValue={(v) => formatQty(v, true)}
          />
          <AccountsReportKpiCard
            label="Total Stock Out"
            value={totals.totalStockOut}
            icon={ArrowUpFromLine}
            formatValue={(v) => formatQty(v, true)}
          />
          <AccountsReportKpiCard
            label="Total Closing Stock"
            value={totals.totalClosingStock}
            icon={Warehouse}
            formatValue={(v) => formatQty(v, true)}
          />
        </AccountsReportKpiGrid>

        <AccountsListingTableCard className="flex-1 min-h-0 flex flex-col">
          {!mounted || !datesReady ? (
            <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
              Loading inventory register…
            </div>
          ) : !report.hasData ? (
            <div className="accounts-table-empty py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No products match the selected filters.
              </p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="block mx-auto mt-1 text-brand-600 hover:underline text-xs"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <InventoryRegisterTableSection
              rows={report.rows}
              page={page}
              pageSize={pageSize}
              expandedKeys={expandedKeys}
              totals={totals}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onToggleExpand={toggleExpand}
              onVoucherClick={(href) => router.push(href)}
            />
          )}
        </AccountsListingTableCard>
      </AccountsReportBody>
    </AccountsPageShell>
    </AccountsColumnFilterProvider>
  );
}

function InventoryRegisterTableSection({
  rows,
  page,
  pageSize,
  expandedKeys,
  totals,
  onPageChange,
  onPageSizeChange,
  onToggleExpand,
  onVoucherClick,
}: {
  rows: InventoryRegisterProductRow[];
  page: number;
  pageSize: number;
  expandedKeys: Set<string>;
  totals: InventoryRegisterTotals;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onToggleExpand: (rowKey: string) => void;
  onVoucherClick: (href: string) => void;
}) {
  const filtered = useAccountsFilteredRows(rows);
  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  return (
    <AccountsTableListing
      footer={
        <AccountsTablePagination
          page={page}
          pageSize={pageSize}
          totalRecords={filtered.length}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
          recordLabel="products"
        />
      }
    >
      <AccountsTableScroll>
        <AccountsTable minWidth={1100}>
          <AccountsTableHead>
            <AccountsTableHeadRow>
              <AccountsColumnHeader label="" colKey="_expand" sortable={false} filterable={false} className="w-8" />
              <SortTh label="Product Code" colKey="productCode" />
              <SortTh label="Product Name" colKey="productName" />
              <SortTh label="Opening Stock" colKey="openingStock" filterType="number" align="right" />
              <SortTh label="Stock In" colKey="stockIn" filterType="number" align="right" />
              <SortTh label="Stock Out" colKey="stockOut" filterType="number" align="right" />
              <SortTh label="Closing Stock" colKey="closingStock" filterType="number" align="right" />
              <SortTh label="Unit" colKey="unit" filterType="select" />
              <AccountsColumnHeader label="Action" colKey="_actions" sortable={false} filterable={false} className="w-24" />
            </AccountsTableHeadRow>
          </AccountsTableHead>
          <AccountsTableBody>
            {paginated.length === 0 ? (
              <AccountsTableRow>
                <AccountsTableCell colSpan={9} className="accounts-table-empty">
                  No products match the column filters.
                </AccountsTableCell>
              </AccountsTableRow>
            ) : (
              paginated.map((row) => (
                <ProductSummaryRows
                  key={row.rowKey}
                  row={row}
                  isExpanded={expandedKeys.has(row.rowKey)}
                  onToggle={() => onToggleExpand(row.rowKey)}
                  onVoucherClick={onVoucherClick}
                />
              ))
            )}
          </AccountsTableBody>
          <AccountsTableFoot>
            <AccountsTableRow>
              <AccountsTableCell colSpan={3} className="font-semibold text-xs text-foreground">
                Totals ({filtered.length} products)
              </AccountsTableCell>
              <AccountsTableCell align="right" className="font-semibold tabular-nums text-xs">
                {formatQty(totals.totalOpeningStock, true)}
              </AccountsTableCell>
              <AccountsTableCell align="right" className="font-semibold tabular-nums text-xs">
                {formatQty(totals.totalStockIn, true)}
              </AccountsTableCell>
              <AccountsTableCell align="right" className="font-semibold tabular-nums text-xs">
                {formatQty(totals.totalStockOut, true)}
              </AccountsTableCell>
              <AccountsTableCell align="right" className="font-semibold tabular-nums text-xs">
                {formatQty(totals.totalClosingStock, true)}
              </AccountsTableCell>
              <AccountsTableCell colSpan={2} />
            </AccountsTableRow>
          </AccountsTableFoot>
        </AccountsTable>
      </AccountsTableScroll>
    </AccountsTableListing>
  );
}

function ProductSummaryRows({
  row,
  isExpanded,
  onToggle,
  onVoucherClick,
}: {
  row: InventoryRegisterProductRow;
  isExpanded: boolean;
  onToggle: () => void;
  onVoucherClick: (href: string) => void;
}) {
  return (
    <Fragment>
      <AccountsTableRow className="group">
        <AccountsTableCell className="w-8 px-2">
          <button
            type="button"
            onClick={onToggle}
            className="p-0.5 hover:bg-muted rounded"
            aria-expanded={isExpanded}
            aria-label={isExpanded ? "Collapse movements" : "Expand movements"}
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </button>
        </AccountsTableCell>
        <AccountsTableCell mono className="text-xs font-semibold text-brand-700">
          {row.productCode}
        </AccountsTableCell>
        <AccountsTableCell className="text-xs font-medium">{row.productName}</AccountsTableCell>
        <AccountsTableCell align="right" className="tabular-nums text-xs">
          {formatQty(row.openingStock, true)}
        </AccountsTableCell>
        <AccountsTableCell align="right" className="tabular-nums text-xs">
          {formatQty(row.stockIn, true)}
        </AccountsTableCell>
        <AccountsTableCell align="right" className="tabular-nums text-xs">
          {formatQty(row.stockOut, true)}
        </AccountsTableCell>
        <AccountsTableCell align="right" className="tabular-nums text-xs font-medium">
          {formatQty(row.closingStock, true)}
        </AccountsTableCell>
        <AccountsTableCell className="text-xs">{row.unit}</AccountsTableCell>
        <AccountsTableCell>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs px-2"
            onClick={onToggle}
          >
            {isExpanded ? "Hide" : "View"}
          </Button>
        </AccountsTableCell>
      </AccountsTableRow>

      {isExpanded && (
        <AccountsTableRow className="bg-muted/20 hover:bg-muted/20">
          <AccountsTableCell colSpan={9} className="p-0">
            <div className="px-4 py-3 border-t border-border/60">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Stock Movements — {row.productName}
              </p>
              {row.movements.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  No stock movements in the selected period.
                  {row.openingStock !== 0 && (
                    <span> Opening stock: {formatQty(row.openingStock, true)} {row.unit}</span>
                  )}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border bg-white">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="px-3 py-2 text-left text-xs font-semibold">Date</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Transaction Type</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Voucher No.</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Reference No.</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Party Name</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold">Warehouse</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold">Stock In</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold">Stock Out</th>
                        <th className="px-3 py-2 text-right text-xs font-semibold">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.movements.map((m) => (
                        <tr key={m.id} className="border-b border-border/60 hover:bg-muted/20">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {formatInventoryRegisterDate(m.date)}
                          </td>
                          <td className="px-3 py-2">{m.transactionTypeLabel}</td>
                          <td className="px-3 py-2 font-mono text-brand-700 font-semibold">
                            {m.viewHref ? (
                              <button
                                type="button"
                                onClick={() => onVoucherClick(m.viewHref!)}
                                className="hover:underline text-left"
                              >
                                {m.voucherNo}
                              </button>
                            ) : (
                              m.voucherNo
                            )}
                          </td>
                          <td className="px-3 py-2">{m.referenceNo}</td>
                          <td className="px-3 py-2">{m.partyName}</td>
                          <td className="px-3 py-2">{m.warehouse}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatQty(m.stockIn)}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{formatQty(m.stockOut)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">
                            {formatQty(m.runningBalance, true)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </AccountsTableCell>
        </AccountsTableRow>
      )}
    </Fragment>
  );
}

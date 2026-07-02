"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SortTh } from "@/app/(app)/accounts/components/AccountsUI";
import { AccountsExportMenu } from "@/components/accounts/AccountsExportMenu";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableFoot,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
} from "@/components/accounts/AccountsTable";
import {
  AccountsTableListing,
  AccountsTablePagination,
} from "@/components/accounts/AccountsTableListing";
import {
  ReportFilterRow,
  ReportFinancialYearFilter,
  ReportFromToDateFilter,
  ReportSearchFilter,
} from "@/components/accounts/ReportFilters";
import { EmptySearch } from "@/components/ui/EmptyState";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { getActiveFinancialYearId } from "@/lib/accounts/day-book-data";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { useClientMounted } from "@/lib/use-client-mounted";
import { cn } from "@/lib/utils";
import {
  buildInventoryRegisterRows,
  computeInventoryRegisterTotals,
  filterInventoryRegisterRows,
  formatInventoryRegisterDate,
  formatQty,
  INVENTORY_REGISTER_BATCH_OPTIONS,
  INVENTORY_REGISTER_CATEGORY_OPTIONS,
  INVENTORY_REGISTER_PRODUCT_OPTIONS,
  INVENTORY_REGISTER_WAREHOUSE_OPTIONS,
  INVENTORY_TRANSACTION_TYPE_LABELS,
  INVENTORY_TRANSACTION_TYPE_OPTIONS,
  sortInventoryRegisterRows,
  type InventoryRegisterSortKey,
} from "./inventory-register-data";
import {
  exportInventoryRegisterToExcel,
  exportInventoryRegisterToPdf,
} from "./inventory-register-export";

const filterLabelClass = "text-[10px] font-medium uppercase text-muted-foreground leading-none";
const filterControlClass = "h-7 text-xs mt-0";

export default function InventoryRegisterPageClient() {
  const mounted = useClientMounted();

  const [dateFrom, setDateFrom] = useState("2025-04-01");
  const [dateTo, setDateTo] = useState("2026-03-31");
  const [financialYearId, setFinancialYearId] = useState("all");
  const [warehouse, setWarehouse] = useState("all");
  const [productId, setProductId] = useState("all");
  const [category, setCategory] = useState("all");
  const [batchNo, setBatchNo] = useState("all");
  const [transactionType, setTransactionType] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<InventoryRegisterSortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const activeFyId = getActiveFinancialYearId();
    if (activeFyId) setFinancialYearId(String(activeFyId));
  }, []);

  const sourceRows = useMemo(() => (mounted ? buildInventoryRegisterRows() : []), [mounted]);

  const filterParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYearId,
      warehouse,
      productId,
      category,
      batchNo,
      transactionType,
      search,
    }),
    [
      dateFrom,
      dateTo,
      financialYearId,
      warehouse,
      productId,
      category,
      batchNo,
      transactionType,
      search,
    ],
  );

  const filteredRows = useMemo(
    () => filterInventoryRegisterRows(sourceRows, filterParams),
    [sourceRows, filterParams],
  );

  const sortedRows = useMemo(
    () => sortInventoryRegisterRows(filteredRows, sortKey, sortDir),
    [filteredRows, sortKey, sortDir],
  );

  const totals = useMemo(() => computeInventoryRegisterTotals(filteredRows), [filteredRows]);

  useEffect(() => {
    setPage(1);
  }, [
    dateFrom,
    dateTo,
    financialYearId,
    warehouse,
    productId,
    category,
    batchNo,
    transactionType,
    search,
    sortKey,
    sortDir,
    pageSize,
  ]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedRows.slice(start, start + pageSize);
  }, [sortedRows, page, pageSize]);

  const hasFilters =
    search.trim() !== "" ||
    warehouse !== "all" ||
    productId !== "all" ||
    category !== "all" ||
    batchNo !== "all" ||
    transactionType !== "all" ||
    financialYearId !== "all";

  const clearFilters = () => {
    setSearch("");
    setWarehouse("all");
    setProductId("all");
    setCategory("all");
    setBatchNo("all");
    setTransactionType("all");
    const activeFyId = getActiveFinancialYearId();
    setFinancialYearId(activeFyId ? String(activeFyId) : "all");
  };

  const handleSort = useCallback((key: string) => {
    const k = key as InventoryRegisterSortKey;
    setSortKey((prev) => {
      if (prev === k) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return k;
    });
  }, []);

  const exportMeta = useMemo(() => {
    const years = loadFinancialYears();
    const fy =
      financialYearId === "all"
        ? "All years"
        : (years.find((y) => String(y.id) === financialYearId)?.name ?? financialYearId);
    const product =
      productId === "all"
        ? "All"
        : (INVENTORY_REGISTER_PRODUCT_OPTIONS.find((p) => p.id === productId)?.name ?? productId);
    const txnLabel =
      INVENTORY_TRANSACTION_TYPE_OPTIONS.find((o) => o.value === transactionType)?.label ??
      transactionType;

    return {
      dateFrom,
      dateTo,
      financialYear: fy,
      warehouse: warehouse === "all" ? "All" : warehouse,
      product,
      category: category === "all" ? "All" : category,
      batchNo: batchNo === "all" ? "All" : batchNo,
      transactionType: txnLabel,
      search,
    };
  }, [
    dateFrom,
    dateTo,
    financialYearId,
    warehouse,
    productId,
    category,
    batchNo,
    transactionType,
    search,
  ]);

  const handleExportExcel = useCallback(async () => {
    if (filteredRows.length === 0 || exporting) return;
    setExporting(true);
    try {
      await exportInventoryRegisterToExcel(filteredRows, exportMeta, totals);
    } finally {
      setExporting(false);
    }
  }, [filteredRows, exportMeta, totals, exporting]);

  const handleExportPdf = useCallback(() => {
    if (filteredRows.length === 0 || exporting) return;
    exportInventoryRegisterToPdf(filteredRows, exportMeta, totals);
  }, [filteredRows, exportMeta, totals, exporting]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Inventory Register")}
      title="Inventory Register"
      description="Read-only stock movement register with running balance by product, batch, and warehouse."
      actions={
        <AccountsExportMenu
          onExcel={handleExportExcel}
          onPdf={handleExportPdf}
          disabled={exporting || filteredRows.length === 0}
        />
      }
      filters={
        <ReportFilterRow>
          <ReportFinancialYearFilter value={financialYearId} onChange={setFinancialYearId} />
          <ReportFromToDateFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
          />
          <div className="space-y-1 min-w-[150px]">
            <Label className={filterLabelClass}>Warehouse</Label>
            <Select value={warehouse} onValueChange={setWarehouse}>
              <SelectTrigger className={cn(filterControlClass, "w-[150px]")}>
                <SelectValue placeholder="All warehouses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All warehouses</SelectItem>
                {INVENTORY_REGISTER_WAREHOUSE_OPTIONS.map((w) => (
                  <SelectItem key={w} value={w}>
                    {w}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[160px]">
            <Label className={filterLabelClass}>Product</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className={cn(filterControlClass, "w-[160px]")}>
                <SelectValue placeholder="All products" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All products</SelectItem>
                {INVENTORY_REGISTER_PRODUCT_OPTIONS.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[130px]">
            <Label className={filterLabelClass}>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className={cn(filterControlClass, "w-[130px]")}>
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {INVENTORY_REGISTER_CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[130px]">
            <Label className={filterLabelClass}>Batch No.</Label>
            <Select value={batchNo} onValueChange={setBatchNo}>
              <SelectTrigger className={cn(filterControlClass, "w-[130px]")}>
                <SelectValue placeholder="All batches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All batches</SelectItem>
                {INVENTORY_REGISTER_BATCH_OPTIONS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 min-w-[150px]">
            <Label className={filterLabelClass}>Transaction Type</Label>
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger className={cn(filterControlClass, "w-[150px]")}>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                {INVENTORY_TRANSACTION_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <ReportSearchFilter
            value={search}
            onChange={setSearch}
            placeholder="Product, SKU, batch, warehouse…"
          />
        </ReportFilterRow>
      }
      layout="split"
      className="h-full min-h-0"
    >
      <AccountsTableListing
        footer={
          filteredRows.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={filteredRows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="movements"
            />
          ) : undefined
        }
      >
        {filteredRows.length === 0 ? (
          <EmptySearch compact onClear={hasFilters ? clearFilters : undefined} />
        ) : (
          <AccountsTable minWidth={1280}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortTh
                  label="Date"
                  colKey="date"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortTh
                  label="Transaction Type"
                  colKey="transactionType"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <AccountsTableHeadCell>Document No.</AccountsTableHeadCell>
                <SortTh
                  label="Product"
                  colKey="productName"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <AccountsTableHeadCell>SKU</AccountsTableHeadCell>
                <AccountsTableHeadCell>Batch No.</AccountsTableHeadCell>
                <SortTh
                  label="Warehouse"
                  colKey="warehouse"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                />
                <SortTh
                  label="In Qty"
                  colKey="inQty"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <SortTh
                  label="Out Qty"
                  colKey="outQty"
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSort={handleSort}
                  align="right"
                />
                <AccountsTableHeadCell align="right">Balance Qty</AccountsTableHeadCell>
                <AccountsTableHeadCell>UOM</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right">Cost Price</AccountsTableHeadCell>
                <AccountsTableHeadCell align="right">Stock Value</AccountsTableHeadCell>
              </AccountsTableHeadRow>
            </AccountsTableHead>
            <AccountsTableBody>
              {paginatedRows.map((row) => (
                <AccountsTableRow key={row.id}>
                  <AccountsTableCell className="text-xs whitespace-nowrap">
                    {formatInventoryRegisterDate(row.date)}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">
                    {INVENTORY_TRANSACTION_TYPE_LABELS[row.transactionType]}
                  </AccountsTableCell>
                  <AccountsTableCell mono className="text-brand-700 font-semibold text-xs">
                    {row.documentNo}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs font-medium">{row.productName}</AccountsTableCell>
                  <AccountsTableCell mono className="text-xs">
                    {row.sku}
                  </AccountsTableCell>
                  <AccountsTableCell mono className="text-xs">
                    {row.batchNo}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">{row.warehouse}</AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums text-xs">
                    {formatQty(row.inQty)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums text-xs">
                    {formatQty(row.outQty)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" className="tabular-nums text-xs font-medium">
                    {formatQty(row.balanceQty)}
                  </AccountsTableCell>
                  <AccountsTableCell className="text-xs">{row.uom}</AccountsTableCell>
                  <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                    {formatMoney(row.costPrice)}
                  </AccountsTableCell>
                  <AccountsTableCell align="right" money className={MONEY_AMOUNT_CLASS}>
                    {formatMoney(row.stockValue)}
                  </AccountsTableCell>
                </AccountsTableRow>
              ))}
            </AccountsTableBody>
            <AccountsTableFoot>
              <AccountsTableRow>
                <AccountsTableCell colSpan={7} className="font-semibold text-[11px] text-foreground">
                  Totals
                </AccountsTableCell>
                <AccountsTableCell align="right" className="font-semibold tabular-nums text-xs">
                  {formatQty(totals.totalInQty, true)}
                </AccountsTableCell>
                <AccountsTableCell align="right" className="font-semibold tabular-nums text-xs">
                  {formatQty(totals.totalOutQty, true)}
                </AccountsTableCell>
                <AccountsTableCell colSpan={4} />
              </AccountsTableRow>
            </AccountsTableFoot>
          </AccountsTable>
        )}
      </AccountsTableListing>
    </AccountsPageShell>
  );
}

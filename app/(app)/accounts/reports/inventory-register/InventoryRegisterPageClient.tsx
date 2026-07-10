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
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  useAccountsColumnFilterContext,
  useAccountsFilteredRows,
} from "@/app/(app)/accounts/components/AccountsUI";
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
  ReportDateRangeFilter,
  ReportSearchFilter,
  useReportDateRange,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
} from "@/components/accounts/ReportFilters";
import { EmptySearch } from "@/components/ui/EmptyState";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { formatMoney, MONEY_AMOUNT_CLASS } from "@/lib/accounts/money-format";
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
  type InventoryRegisterRow,
} from "./inventory-register-data";
import {
  exportInventoryRegisterToExcel,
  exportInventoryRegisterToPdf,
} from "./inventory-register-export";

export default function InventoryRegisterPageClient() {
  const mounted = useClientMounted();

  const { preset, setPreset, dateFrom, setDateFrom, dateTo, setDateTo } = useReportDateRange("this_year");
  const [warehouse, setWarehouse] = useState("all");
  const [productId, setProductId] = useState("all");
  const [category, setCategory] = useState("all");
  const [batchNo, setBatchNo] = useState("all");
  const [transactionType, setTransactionType] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [exporting, setExporting] = useState(false);


  const sourceRows = useMemo(() => (mounted ? buildInventoryRegisterRows() : []), [mounted]);

  const filterParams = useMemo(
    () => ({
      dateFrom,
      dateTo,
      financialYearId: "all",
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

  const getCellValue = useCallback(
    (row: InventoryRegisterRow, key: string) => {
      if (key === "transactionType") return INVENTORY_TRANSACTION_TYPE_LABELS[row.transactionType];
      return (row as unknown as Record<string, unknown>)[key];
    },
    [],
  );

  const columnConfig = useMemo(
    () => ({
      date: { type: "date" as const },
      transactionType: { type: "text" as const },
      documentNo: { type: "text" as const },
      productName: { type: "text" as const },
      sku: { type: "text" as const },
      batchNo: { type: "text" as const },
      warehouse: { type: "text" as const },
      inQty: { type: "amount" as const },
      outQty: { type: "amount" as const },
      balanceQty: { type: "amount" as const },
      costPrice: { type: "amount" as const },
      stockValue: { type: "amount" as const },
    }),
    [],
  );

  const hasFilters =
    search.trim() !== "" ||
    warehouse !== "all" ||
    productId !== "all" ||
    category !== "all" ||
    batchNo !== "all" ||
    transactionType !== "all";

  const clearFilters = () => {
    setSearch("");
    setWarehouse("all");
    setProductId("all");
    setCategory("all");
    setBatchNo("all");
    setTransactionType("all");
  };

  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, warehouse, productId, category, batchNo, transactionType, search, pageSize]);

  const exportMeta = useMemo(() => {
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
      financialYear: "",
      warehouse: warehouse === "all" ? "All" : warehouse,
      product,
      category: category === "all" ? "All" : category,
      batchNo: batchNo === "all" ? "All" : batchNo,
      transactionType: txnLabel,
      search,
    };
  }, [dateFrom, dateTo, warehouse, productId, category, batchNo, transactionType, search]);

  return (
    <AccountsColumnFilterProvider
      rows={filteredRows}
      getCellValue={getCellValue}
      columnConfig={columnConfig}
      defaultSortKey="date"
      defaultSortDir="asc"
    >
      <InventoryRegisterBody
        filteredRows={filteredRows}
        filterParams={filterParams}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        preset={preset}
        setPreset={setPreset}
        dateFrom={dateFrom}
        setDateFrom={setDateFrom}
        dateTo={dateTo}
        setDateTo={setDateTo}
        warehouse={warehouse}
        setWarehouse={setWarehouse}
        productId={productId}
        setProductId={setProductId}
        category={category}
        setCategory={setCategory}
        batchNo={batchNo}
        setBatchNo={setBatchNo}
        transactionType={transactionType}
        setTransactionType={setTransactionType}
        search={search}
        setSearch={setSearch}
        page={page}
        setPage={setPage}
        pageSize={pageSize}
        setPageSize={setPageSize}
        exporting={exporting}
        setExporting={setExporting}
        exportMeta={exportMeta}
      />
    </AccountsColumnFilterProvider>
  );
}

function InventoryRegisterBody({
  filteredRows,
  hasFilters,
  clearFilters,
  preset,
  setPreset,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  warehouse,
  setWarehouse,
  productId,
  setProductId,
  category,
  setCategory,
  batchNo,
  setBatchNo,
  transactionType,
  setTransactionType,
  search,
  setSearch,
  page,
  setPage,
  pageSize,
  setPageSize,
  exporting,
  setExporting,
  exportMeta,
}: {
  filteredRows: InventoryRegisterRow[];
  filterParams: Record<string, string>;
  hasFilters: boolean;
  clearFilters: () => void;
  preset: ReturnType<typeof useReportDateRange>["preset"];
  setPreset: ReturnType<typeof useReportDateRange>["setPreset"];
  dateFrom: string;
  setDateFrom: (v: string) => void;
  dateTo: string;
  setDateTo: (v: string) => void;
  warehouse: string;
  setWarehouse: (v: string) => void;
  productId: string;
  setProductId: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  batchNo: string;
  setBatchNo: (v: string) => void;
  transactionType: string;
  setTransactionType: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
  exporting: boolean;
  setExporting: (v: boolean) => void;
  exportMeta: Parameters<typeof exportInventoryRegisterToExcel>[1];
}) {
  const ctx = useAccountsColumnFilterContext();
  const columnFilteredRows = useAccountsFilteredRows(filteredRows);
  const totals = useMemo(() => computeInventoryRegisterTotals(columnFilteredRows), [columnFilteredRows]);

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return columnFilteredRows.slice(start, start + pageSize);
  }, [columnFilteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [ctx?.columnFilters, ctx?.sortKey, ctx?.sortDir, setPage]);

  const handleExportExcel = useCallback(async () => {
    if (columnFilteredRows.length === 0 || exporting) return;
    setExporting(true);
    try {
      await exportInventoryRegisterToExcel(columnFilteredRows, exportMeta, totals);
    } finally {
      setExporting(false);
    }
  }, [columnFilteredRows, exportMeta, totals, exporting, setExporting]);

  const handleExportPdf = useCallback(() => {
    if (columnFilteredRows.length === 0 || exporting) return;
    exportInventoryRegisterToPdf(columnFilteredRows, exportMeta, totals);
  }, [columnFilteredRows, exportMeta, totals, exporting]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Reports", "Inventory Register")}
      title="Inventory Register"
      description="Read-only stock movement register with running balance by product, batch, and warehouse."
      filters={
        <ReportFilterRow
          end={
            <AccountsExportMenu
              onExcel={handleExportExcel}
              onPdf={handleExportPdf}
              disabled={exporting || columnFilteredRows.length === 0}
            />
          }
        >
          <ReportDateRangeFilter
            preset={preset}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onPresetChange={setPreset}
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
          columnFilteredRows.length > 0 ? (
            <AccountsTablePagination
              page={page}
              pageSize={pageSize}
              totalRecords={columnFilteredRows.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              recordLabel="movements"
            />
          ) : undefined
        }
      >
        {filteredRows.length === 0 ? (
          <EmptySearch compact onClear={hasFilters ? clearFilters : undefined} />
        ) : columnFilteredRows.length === 0 ? (
          <div className="accounts-table-empty py-8 text-center text-sm text-muted-foreground">
            No records match the column filters.
          </div>
        ) : (
          <AccountsTable minWidth={1280}>
            <AccountsTableHead>
              <AccountsTableHeadRow>
                <SortTh label="Date" colKey="date" filterType="date" />
                <SortTh label="Transaction Type" colKey="transactionType" />
                <SortTh label="Document No." colKey="documentNo" />
                <SortTh label="Product" colKey="productName" />
                <SortTh label="SKU" colKey="sku" />
                <SortTh label="Batch No." colKey="batchNo" />
                <SortTh label="Warehouse" colKey="warehouse" />
                <SortTh label="In Qty" colKey="inQty" filterType="amount" align="right" />
                <SortTh label="Out Qty" colKey="outQty" filterType="amount" align="right" />
                <SortTh label="Balance Qty" colKey="balanceQty" filterType="amount" align="right" />
                <AccountsColumnHeader label="UOM" colKey="uom" sortable={false} />
                <SortTh label="Cost Price" colKey="costPrice" filterType="amount" align="right" />
                <SortTh label="Stock Value" colKey="stockValue" filterType="amount" align="right" />
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
                <AccountsTableCell colSpan={7} className="font-semibold text-xs text-foreground">
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

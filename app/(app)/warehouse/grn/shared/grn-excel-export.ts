import type { FilterState, SortState } from "@/components/listing/types";
import {
  getGrnTabApiContext,
  getStockTransferReceivedApiContext,
  type GrnTabApiContext,
} from "@/lib/warehouse/grn-list-config";
import { getStockTransferGrnDisplayStatus } from "@/lib/warehouse/grn-source";
import { getGrnStatusLabel } from "@/lib/warehouse/grn-status";
import { exportRowsToExcel } from "@/lib/warehouse/export-excel";
import {
  buildGrnApiFilters,
  buildGrnOrdering,
  GrnListService,
  type GrnListItem,
} from "@/services/grn-list.service";
import {
  fetchPendingStockTransferDispatches,
  type PendingStockTransferDispatchRow,
} from "../stock-transfer/stock-transfer-grn-utils";

const EXPORT_PAGE_SIZE = 100;

export async function fetchAllGrnListItems(opts: {
  tabContext: GrnTabApiContext;
  filters: FilterState;
  sort: SortState;
  destinationWarehouse?: string;
}): Promise<GrnListItem[]> {
  const apiFilters = buildGrnApiFilters(
    opts.filters,
    opts.tabContext,
    opts.destinationWarehouse,
  );
  const ordering = buildGrnOrdering(opts.sort.key, opts.sort.direction);
  const search = String(opts.filters.search || "").trim();

  const first = await GrnListService.list({
    page: 1,
    pageSize: EXPORT_PAGE_SIZE,
    search,
    ordering,
    tabContext: opts.tabContext,
    apiFilters,
  });

  const all = [...first.items];
  const totalPages = Math.max(1, Math.ceil(first.total / EXPORT_PAGE_SIZE));
  for (let page = 2; page <= totalPages; page++) {
    const next = await GrnListService.list({
      page,
      pageSize: EXPORT_PAGE_SIZE,
      search,
      ordering,
      tabContext: opts.tabContext,
      apiFilters,
    });
    all.push(...next.items);
  }
  return all;
}

export async function fetchAllPendingStockTransferDispatches(opts: {
  filters: FilterState;
  sort: SortState;
}): Promise<PendingStockTransferDispatchRow[]> {
  let ordering: string | undefined;
  if (opts.sort.key && opts.sort.direction !== "none") {
    const fieldMap: Record<string, string> = {
      stockTransferNo: "transfer_no",
      dispatchNumber: "dispatch_number",
      dispatchDate: "dispatch_date",
      fromWarehouse: "from_warehouse",
      toWarehouse: "to_warehouse",
      status: "status",
      itemCount: "item_count",
      dispatchedQty: "dispatched_qty",
    };
    const backendKey = fieldMap[opts.sort.key] || opts.sort.key;
    ordering = opts.sort.direction === "desc" ? `-${backendKey}` : backendKey;
  }

  const search = String(opts.filters.search || "").trim() || undefined;
  const first = await fetchPendingStockTransferDispatches({
    page: 1,
    pageSize: EXPORT_PAGE_SIZE,
    search,
    ordering,
    filters: opts.filters as Record<string, unknown>,
  });

  const all = [...first.items];
  const totalPages = Math.max(1, Math.ceil(first.total / EXPORT_PAGE_SIZE));
  for (let page = 2; page <= totalPages; page++) {
    const next = await fetchPendingStockTransferDispatches({
      page,
      pageSize: EXPORT_PAGE_SIZE,
      search,
      ordering,
      filters: opts.filters as Record<string, unknown>,
    });
    all.push(...next.items);
  }
  return all;
}

export function mapPurchaseGrnExcelRow(row: GrnListItem) {
  return {
    "GRN No": row.grnNo || "",
    "GRN Date": row.grnDate || "",
    "PO No.": row.poNumber || "",
    "Supplier Invoice No.": row.invoiceNumber || "",
    Supplier: row.vendorName || "",
    Warehouse: row.warehouse || "",
    Items: row.itemCount ?? row.totalProducts ?? 0,
    Status: getGrnStatusLabel(row.status),
  };
}

export function mapSalesReturnGrnExcelRow(row: GrnListItem) {
  return {
    "GRN No.": row.grnNo || "",
    "Sales Return No.": row.salesReturnNo || row.poNumber || "",
    Customer: row.vendorName || "",
    Warehouse: row.warehouse || "",
    "GRN Date": row.grnDate || "",
    Items: row.itemCount ?? row.totalProducts ?? 0,
    Status: getGrnStatusLabel(row.status),
  };
}

export function mapSampleReturnGrnExcelRow(row: GrnListItem) {
  return {
    "GRN No.": row.grnNo || "",
    "Sample Return No.": row.sampleReturnNo || row.poNumber || "",
    Customer: row.vendorName || "",
    Warehouse: row.warehouse || "",
    "GRN Date": row.grnDate || "",
    Items: row.itemCount ?? row.totalProducts ?? 0,
    Status: getGrnStatusLabel(row.status),
  };
}

export function mapStockTransferPendingExcelRow(row: PendingStockTransferDispatchRow) {
  return {
    "Stock Transfer No.": row.stockTransferNo || "",
    "Dispatch No.": row.dispatchNumber || "",
    "From Warehouse": row.fromWarehouse || "",
    "To Warehouse": row.toWarehouse || "",
    "Dispatch Date": row.dispatchDate || "",
    Items: row.itemCount ?? 0,
    "Dispatched Qty": row.dispatchedQty ?? 0,
    Status: row.status || "",
  };
}

export function mapStockTransferReceivedExcelRow(row: GrnListItem) {
  return {
    "Stock Transfer No.": row.stockTransferNo || row.grnNo || "",
    "From Warehouse": row.fromWarehouse ?? row.vendorName ?? "",
    "To Warehouse": row.toWarehouse ?? row.warehouse ?? "",
    "Received Date": row.dispatchDate ?? row.grnDate ?? "",
    Items: row.itemCount || row.totalProducts || 0,
    Status: getStockTransferGrnDisplayStatus({
      isPendingTransfer: false,
      grnStatus: row.status,
    }),
  };
}

export async function exportPurchaseGrnExcel(opts: {
  filters: FilterState;
  sort: SortState;
}): Promise<void> {
  const items = await fetchAllGrnListItems({
    tabContext: getGrnTabApiContext("purchase"),
    filters: opts.filters,
    sort: opts.sort,
  });
  await exportRowsToExcel(items.map(mapPurchaseGrnExcelRow), {
    sheetName: "Purchase GRN",
    filePrefix: "GRN_Purchase",
  });
}

export async function exportSalesReturnGrnExcel(opts: {
  filters: FilterState;
  sort: SortState;
}): Promise<void> {
  const items = await fetchAllGrnListItems({
    tabContext: getGrnTabApiContext("sales_return"),
    filters: opts.filters,
    sort: opts.sort,
  });
  await exportRowsToExcel(items.map(mapSalesReturnGrnExcelRow), {
    sheetName: "Sales Return GRN",
    filePrefix: "GRN_Sales_Return",
  });
}

export async function exportSampleReturnGrnExcel(opts: {
  filters: FilterState;
  sort: SortState;
}): Promise<void> {
  const items = await fetchAllGrnListItems({
    tabContext: getGrnTabApiContext("sample_return"),
    filters: opts.filters,
    sort: opts.sort,
  });
  await exportRowsToExcel(items.map(mapSampleReturnGrnExcelRow), {
    sheetName: "Sample Return GRN",
    filePrefix: "GRN_Sample_Return",
  });
}

export async function exportStockTransferPendingExcel(opts: {
  filters: FilterState;
  sort: SortState;
}): Promise<void> {
  const items = await fetchAllPendingStockTransferDispatches(opts);
  await exportRowsToExcel(items.map(mapStockTransferPendingExcelRow), {
    sheetName: "ST Pending",
    filePrefix: "GRN_Stock_Transfer_Pending",
  });
}

export async function exportStockTransferReceivedExcel(opts: {
  filters: FilterState;
  sort: SortState;
}): Promise<void> {
  const items = await fetchAllGrnListItems({
    tabContext: getStockTransferReceivedApiContext(),
    filters: opts.filters,
    sort: opts.sort,
  });
  await exportRowsToExcel(items.map(mapStockTransferReceivedExcelRow), {
    sheetName: "ST Received",
    filePrefix: "GRN_Stock_Transfer_Received",
  });
}

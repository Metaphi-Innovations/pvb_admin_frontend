import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { getDispatchById, getDispatches, getDispatchFilterDropdown } from "@/app/(app)/warehouse/dispatch/services";
import { GrnListService } from "@/services/grn-list.service";
import { StockTransferService } from "@/services/stock-transfer.service";
import { getGrnTabApiContext } from "@/lib/warehouse/grn-list-config";
import {
  normalizeGrnQuantityType,
  type GrnQuantityType,
} from "@/lib/warehouse/grn-quantity";

/** Pending ST GRN eligible dispatches use DELIVERY_DONE (distinct from DISPATCHED). */
export const ST_DISPATCH_ELIGIBLE_STATUS = "DELIVERED";
export const ST_DISPATCH_SOURCE_TYPE = "stock_transfer";

export interface PackingCustomerSnapshot {
  from_warehouse?: string;
  to_warehouse?: string;
  customer_id?: string;
  customer_name?: string;
  [key: string]: unknown;
}

export interface PendingStockTransferDispatchRow {
  id: string;
  rowType: "pending_dispatch";
  dispatchId: string;
  dispatchNumber: string;
  stockTransferId: string;
  stockTransferNo: string;
  fromWarehouse: string;
  toWarehouse: string;
  dispatchDate: string;
  products: string;
  dispatchedQty: number;
  status: string;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asDateOnly(value: unknown): string {
  const raw = asString(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

export function getCustomerSnapshot(packingDone: unknown): PackingCustomerSnapshot {
  if (!packingDone || typeof packingDone !== "object") return {};
  const raw = packingDone as Record<string, unknown>;
  const snapshot = raw.customer_snapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return {};
  return snapshot as PackingCustomerSnapshot;
}

export function normalizeWarehouseName(name: string): string {
  return name.trim().toLowerCase();
}

export function matchesDestinationWarehouse(
  snapshot: PackingCustomerSnapshot,
  selectedWarehouseName: string | null | undefined,
): boolean {
  if (!selectedWarehouseName || selectedWarehouseName === "All") return true;
  const toWarehouse = asString(snapshot.to_warehouse);
  if (!toWarehouse) return false;
  return normalizeWarehouseName(toWarehouse) === normalizeWarehouseName(selectedWarehouseName);
}

export async function getPackingDoneRaw(
  packingDoneId: string,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | null> {
  if (!packingDoneId) return null;
  const response = await axiosInstance.get(
    API_ENDPOINTS.WAREHOUSE.PACKING_DONE.DETAILS(packingDoneId),
    { signal },
  );
  const data = response.data?.data;
  if (!data || typeof data !== "object") return null;
  return data as Record<string, unknown>;
}

async function fetchExistingStockTransferSourceIds(signal?: AbortSignal): Promise<Set<string>> {
  const tabContext = getGrnTabApiContext("stock_transfer");
  const sourceIds = new Set<string>();
  let page = 1;
  const pageSize = 100;

  while (page <= 20) {
    const result = await GrnListService.list({
      page,
      pageSize,
      search: "",
      tabContext,
      apiFilters: { source_type: "STOCK_TRANSFER" },
      signal,
    });

    for (const item of result.items) {
      const sourceId = asString((item as { sourceId?: string }).sourceId);
      if (sourceId) sourceIds.add(sourceId);
    }

    if (result.items.length < pageSize || sourceIds.size >= result.total) break;
    page += 1;
  }

  return sourceIds;
}

async function enrichDispatchRow(
  listItem: Record<string, unknown>,
  transferCache: Map<string, string>,
  signal?: AbortSignal,
): Promise<PendingStockTransferDispatchRow | null> {
  const id = asString(listItem.id);
  if (!id) return null;

  const detail = await getDispatchById(id);
  if (!detail) return null;

  const snapshot = getCustomerSnapshot(detail.packing_done);
  const stockTransferId = asString(detail.source_id || listItem.source_id);
  let stockTransferNo = transferCache.get(stockTransferId) || "";

  if (stockTransferId && !stockTransferNo) {
    try {
      const transfer = await StockTransferService.getById(stockTransferId, signal);
      stockTransferNo = transfer.transferNumber || "";
      if (stockTransferNo) transferCache.set(stockTransferId, stockTransferNo);
    } catch {
      stockTransferNo = asString(detail.packing_done?.packing_done_no) || asString(detail.dispatch_number);
    }
  }

  const items = Array.isArray(detail.items) ? detail.items : [];
  const productNames = items
    .map((item: Record<string, unknown>) => {
      const product = (item.product as Record<string, unknown> | undefined) || {};
      return asString(product.product_name) || asString(item.product_name);
    })
    .filter(Boolean);
  const productsLabel =
    productNames.length === 0
      ? "—"
      : productNames.length <= 2
        ? productNames.join(", ")
        : `${productNames.slice(0, 2).join(", ")} +${productNames.length - 2}`;

  const dispatchedQty = items.reduce(
    (sum: number, item: Record<string, unknown>) => sum + asNumber(item.dispatched_base_qty),
    0,
  );

  return {
    id,
    rowType: "pending_dispatch",
    dispatchId: id,
    dispatchNumber: asString(detail.dispatch_number) || asString(listItem.dispatch_number),
    stockTransferId,
    stockTransferNo: stockTransferNo || asString(detail.dispatch_number),
    fromWarehouse: asString(snapshot.from_warehouse) || asString(detail.warehouse?.warehouse_name) || "—",
    toWarehouse: asString(snapshot.to_warehouse) || "—",
    dispatchDate: asDateOnly(detail.dispatch_date || detail.dispatched_at || detail.created_at),
    products: productsLabel,
    dispatchedQty,
    status: asString(detail.status) || ST_DISPATCH_ELIGIBLE_STATUS,
  };
}

export interface FetchPendingStockTransferParams {
  page: number;
  pageSize: number;
  search?: string;
  ordering?: string;
  filters?: Record<string, unknown>;
  /** Selected destination warehouse UUID ("All" or empty = no name filter). */
  destinationWarehouseId?: string;
  /** Resolved warehouse name for matching PackingDone.customer_snapshot.to_warehouse. */
  destinationWarehouseName?: string | null;
  signal?: AbortSignal;
}

/**
 * Loads DELIVERY_DONE stock_transfer dispatches, enriches via detail (for customer_snapshot),
 * filters by destination warehouse name, and excludes transfers that already have a GRN.
 */
export async function fetchPendingStockTransferDispatches(
  params: FetchPendingStockTransferParams,
): Promise<{ items: PendingStockTransferDispatchRow[]; total: number }> {
  const {
    page,
    pageSize,
    search,
    ordering,
    filters = {},
    destinationWarehouseName,
    signal,
  } = params;

  const existingSourceIds = await fetchExistingStockTransferSourceIds(signal);
  const transferCache = new Map<string, string>();
  const matched: PendingStockTransferDispatchRow[] = [];

  let apiPage = 1;
  const apiPageSize = 50;
  let totalApiRecords = Infinity;

  // Full scan required: destination warehouse lives only on PackingDone.customer_snapshot
  // (not on Dispatch list). Cap pages to avoid runaway requests.
  while ((apiPage - 1) * apiPageSize < totalApiRecords && apiPage <= 40) {
    const res = await getDispatches({
      page: apiPage,
      page_size: apiPageSize,
      search: search || undefined,
      ordering: ordering || "-dispatch_date",
      filters: {
        ...filters,
        source_type: ST_DISPATCH_SOURCE_TYPE,
        status: ST_DISPATCH_ELIGIBLE_STATUS,
      },
    });

    const rows: Record<string, unknown>[] = Array.isArray(res?.data) ? res.data : [];
    totalApiRecords = Number(res?.totalRecords ?? res?.count ?? rows.length);

    if (rows.length === 0) break;

    const enriched = await Promise.all(
      rows.map((row) => enrichDispatchRow(row, transferCache, signal)),
    );

    for (const row of enriched) {
      if (!row) continue;
      if (row.stockTransferId && existingSourceIds.has(row.stockTransferId)) continue;
      if (!matchesDestinationWarehouse(
        { to_warehouse: row.toWarehouse, from_warehouse: row.fromWarehouse },
        destinationWarehouseName,
      )) {
        continue;
      }
      matched.push(row);
    }

    if (rows.length < apiPageSize) break;
    apiPage += 1;
  }

  const start = (page - 1) * pageSize;
  return {
    items: matched.slice(start, start + pageSize),
    total: matched.length,
  };
}

export async function fetchDispatchFilterOptions(
  fieldName: string,
): Promise<{ label: string; value: string }[]> {
  const res = await getDispatchFilterDropdown(fieldName, ST_DISPATCH_SOURCE_TYPE);
  return (res || []).map((x: Record<string, unknown>) => {
    const value = asString(x[fieldName] || x.status || Object.values(x)[0]);
    return { label: value, value };
  }).filter((o: { label: string; value: string }) => Boolean(o.value));
}

export type StockTransferLineFromDispatch = {
  sourceItemId: string;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  batchNo: string;
  mfgDate: string;
  expDate: string;
  maxQty: number;
  caseSize: number;
  /** From dispatch / packing; missing → UI defaults to CASE. */
  quantityType?: GrnQuantityType | null;
  productSnapshot: Record<string, unknown>;
};

export async function buildStockTransferLinesFromDispatch(
  dispatch: Record<string, unknown>,
  signal?: AbortSignal,
): Promise<{
  lines: StockTransferLineFromDispatch[];
  snapshot: PackingCustomerSnapshot;
  packingDoneId: string;
}> {
  const packingDoneId = asString(
    dispatch.packing_done_id ||
      (dispatch.packing_done as Record<string, unknown> | undefined)?.packing_done_id,
  );
  const snapshot = getCustomerSnapshot(dispatch.packing_done);
  const packingDoneRaw = packingDoneId
    ? await getPackingDoneRaw(packingDoneId, signal)
    : null;

  const pdProducts = Array.isArray(packingDoneRaw?.products)
    ? (packingDoneRaw!.products as Record<string, unknown>[])
    : [];
  const pdByProductId = new Map(
    pdProducts.map((p) => [asString(p.packing_done_product_id), p]),
  );

  const items = Array.isArray(dispatch.items) ? (dispatch.items as Record<string, unknown>[]) : [];
  const lines: StockTransferLineFromDispatch[] = items.map((item) => {
    const product = (item.product as Record<string, unknown> | undefined) || {};
    const inv = (item.inventory_sellable_item as Record<string, unknown> | undefined) || {};
    const pdProduct = pdByProductId.get(asString(item.packing_done_product_id));
    const productSnapshot =
      (pdProduct?.product_snapshot as Record<string, unknown> | undefined) ||
      {
        product_id: asString(item.product_id || product.product_id),
        product_name: asString(product.product_name),
        product_code: asString(product.product_code),
        base_unit: asString(product.base_unit) || "Unit",
        conversion_qty: 1,
      };
    const batchSnapshot =
      (pdProduct?.batch_snapshot as Record<string, unknown> | undefined) || {};

    const conversion =
      asNumber(productSnapshot.conversion_qty) ||
      asNumber(productSnapshot.unit_per_packing) ||
      asNumber(productSnapshot.conversion_rate) ||
      1;

    return {
      sourceItemId: asString(item.source_item_id) || asString(item.id),
      productId: asString(item.product_id || product.product_id),
      sku: asString(product.product_code) || asString(productSnapshot.product_code),
      productName: asString(product.product_name) || asString(productSnapshot.product_name) || "—",
      unit: asString(productSnapshot.base_unit) || asString(product.base_unit) || "Unit",
      batchNo:
        asString(inv.batch_no) ||
        asString(pdProduct?.batch_code) ||
        asString(batchSnapshot.batch_code) ||
        "BATCH",
      mfgDate:
        asDateOnly(batchSnapshot.manufacture_date || batchSnapshot.mfg_date) ||
        new Date().toISOString().slice(0, 10),
      expDate:
        asDateOnly(batchSnapshot.expiry_date || batchSnapshot.exp_date) ||
        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      maxQty: asNumber(item.dispatched_base_qty),
      caseSize: conversion > 0 ? conversion : 1,
      quantityType: normalizeGrnQuantityType(
        asString(item.quantity_type) ||
          asString(item.quantityType) ||
          asString(pdProduct?.quantity_type) ||
          asString(pdProduct?.quantityType) ||
          asString(productSnapshot.quantity_type) ||
          asString(productSnapshot.quantityType),
      ),
      productSnapshot: {
        ...productSnapshot,
        product_id: asString(item.product_id || product.product_id),
        product_name: asString(product.product_name) || asString(productSnapshot.product_name),
        product_code: asString(product.product_code) || asString(productSnapshot.product_code),
      },
    };
  }).filter((line) => line.sourceItemId && line.maxQty > 0);

  return { lines, snapshot, packingDoneId };
}

import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { getDispatches, getDispatchFilterDropdown } from "@/app/(app)/warehouse/dispatch/services";
import {
  normalizeGrnQuantityType,
  type GrnQuantityType,
} from "@/lib/warehouse/grn-quantity";

/** Pending ST GRN eligible dispatches use DELIVERED (distinct from DISPATCHED). */
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
  /** Destination warehouse UUID from stock transfer (when available on list). */
  toWarehouseId?: string;
  dispatchDate: string;
  itemCount: number;
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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
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
  snapshot: PackingCustomerSnapshot & { to_warehouse_id?: string },
  selectedWarehouseName: string | null | undefined,
  selectedWarehouseId?: string | null,
): boolean {
  const hasIdFilter = Boolean(selectedWarehouseId && selectedWarehouseId !== "All");
  const hasNameFilter = Boolean(selectedWarehouseName && selectedWarehouseName !== "All");
  if (!hasIdFilter && !hasNameFilter) return true;

  if (hasIdFilter) {
    const toId = asString(snapshot.to_warehouse_id);
    if (toId) return toId === selectedWarehouseId;
  }

  if (!hasNameFilter) return true;
  const toWarehouse = asString(snapshot.to_warehouse);
  if (!toWarehouse) return false;
  return normalizeWarehouseName(toWarehouse) === normalizeWarehouseName(selectedWarehouseName!);
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

/** Map dispatch LIST payload — display only; no FE filter/sort/search. */
function mapDispatchListItemToPendingRow(
  listItem: Record<string, unknown>,
): PendingStockTransferDispatchRow | null {
  const id = asString(listItem.id);
  if (!id) return null;

  const packingDone = asRecord(listItem.packing_done);
  const snapshot = getCustomerSnapshot(packingDone);
  const stockTransfer = asRecord(listItem.stock_transfer);
  const warehouse = asRecord(listItem.warehouse);
  const stockTransferId = asString(listItem.source_id);
  const stockTransferNo =
    asString(listItem.source_document_no) ||
    asString(stockTransfer.transfer_no) ||
    asString(packingDone.packing_done_no) ||
    asString(listItem.dispatch_number);

  const items = Array.isArray(listItem.items) ? (listItem.items as Record<string, unknown>[]) : [];
  const dispatchedQty = items.reduce(
    (sum, item) => sum + asNumber(item.dispatched_base_qty),
    0,
  );

  return {
    id,
    rowType: "pending_dispatch",
    dispatchId: id,
    dispatchNumber: asString(listItem.dispatch_number),
    stockTransferId,
    stockTransferNo: stockTransferNo || asString(listItem.dispatch_number),
    fromWarehouse:
      asString(stockTransfer.from_warehouse) ||
      asString(snapshot.from_warehouse) ||
      asString(warehouse.warehouse_name) ||
      "—",
    toWarehouse:
      asString(stockTransfer.to_warehouse) ||
      asString(snapshot.to_warehouse) ||
      "—",
    toWarehouseId: asString(stockTransfer.to_warehouse_id) || undefined,
    dispatchDate: asDateOnly(
      listItem.dispatch_date || listItem.dispatched_at || listItem.created_at,
    ),
    itemCount: items.length,
    dispatchedQty,
    status: asString(listItem.status) || ST_DISPATCH_ELIGIBLE_STATUS,
  };
}

export interface FetchPendingStockTransferParams {
  page: number;
  pageSize: number;
  search?: string;
  ordering?: string;
  filters?: Record<string, unknown>;
  /** Selected destination warehouse UUID ("All" or empty = no filter). */
  destinationWarehouseId?: string;
  signal?: AbortSignal;
}

/**
 * Pending ST GRN: DELIVERED stock_transfer dispatches without an existing GRN.
 * Page / search / filter / sort are entirely backend-driven.
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
    destinationWarehouseId,
  } = params;

  const apiFilters: Record<string, unknown> = {
    source_type: ST_DISPATCH_SOURCE_TYPE,
    status: ST_DISPATCH_ELIGIBLE_STATUS,
    exclude_existing_st_grn: true,
  };

  const firstValue = (value: unknown): string => {
    if (Array.isArray(value)) return asString(value[0]).trim();
    return asString(value).trim();
  };

  const stockTransferNo = firstValue(filters.stockTransferNo);
  if (stockTransferNo) apiFilters.source_document_no = stockTransferNo;

  const dispatchNumber = firstValue(filters.dispatchNumber);
  if (dispatchNumber) apiFilters.dispatch_number = dispatchNumber;

  const fromWarehouse = firstValue(filters.fromWarehouse);
  if (fromWarehouse) apiFilters.from_warehouse = fromWarehouse;

  const toWarehouse = firstValue(filters.toWarehouse);
  if (toWarehouse) apiFilters.to_warehouse = toWarehouse;

  const status = firstValue(filters.status);
  if (status) apiFilters.status = status;

  const dispatchDate = filters.dispatchDate;
  if (dispatchDate && typeof dispatchDate === "object" && !Array.isArray(dispatchDate)) {
    const range = dispatchDate as { fromDate?: string; toDate?: string; from?: string; to?: string };
    const from = range.fromDate || range.from;
    const to = range.toDate || range.to;
    if (from || to) {
      apiFilters.range = {
        dispatch_date: {
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        },
      };
    }
  } else {
    const exactDate = firstValue(dispatchDate);
    if (exactDate) apiFilters.dispatch_date = exactDate;
  }

  if (destinationWarehouseId && destinationWarehouseId !== "All") {
    apiFilters.to_warehouse_id = destinationWarehouseId;
  }

  const res = await getDispatches({
    page,
    page_size: pageSize,
    search: search || undefined,
    ordering: ordering || "-dispatch_date",
    filters: apiFilters,
  });

  const rows: Record<string, unknown>[] = Array.isArray(res?.data) ? res.data : [];
  const items = rows
    .map((row) => mapDispatchListItemToPendingRow(row))
    .filter((row): row is PendingStockTransferDispatchRow => Boolean(row));

  return {
    items,
    total: Number(res?.totalRecords ?? res?.count ?? items.length),
  };
}

/** Column key → dispatch filter-dropdown field_name */
export const PENDING_ST_FILTER_FIELD_MAP: Record<string, string> = {
  stockTransferNo: "source_document_no",
  dispatchNumber: "dispatch_number",
  fromWarehouse: "from_warehouse",
  toWarehouse: "to_warehouse",
  dispatchDate: "dispatch_date",
  status: "status",
};

export async function fetchDispatchFilterOptions(
  fieldName: string,
): Promise<{ label: string; value: string }[]> {
  const res = await getDispatchFilterDropdown(fieldName, ST_DISPATCH_SOURCE_TYPE, {
    status: ST_DISPATCH_ELIGIBLE_STATUS,
    excludeExistingStGrn: true,
  });
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
      sourceItemId:
        asString(item.source_item_id) ||
        asString(pdProduct?.source_item_id) ||
        "",
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

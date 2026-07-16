import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import {
  normalizeGrnQuantityType,
  type GrnQuantityType,
} from "@/lib/warehouse/grn-quantity";

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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asDateOnly(value: unknown): string {
  const raw = asString(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function assertSuccess(body: Record<string, unknown>, fallback: string): void {
  if (body.success === false) {
    throw new Error(asString(body.message) || fallback);
  }
}

export interface SampleReturnDropdownOption {
  id: string;
  returnNumber: string;
  status: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  itemCount: number;
}

export interface SampleReturnLineItem {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  sku: string;
  unit: string;
  packingUnit: string;
  unitPerPacking: number;
  batchNumber: string;
  mfgDate: string;
  expDate: string;
  /** Returned quantity converted to base units (pieces). */
  returnedBaseQty: number;
  /** From backend; missing → UI defaults to CASE. */
  quantityType?: GrnQuantityType | null;
  productSnapshot: Record<string, unknown>;
  packedQty: number;
  dispatchQty: number;
  returnedQty: number;
  amount?: number;
  remarks?: string;
  quantityType?: string;
}

export interface SampleReturnDetail {
  id: string;
  returnNumber: string;
  status: string;
  returnDate: string;
  remarks: string;
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  items: SampleReturnLineItem[];
  dispatchNumber: string;
  salesOrderNumber: string;
}

function mapDropdownOption(raw: Record<string, unknown>): SampleReturnDropdownOption {
  const customer = asRecord(raw.customer);
  const warehouse = asRecord(raw.warehouse);
  const count = asRecord(raw._count);
  return {
    id: asString(raw.sample_return_id) || asString(raw.id),
    returnNumber: asString(raw.return_no),
    status: asString(raw.status),
    customerName: asString(customer.customer_name),
    warehouseId: asString(raw.warehouse_id) || asString(warehouse.warehouse_id),
    warehouseName: asString(warehouse.warehouse_name),
    itemCount: asNumber(count.items),
  };
}

function mapLineItem(raw: Record<string, unknown>): SampleReturnLineItem {
  const product = asRecord(raw.product);
  const snapshot = asRecord(raw.product_snapshot);
  const dispatchItem = asRecord(raw.dispatch_item);
  const inventoryBatch = asRecord(dispatchItem.inventory_batch);
  const unitPerPacking =
    asNumber(snapshot.unit_per_packing) ||
    asNumber(product.unit_per_packing) ||
    1;
  const packingFactor = unitPerPacking > 0 ? unitPerPacking : 1;
  const returnedPackingQty = asNumber(raw.returned_qty);
  const qtyType = asString(raw.quantity_type).toLowerCase();
  const isPieceType = qtyType === "piece" || qtyType === "pieces";
  const returnedBaseQty = isPieceType ? returnedPackingQty : returnedPackingQty * packingFactor;

  return {
    id: asString(raw.sample_return_item_id) || asString(raw.id),
    productId:
      asString(raw.product_id) ||
      asString(snapshot.product_id) ||
      asString(product.product_id),
    productCode:
      asString(snapshot.product_code) ||
      asString(product.product_code) ||
      asString(snapshot.sku) ||
      asString(product.sku),
    productName:
      asString(snapshot.product_name) ||
      asString(product.product_name) ||
      "—",
    sku:
      asString(snapshot.sku) ||
      asString(product.sku) ||
      asString(snapshot.product_code) ||
      asString(product.product_code),
    unit:
      asString(snapshot.unit) ||
      asString(snapshot.base_unit) ||
      asString(product.unit) ||
      "Unit",
    packingUnit:
      asString(snapshot.packing_unit) ||
      asString(product.packing_unit) ||
      "",
    unitPerPacking: packingFactor,
    batchNumber: asString(inventoryBatch.batch_no) || asString(inventoryBatch.batchNumber) || "",
    mfgDate: asDateOnly(inventoryBatch.manufactureDate) || asDateOnly(inventoryBatch.manufacture_date) || "",
    expDate: asDateOnly(inventoryBatch.expiryDate) || asDateOnly(inventoryBatch.expiry_date) || "",
    returnedBaseQty,
    quantityType: normalizeGrnQuantityType(
      asString(raw.quantity_type) ||
      asString(raw.quantityType) ||
      asString(dispatchItem.quantity_type) ||
      asString(dispatchItem.quantityType) ||
      asString(snapshot.quantity_type) ||
      asString(snapshot.quantityType),
    ),
    productSnapshot: Object.keys(snapshot).length > 0 ? snapshot : {
      product_id: asString(product.product_id) || asString(raw.product_id),
      product_code: asString(product.product_code),
      product_name: asString(product.product_name),
      base_unit: asString(product.unit),
      packing_unit: asString(product.packing_unit),
      sku: asString(product.sku),
    },
    packedQty: asNumber(raw.packed_qty) / packingFactor,
    dispatchQty: asNumber(raw.dispatch_qty) / packingFactor,
    returnedQty: returnedPackingQty,
    amount: asNumber(raw.return_amount) || asNumber(raw.amount),
    remarks: asString(raw.remarks),
    quantityType: asString(raw.quantity_type),
  };
}

function mapDetail(raw: Record<string, unknown>): SampleReturnDetail {
  const customer = asRecord(raw.customer);
  const warehouse = asRecord(raw.warehouse);
  const dispatch = asRecord(raw.dispatch);
  const sampleOrder = asRecord(raw.sample_order);
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];

  return {
    id: asString(raw.sample_return_id) || asString(raw.id),
    returnNumber: asString(raw.return_no),
    status: asString(raw.status),
    returnDate: asDateOnly(raw.return_date),
    remarks: asString(raw.remarks),
    customerId: asString(raw.customer_id) || asString(customer.customer_id),
    customerName: asString(customer.customer_name),
    warehouseId: asString(raw.warehouse_id) || asString(warehouse.warehouse_id),
    warehouseName: asString(warehouse.warehouse_name),
    items: itemsRaw.map((item) => mapLineItem(asRecord(item))),
    dispatchNumber: asString(dispatch.dispatch_number),
    salesOrderNumber: asString(sampleOrder.order_no) || asString(sampleOrder.sample_order_no),
  };
}

export const SampleReturnService = {
  async getDropdown(
    statuses?: string[],
    signal?: AbortSignal,
  ): Promise<SampleReturnDropdownOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.SAMPLE_RETURN.DROPDOWN, {
      params: statuses?.length ? { status: statuses.join(",") } : undefined,
      signal,
    });
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to load sample return dropdown.");
    const data = payload.data;
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => mapDropdownOption(asRecord(row)))
      .filter((row) => Boolean(row.id));
  },

  async getById(id: string, signal?: AbortSignal): Promise<SampleReturnDetail> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SALES.SAMPLE_RETURN.DETAILS(id),
      { signal },
    );
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to load sample return details.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapDetail(data as Record<string, unknown>);
  },

  async create(payload: any): Promise<any> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.SALES.SAMPLE_RETURN.CREATE,
      payload
    );
    return response.data;
  },

  async list(payload: {
    page: number;
    pageSize: number;
    search?: string;
    ordering?: string;
    apiFilters?: Record<string, unknown>;
  }): Promise<{ items: any[]; total: number }> {
    const params: any = {
      page: payload.page,
      page_size: payload.pageSize,
    };
    if (payload.search) params.search = payload.search;
    if (payload.ordering) params.ordering = payload.ordering;

    const response = await axiosInstance.post(
      API_ENDPOINTS.SALES.SAMPLE_RETURN.LIST,
      { filters: payload.apiFilters || {} },
      { params }
    );

    return {
      items: response.data?.data || [],
      total: response.data?.totalRecords || response.data?.count || 0,
    };
  },

  async getFilterDropdown(fieldName: string): Promise<Array<Record<string, string>>> {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.SALES.SAMPLE_RETURN.FILTER}?field_name=${fieldName}`
    );
    return response.data?.data || [];
  },
};

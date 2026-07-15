import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

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

export interface SalesReturnDropdownOption {
  id: string;
  returnNumber: string;
  status: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  itemCount: number;
}

export interface SalesReturnLineItem {
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
  returnedBaseQty: number;
  productSnapshot: Record<string, unknown>;
  amount: number;
}

export interface SalesReturnDetail {
  id: string;
  returnNumber: string;
  status: string;
  returnDate: string;
  remarks: string;
  customerId: string;
  customerName: string;
  warehouseId: string;
  warehouseName: string;
  items: SalesReturnLineItem[];
  dispatchNumber: string;
  salesOrderNumber: string;
  packingNumber: string;
}

function mapDropdownOption(raw: Record<string, unknown>): SalesReturnDropdownOption {
  const customer = asRecord(raw.customer);
  const warehouse = asRecord(raw.warehouse);
  const count = asRecord(raw._count);
  return {
    id: asString(raw.id),
    returnNumber: asString(raw.return_number),
    status: asString(raw.status),
    customerName: asString(customer.customer_name),
    warehouseId: asString(raw.warehouse_id) || asString(warehouse.warehouse_id),
    warehouseName: asString(warehouse.warehouse_name),
    itemCount: asNumber(count.items),
  };
}

function mapLineItem(raw: Record<string, unknown>): SalesReturnLineItem {
  const product = asRecord(raw.product);
  const snapshot = asRecord(raw.product_snapshot);
  const batchSnapshot = asRecord(raw.batch_snapshot);
  const unitPerPacking =
    asNumber(snapshot.unit_per_packing) ||
    asNumber(product.unit_per_packing) ||
    1;

  return {
    id: asString(raw.id),
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
    unitPerPacking: unitPerPacking > 0 ? unitPerPacking : 1,
    batchNumber:
      asString(raw.batch_code) ||
      asString(batchSnapshot.batch_code) ||
      asString(batchSnapshot.batchNumber) ||
      asString(batchSnapshot.batch_no) ||
      "",
    mfgDate:
      asDateOnly(batchSnapshot.manufactureDate) ||
      asDateOnly(batchSnapshot.mfg_date) ||
      asDateOnly(batchSnapshot.manufacture_date) ||
      "",
    expDate:
      asDateOnly(batchSnapshot.expiryDate) ||
      asDateOnly(batchSnapshot.expiry_date) ||
      asDateOnly(batchSnapshot.exp_date) ||
      "",
    returnedBaseQty:
      asNumber(raw.total_return_pieces) ||
      asNumber(raw.base_qty) ||
      asNumber(raw.qty),
    productSnapshot: Object.keys(snapshot).length > 0 ? snapshot : {
      product_id: asString(product.product_id) || asString(raw.product_id),
      product_code: asString(product.product_code),
      product_name: asString(product.product_name),
      base_unit: asString(product.unit),
      packing_unit: asString(product.packing_unit),
      sku: asString(product.sku),
    },
    amount: asNumber(raw.amount),
  };
}

function mapDetail(raw: Record<string, unknown>): SalesReturnDetail {
  const customer = asRecord(raw.customer);
  const warehouse = asRecord(raw.warehouse);
  const dispatch = asRecord(raw.dispatch);
  const salesOrder = asRecord(raw.sales_order);
  const packingList = asRecord(raw.packing_list);
  const itemsRaw = Array.isArray(raw.items) ? raw.items : [];

  return {
    id: asString(raw.id),
    returnNumber: asString(raw.return_number),
    status: asString(raw.status),
    returnDate: asDateOnly(raw.return_date),
    remarks: asString(raw.remarks),
    customerId: asString(raw.customer_id) || asString(customer.customer_id),
    customerName: asString(customer.customer_name),
    warehouseId: asString(raw.warehouse_id) || asString(warehouse.warehouse_id),
    warehouseName: asString(warehouse.warehouse_name),
    items: itemsRaw.map((item) => mapLineItem(asRecord(item))),
    dispatchNumber: asString(dispatch.dispatch_number),
    salesOrderNumber: asString(salesOrder.so_number),
    packingNumber: asString(packingList.packing_number),
  };
}

export const SalesReturnService = {
  async getDropdown(
    statuses?: string[],
    signal?: AbortSignal,
  ): Promise<SalesReturnDropdownOption[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.SALES_RETURN.DROPDOWN, {
      params: statuses?.length ? { status: statuses.join(",") } : undefined,
      signal,
    });
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to load sales return dropdown.");
    const data = payload.data;
    if (!Array.isArray(data)) return [];
    return data
      .map((row) => mapDropdownOption(asRecord(row)))
      .filter((row) => Boolean(row.id));
  },

  async getById(id: string, signal?: AbortSignal): Promise<SalesReturnDetail> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SALES.SALES_RETURN.DETAILS(id),
      { signal },
    );
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to load sales return details.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapDetail(data as Record<string, unknown>);
  },

  async create(payload: any): Promise<any> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.SALES.SALES_RETURN.CREATE,
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
      API_ENDPOINTS.SALES.SALES_RETURN.LIST,
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
      `${API_ENDPOINTS.SALES.SALES_RETURN.FILTER}?field_name=${fieldName}`
    );
    return response.data?.data || [];
  },
};

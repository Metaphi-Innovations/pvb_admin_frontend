import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { FilterState } from "@/components/listing/types";
import type { SalesOrderRecord } from "@/app/(app)/warehouse/packing/types";

export interface PackingListListItem {
  id: string;
  packingNumber: string;
  sourceDocumentNo: string;
  sourceType: "normal_sales" | "sample" | "stock_transfer" | "purchase_return";
  sourceId: string;
  warehouseId: string;
  warehouseName: string;
  customerName: string;
  sourceWarehouse?: string;
  targetWarehouse?: string;
  orderAmount: number;
  orderDate: string;
  expectedDeliveryDate: string;
  status: string;
  remarks: string;
  totalItems: number;
  totalQuantity: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface PackingListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface PackingListResult {
  items: PackingListListItem[];
  total: number;
}

export interface PackingListFilterOption {
  label: string;
  value: string;
}

export type PackingListFilterField =
  | "packing_number"
  | "status"
  | "customer_name"
  | "source_type"
  | "warehouse__warehouse_name"
  | "created_by_user__username";

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

function toDisplayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const username = asString(record.username).trim();
  if (username) return username;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  return `${first} ${last}`.trim();
}

function mapItem(raw: Record<string, unknown>): PackingListListItem {
  const warehouse =
    raw.warehouse && typeof raw.warehouse === "object" && !Array.isArray(raw.warehouse)
      ? (raw.warehouse as Record<string, unknown>)
      : {};
  const products = Array.isArray(raw.products) ? raw.products : [];
  
  const totalQty = products.reduce((sum: number, p: any) => {
    if (p && typeof p === "object") {
      const packSizeRaw = p.product?.unit_per_packing ?? p.product_snapshot?.unit_per_packing ?? p.product_snapshot?.conversion_rate ?? p.product_snapshot?.conversion_qty ?? p.product_snapshot?.conversion_factor ?? 1;
      const packSize = Number(packSizeRaw) || 1;
      const orderQty = asNumber(p.order_base_qty) / packSize;
      return sum + Math.floor(orderQty);
    }
    return sum;
  }, 0);

  return {
    id: asString(raw.packing_list_id ?? raw.id),
    packingNumber: asString(raw.packing_number),
    sourceDocumentNo: asString((raw.customer_snapshot as any)?.source_document_no),
    sourceType: asString(raw.source_type) as any,
    sourceId: asString(raw.source_id),
    warehouseId: asString(raw.warehouse_id),
    warehouseName: asString(warehouse.warehouse_name),
    customerName: asString(raw.customer_name),
    sourceWarehouse: asString(raw.source_warehouse),
    targetWarehouse: asString(raw.target_warehouse),
    orderAmount: asNumber(raw.order_amount),
    orderDate: asDateOnly(raw.order_date),
    expectedDeliveryDate: asDateOnly(raw.expected_delivery_date),
    status: asString(raw.status),
    remarks: asString(raw.remarks),
    totalItems: products.length,
    totalQuantity: totalQty,
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function buildListQueryString(params: PackingListParams): string {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("limit", String(params.pageSize));
  if (params.ordering) query.set("ordering", params.ordering);
  if (params.search) query.set("search", params.search);
  return query.toString();
}

export function buildPackingListApiFilters(
  filters: FilterState,
  selectedWarehouse?: string | null,
): Record<string, unknown> {
  const apiFilters: Record<string, unknown> = {};

  const warehouse = filters.warehouse;
  if (warehouse) {
    if (Array.isArray(warehouse)) {
      if (warehouse.length > 0) apiFilters.warehouse = { warehouse_name: asString(warehouse[0]) };
    } else {
      apiFilters.warehouse = { warehouse_name: asString(warehouse) };
    }
  }
  
  if (selectedWarehouse && selectedWarehouse !== "All") {
    apiFilters.warehouse_id = selectedWarehouse;
  }

  const customerName = filters.customer;
  if (customerName) {
    if (Array.isArray(customerName)) {
      if (customerName.length > 0) apiFilters.customer_name = customerName[0];
    } else {
      apiFilters.customer_name = asString(customerName);
    }
  }

  const status = filters.status;
  if (status) {
    if (Array.isArray(status)) {
      if (status.length > 0) apiFilters.status = status[0];
    } else {
      apiFilters.status = asString(status);
    }
  }

  const packingNumber = filters.packingNo || filters.salesOrderNo || filters.packingListNo;
  if (packingNumber) {
    if (Array.isArray(packingNumber)) {
      if (packingNumber.length > 0) apiFilters.packing_number = asString(packingNumber[0]);
    } else {
      apiFilters.packing_number = asString(packingNumber);
    }
  }

  const orderDate = filters.orderDate;
  if (orderDate && typeof orderDate === "object" && !Array.isArray(orderDate)) {
    const range = orderDate as { fromDate?: string; toDate?: string };
    if (range.fromDate) apiFilters.order_date_from = range.fromDate;
    if (range.toDate) apiFilters.order_date_to = range.toDate;
  }

  return apiFilters;
}

/** Maps UI sort state to backend `ordering` query param. */
export function buildPackingListOrdering(
  sortKey: string,
  direction: "asc" | "desc" | "none",
): string | undefined {
  if (!sortKey || direction === "none") return undefined;

  const fieldMap: Record<string, string> = {
    packingNo: "packingNumber",
    customer: "customerName",
    warehouse: "warehouse__warehouse_name",
    orderAmount: "order_amount",
    status: "status",
  };

  const backendKey = fieldMap[sortKey];
  if (!backendKey) return undefined;

  return direction === "desc" ? `-${backendKey}` : backendKey;
}

export const PackingListService = {
  async list(params: PackingListParams): Promise<PackingListResult> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.PACKING_LIST.LIST}?${buildListQueryString(params)}`,
      {
        filters: params.apiFilters ?? {},
      },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    
    // The backend lists can return nested objects
    const dataObj = payload.data as Record<string, unknown>;
    const listData = Array.isArray(payload.data) 
      ? payload.data 
      : (dataObj && Array.isArray(dataObj.data) ? dataObj.data : []);

    const items = listData.map((row) => mapItem((row ?? {}) as Record<string, unknown>));
    
    const pagination = dataObj?.pagination as Record<string, unknown> | undefined;
    const totalRecords = pagination ? asNumber(pagination.total) : items.length;

    return { items, total: totalRecords };
  },

  async getFilterDropdown(
    fieldName: PackingListFilterField,
    sourceType?: string,
    signal?: AbortSignal,
  ): Promise<PackingListFilterOption[]> {
    const url = new URL(API_ENDPOINTS.WAREHOUSE.PACKING_LIST.FILTER_DROPDOWN, "http://localhost");
    url.searchParams.set("field_name", fieldName);
    if (sourceType) {
      url.searchParams.set("source_type", sourceType);
    }
    
    const response = await axiosInstance.get(
      url.pathname + url.search,
      { signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = Array.isArray(payload.data) ? payload.data : [];

    const options: PackingListFilterOption[] = [];
    const seen = new Set<string>();

    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const record = row as Record<string, unknown>;
      const value = asString(record[fieldName]).trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      options.push({ label: value, value });
    }

    return options.sort((a, b) => a.label.localeCompare(b.label));
  },

  async getById(id: string, signal?: AbortSignal): Promise<SalesOrderRecord> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.WAREHOUSE.PACKING_LIST.DETAILS(id),
      { signal },
    );
    const payload = response.data as Record<string, unknown>;
    return mapDetailToSalesOrderRecord(payload.data);
  },

  async getBatches(
    productId: string,
    warehouseId: string,
    signal?: AbortSignal,
  ): Promise<any[]> {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.WAREHOUSE.PACKING_LIST.BATCHES}?product_id=${productId}&warehouse_id=${warehouseId}`,
      { signal },
    );
    const payload = response.data as Record<string, unknown>;
    return Array.isArray(payload.data) ? payload.data : [];
  },

  async create(payload: any): Promise<any> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.WAREHOUSE.PACKING_LIST.CREATE,
      payload
    );
    return response.data;
  },
};

function mapDetailToSalesOrderRecord(raw: any): SalesOrderRecord {
  const products = Array.isArray(raw.products) ? raw.products : [];
  const warehouse = raw.warehouse?.warehouse_name || "";
  
  return {
    id: raw.packing_list_id,
    salesOrderNo: raw.packing_number,
    customer: raw.customer_name || "",
    totalItems: products.length,
    totalQuantity: products.reduce((sum: number, p: any) => {
      const packSizeRaw = p.product?.unit_per_packing ?? p.product_snapshot?.unit_per_packing ?? p.product_snapshot?.conversion_rate ?? p.product_snapshot?.conversion_qty ?? p.product_snapshot?.conversion_factor ?? 1;
      const packSize = Number(packSizeRaw) || 1;
      return sum + Math.floor(Number(p.order_base_qty || 0) / packSize);
    }, 0),
    orderAmount: Number(raw.order_amount || 0),
    orderDate: raw.order_date ? raw.order_date.slice(0, 10) : "",
    deliveryDate: raw.expected_delivery_date ? raw.expected_delivery_date.slice(0, 10) : "",
    priority: "Medium",
    status: raw.status as any,
    warehouse: warehouse,
    sourceDocumentType: (raw.source_type === "normal_sales" ? "Sales Order" : 
                         raw.source_type === "sample" ? "Sample Order" : 
                         raw.source_type === "stock_transfer" ? "Stock Transfer" : 
                         raw.source_type === "purchase_return" ? "Purchase Return" : raw.source_type) as any,
    sourceDocumentNo: raw.packing_number,
    sourceWarehouse: warehouse,
    targetWarehouse: raw.target_warehouse?.warehouse_name || "—",
    products: products.map((p: any) => {
      const snap = p.batch_snapshot && typeof p.batch_snapshot === "object" ? p.batch_snapshot : {};
      const packSizeRaw = p.product?.unit_per_packing ?? p.product_snapshot?.unit_per_packing ?? p.product_snapshot?.conversion_rate ?? p.product_snapshot?.conversion_qty ?? p.product_snapshot?.conversion_factor ?? 1;
      const packSize = Number(packSizeRaw) || 1;
      const orderBaseQty = Number(p.order_base_qty || 0);
      const packedBaseQty = Number(p.packed_base_qty || 0);
      const pendingBaseQty = Number(p.pending_base_qty || 0);

      return {
        product: p.product?.product_name || "",
        productId: p.product_id || p.product?.product_id || "",
        sku: p.product?.product_code || "",
        orderBaseQty,
        packedBaseQty,
        pendingBaseQty,
        packSize,
        ordered_cases: Math.floor(orderBaseQty / packSize),
        packedQty: Math.floor(packedBaseQty / packSize),
        pending_cases: Math.floor(pendingBaseQty / packSize),
        batchNumber: p.batch_code || snap.batch_code || "",
        expDate: snap.expiry_date || snap.expiryDate || "",
        mfgDate: snap.mfg_date || snap.mfgDate || "",
        grnNo: snap.grn_no || snap.grnNo || "",
        lineId: p.packing_list_product_id,
      };
    }),
  };
}

import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { FilterState } from "@/components/listing/types";
import type { PackingRecord, SalesOrderRecord } from "@/app/(app)/warehouse/packing/types";

export interface PackingDoneParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface PackingDoneResult {
  items: PackingRecord[];
  total: number;
}

export interface PackingDoneFilterOption {
  label: string;
  value: string;
}

export type PackingDoneFilterField =
  | "packing_done_no"
  | "status"
  | "customer_name"
  | "source_type"
  | "warehouse__warehouse_name"
  | "packed_by_user__username"
  | "packing_list__packing_number"
  | "packing_list__customer_name";

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function mapListItemToPackingRecord(raw: Record<string, any>): PackingRecord {
  const sourceDocType = raw.source_type === "normal_sales" ? "Sales Order" :
                        raw.source_type === "sample" ? "Sample Order" :
                        raw.source_type === "stock_transfer" ? "Stock Transfer" :
                        raw.source_type === "purchase_return" ? "Purchase Return" : raw.source_type;
  return {
    id: raw.packing_done_id,
    packingNo: raw.packing_done_no,
    salesOrderNo: raw.customer_snapshot?.source_document_no || raw.packing_list_no || "",
    customer: raw.customer_name || "",
    totalItems: Number(raw.total_items || 0),
    packedQuantity: Number(raw.total_packed_qty || 0),
    packingDate: raw.packing_date ? raw.packing_date.slice(0, 10) : "",
    packedBy: raw.packed_by ? `${raw.packed_by.first_name} ${raw.packed_by.last_name}`.trim() || raw.packed_by.username : "System",
    status: raw.status as any,
    warehouse: raw.warehouse_name || "",
    sourceDocumentType: sourceDocType as any,
    sourceDocumentNo: raw.customer_snapshot?.source_document_no || raw.packing_list_no || "",
    sourceWarehouse: raw.source_warehouse || raw.warehouse_name || "",
    targetWarehouse: raw.target_warehouse || "",
    poNumber: raw.po_number || "",
    supplierCode: raw.supplier_code || "",
    products: [],
  };
}

function mapDetailToPackingRecord(raw: any): PackingRecord {
  const products = Array.isArray(raw.products) ? raw.products : [];
  const warehouse = raw.warehouse?.warehouse_name || "";
  const customer = raw.customer_snapshot?.customer_name || raw.packing_list?.customer_name || "";
  const sourceDocType = raw.source_type === "normal_sales" ? "Sales Order" :
                        raw.source_type === "sample" ? "Sample Order" :
                        raw.source_type === "stock_transfer" ? "Stock Transfer" :
                        raw.source_type === "purchase_return" ? "Purchase Return" : raw.source_type;

  return {
    id: raw.packing_done_id,
    packingListId: raw.packing_list_id || raw.packing_list?.packing_list_id,
    packingNo: raw.packing_done_no,
    salesOrderNo: raw.customer_snapshot?.source_document_no || raw.packing_list?.packing_number || "",
    customer: customer,
    totalItems: products.length,
    packedQuantity: products.reduce((sum: number, p: any) => {
      const packSize = Number(p.product_snapshot?.unit_per_packing || p.product_snapshot?.conversion_rate || 1);
      return sum + Math.floor(Number(p.base_qty || 0) / packSize);
    }, 0),
    packingDate: raw.packing_date ? raw.packing_date.slice(0, 10) : "",
    packedBy: raw.packed_by_user ? `${raw.packed_by_user.first_name} ${raw.packed_by_user.last_name}`.trim() || raw.packed_by_user.username : "System",
    status: raw.status as any,
    warehouse: warehouse,
    sourceDocumentType: sourceDocType as any,
    sourceDocumentNo: raw.packing_list?.packing_number || "",
    sourceWarehouse: warehouse,
    targetWarehouse: "—",
    products: products.map((p: any) => {
      const packSize = Number(p.product_snapshot?.unit_per_packing || p.product_snapshot?.conversion_rate || 1);
      const packedBaseQty = Number(p.base_qty || 0);
      const orderBaseQty = Number(p.packing_list_product?.order_base_qty || 0);
      
      return {
        product: p.product_name || p.product_snapshot?.product_name || "Unknown",
        sku: p.product_code || p.product_snapshot?.product_code || "",
        ordered_cases: Math.floor(orderBaseQty / packSize),
        packedQty: Math.floor(packedBaseQty / packSize),
        orderBaseQty,
        packedBaseQty,
        packSize,
        lineId: p.packing_list_product_id,
        batchAllocations: p.batch_code ? [{
          batchNumber: p.batch_code,
          allocatedQty: Math.floor(packedBaseQty / packSize),
          expiryDate: "—",
        }] : undefined,
      };
    }),
  };
}

function buildListQueryString(params: PackingDoneParams): string {
  const query = new URLSearchParams();
  query.set("page", String(params.page));
  query.set("limit", String(params.pageSize));
  if (params.ordering) query.set("ordering", params.ordering);
  if (params.search) query.set("search", params.search);
  return query.toString();
}

export function buildPackingDoneApiFilters(
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

  const packingDoneNo = filters.packingNo || filters.salesOrderNo || filters.packingListNo;
  if (packingDoneNo) {
    if (Array.isArray(packingDoneNo)) {
      if (packingDoneNo.length > 0) apiFilters.packing_done_no = asString(packingDoneNo[0]);
    } else {
      apiFilters.packing_done_no = asString(packingDoneNo);
    }
  }

  return apiFilters;
}

export function buildPackingDoneOrdering(
  sortKey: string,
  direction: "asc" | "desc" | "none",
): string | undefined {
  if (!sortKey || direction === "none") return undefined;

  const fieldMap: Record<string, string> = {
    packingNo: "packing_done_no",
    salesOrderNo: "packing_list__packing_number",
    customer: "packing_list__customer_name",
    warehouse: "packing_list__warehouse__warehouse_name",
    packingDate: "packing_date",
    status: "status",
  };

  const backendKey = fieldMap[sortKey];
  if (!backendKey) return undefined;

  return direction === "desc" ? `-${backendKey}` : backendKey;
}

export const PackingDoneService = {
  async list(params: PackingDoneParams): Promise<PackingDoneResult> {
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.WAREHOUSE.PACKING_DONE.LIST}?${buildListQueryString(params)}`,
      {
        filters: params.apiFilters ?? {},
      },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    const dataObj = payload.data as Record<string, unknown>;
    const listData = Array.isArray(payload.data)
      ? payload.data
      : (dataObj && Array.isArray(dataObj.data) ? dataObj.data : []);

    const items = listData.map((row) => mapListItemToPackingRecord((row ?? {}) as Record<string, any>));
    const totalRecords = payload.totalRecords !== undefined ? Number(payload.totalRecords)
      : payload.count !== undefined ? Number(payload.count)
      : (dataObj && typeof dataObj.pagination === "object") ? Number((dataObj.pagination as any)?.total || items.length)
      : items.length;

    return { items, total: totalRecords };
  },

  async getFilterDropdown(
    fieldName: PackingDoneFilterField,
    warehouseId?: string,
    sourceType?: string,
    signal?: AbortSignal,
  ): Promise<PackingDoneFilterOption[]> {
    const url = new URL(API_ENDPOINTS.WAREHOUSE.PACKING_DONE.FILTER_DROPDOWN, "http://localhost");
    url.searchParams.set("field_name", fieldName);
    if (warehouseId) {
      url.searchParams.set("warehouse_id", warehouseId);
    }
    if (sourceType) {
      url.searchParams.set("source_type", sourceType);
    }
    
    const response = await axiosInstance.get(
      url.pathname + url.search,
      { signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = Array.isArray(payload.data) ? payload.data : [];

    const options: PackingDoneFilterOption[] = [];
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

  async getById(id: string, signal?: AbortSignal): Promise<PackingRecord> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.WAREHOUSE.PACKING_DONE.DETAILS(id),
      { signal },
    );
    const payload = response.data as Record<string, any>;
    return mapDetailToPackingRecord(payload.data);
  },

  async create(payload: {
    packing_list_id: string;
    packing_done_no?: string;
    packing_date?: string;
    remarks?: string;
    products: {
      packing_list_product_id: string;
      base_qty: number;
      quantity_type?: string;
      remarks?: string;
    }[];
  }): Promise<any> {
    const transformedPayload = {
      ...payload,
      products: payload.products.map(p => ({
        packing_list_product_id: p.packing_list_product_id,
        base_qty: p.base_qty,
        quantity_type: p.quantity_type,
        remarks: p.remarks,
      }))
    };

    const response = await axiosInstance.post(
      API_ENDPOINTS.WAREHOUSE.PACKING_DONE.CREATE,
      transformedPayload
    );
    return response.data;
  },

  async update(id: string, payload: {
    packing_date?: string;
    remarks?: string;
    products: {
      packing_list_product_id: string;
      base_qty: number;
      quantity_type?: string;
      remarks?: string;
    }[];
  }): Promise<any> {
    const transformedPayload = {
      ...payload,
      products: payload.products.map(p => ({
        packing_list_product_id: p.packing_list_product_id,
        base_qty: p.base_qty,
        quantity_type: p.quantity_type,
        remarks: p.remarks,
      }))
    };

    const response = await axiosInstance.put(
      API_ENDPOINTS.WAREHOUSE.PACKING_DONE.UPDATE(id),
      transformedPayload
    );
    return response.data;
  },

  async revert(id: string): Promise<any> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.WAREHOUSE.PACKING_DONE.REVERT(id)
    );
    return response.data;
  }
};

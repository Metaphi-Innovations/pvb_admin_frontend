import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { FilterState } from "@/components/listing/types";
import type { PackingRecord } from "@/app/(app)/warehouse/packing/types";
import { extractPackingProductDisplay } from "@/app/(app)/warehouse/packing/lib/packing-qty-stack";

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
  | "source_document_no"
  | "po_number"
  | "source_type"
  | "packing_list__warehouse__warehouse_name"
  | "packed_by_user__username"
  | "packing_list__packing_number"
  | "packing_list__customer_name";

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function firstFilterValue(value: unknown): string {
  if (Array.isArray(value)) return asString(value[0]).trim();
  return asString(value).trim();
}

function formatDetailDate(value: unknown): string {
  const raw = asString(value).trim();
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}

function resolveStockTransferTargetName(raw: Record<string, any>): string {
  return (
    asString(raw.target_warehouse) ||
    asString(raw.customer_snapshot?.to_warehouse) ||
    asString(raw.customer_snapshot?.target_warehouse) ||
    ""
  );
}

function resolveStockTransferSourceName(raw: Record<string, any>): string {
  return (
    asString(raw.source_warehouse) ||
    asString(raw.customer_snapshot?.from_warehouse) ||
    asString(raw.customer_snapshot?.source_warehouse) ||
    asString(raw.warehouse_name) ||
    ""
  );
}

function mapListItemToPackingRecord(raw: Record<string, any>): PackingRecord {
  const sourceDocType = raw.source_type === "normal_sales" ? "Sales Order" :
                        raw.source_type === "sample" ? "Sample Order" :
                        raw.source_type === "stock_transfer" ? "Stock Transfer" :
                        raw.source_type === "purchase_return" ? "Purchase Return" : raw.source_type;
  const isStockTransfer = sourceDocType === "Stock Transfer";
  const targetWarehouse = isStockTransfer ? resolveStockTransferTargetName(raw) : asString(raw.target_warehouse);
  const sourceWarehouse = isStockTransfer
    ? resolveStockTransferSourceName(raw)
    : raw.source_warehouse || raw.warehouse_name || "";
  return {
    id: raw.packing_done_id,
    packingNo: raw.packing_done_no,
    salesOrderNo: raw.customer_snapshot?.source_document_no || raw.packing_list_no || "",
    customer: isStockTransfer ? targetWarehouse || raw.customer_name || "" : raw.customer_name || "",
    totalItems: Number(raw.total_items || 0),
    packedQuantity: Number(raw.total_packed_qty || 0),
    packingDate: raw.packing_date ? raw.packing_date.slice(0, 10) : "",
    packedBy: raw.packed_by ? `${raw.packed_by.first_name} ${raw.packed_by.last_name}`.trim() || raw.packed_by.username : "System",
    status: raw.status as any,
    warehouse: raw.warehouse_name || "",
    sourceDocumentType: sourceDocType as any,
    sourceDocumentNo: raw.customer_snapshot?.source_document_no || raw.packing_list_no || "",
    sourceWarehouse,
    targetWarehouse,
    poNumber:
      raw.po_number ||
      asString(raw.customer_snapshot?.po_number) ||
      asString(raw.customer_snapshot?.poNumber) ||
      asString(raw.customer_snapshot?.po_no) ||
      "",
    supplierCode: raw.supplier_code || "",
    orderAmount:
      raw.order_amount != null && raw.order_amount !== ""
        ? Number(raw.order_amount)
        : undefined,
    products: [],
  };
}

function mapDetailToPackingRecord(raw: any): PackingRecord {
  const products = Array.isArray(raw.products) ? raw.products : [];
  const snapshot =
    raw.customer_snapshot && typeof raw.customer_snapshot === "object"
      ? (raw.customer_snapshot as Record<string, unknown>)
      : {};
  const warehouse =
    raw.warehouse?.warehouse_name ||
    asString(snapshot.warehouse_name) ||
    asString((raw.warehouse_snapshot as Record<string, unknown> | undefined)?.warehouse_name) ||
    "";
  const sourceDocType =
    raw.source_type === "normal_sales"
      ? "Sales Order"
      : raw.source_type === "sample"
        ? "Sample Order"
        : raw.source_type === "stock_transfer"
          ? "Stock Transfer"
          : raw.source_type === "purchase_return"
            ? "Purchase Return"
            : raw.source_type;
  const isPurchaseReturn = sourceDocType === "Purchase Return";
  const isStockTransfer = sourceDocType === "Stock Transfer";

  const sourceDocumentNo =
    asString(snapshot.source_document_no) ||
    asString(snapshot.sourceDocumentNo) ||
    asString(raw.packing_list?.customer_snapshot?.source_document_no) ||
    asString(raw.packing_list?.packing_number) ||
    "";

  const sourceWarehouse =
    asString(snapshot.source_warehouse) ||
    asString(snapshot.from_warehouse) ||
    warehouse;

  const targetWarehouse =
    asString(snapshot.target_warehouse) ||
    asString(snapshot.to_warehouse) ||
    asString(snapshot.customer_name) ||
    "—";

  const customer =
    (isPurchaseReturn
      ? asString(snapshot.supplier_name) || asString(snapshot.customer_name)
      : isStockTransfer
        ? asString(snapshot.to_warehouse) ||
          asString(snapshot.target_warehouse) ||
          asString(snapshot.customer_name)
        : asString(snapshot.customer_name) || asString(snapshot.supplier_name)) ||
    asString(raw.packing_list?.customer_name) ||
    asString(raw.packing_list?.customer_snapshot?.supplier_name) ||
    asString(raw.packing_list?.customer_snapshot?.customer_name) ||
    "";

  return {
    id: raw.packing_done_id,
    packingListId: raw.packing_list_id || raw.packing_list?.packing_list_id,
    packingNo: raw.packing_done_no,
    salesOrderNo: sourceDocumentNo,
    customer,
    totalItems: products.length,
    packedQuantity: products.reduce((sum: number, p: any) => {
      const packSize = Number(
        p.product_snapshot?.unit_per_packing ||
          p.product_snapshot?.conversion_rate ||
          1,
      ) || 1;
      const packedBaseQty = Number(p.packed_base_qty ?? p.base_qty ?? 0);
      if (isPurchaseReturn) return sum + packedBaseQty;
      return sum + Math.floor(packedBaseQty / packSize);
    }, 0),
    packingDate: raw.packing_date ? String(raw.packing_date).slice(0, 10) : "",
    packedBy: raw.packed_by_user
      ? `${raw.packed_by_user.first_name || ""} ${raw.packed_by_user.last_name || ""}`.trim() ||
        raw.packed_by_user.username
      : "System",
    status: raw.status as any,
    warehouse,
    sourceDocumentType: sourceDocType as any,
    sourceDocumentNo,
    sourceWarehouse,
    targetWarehouse: isStockTransfer ? targetWarehouse : "—",
    poNumber:
      asString(snapshot.po_number) ||
      asString(snapshot.poNumber) ||
      asString(snapshot.po_no) ||
      asString(raw.po_number) ||
      asString(raw.packing_list?.customer_snapshot?.po_number) ||
      asString(raw.packing_list?.customer_snapshot?.poNumber) ||
      "",
    supplierCode:
      asString(snapshot.supplier_code) ||
      asString(snapshot.supplierCode) ||
      asString(raw.supplier_code) ||
      asString(raw.packing_list?.customer_snapshot?.supplier_code) ||
      "",
    products: products.map((p: any) => {
      const display = extractPackingProductDisplay(p);
      const packSize = display.packSize;
      const packedBaseQty = Number(p.packed_base_qty ?? p.base_qty ?? 0);
      const orderBaseQty = Number(
        p.order_base_qty ?? p.packing_list_product?.order_base_qty ?? 0,
      );
      const batchSnapshot =
        p.batch_snapshot && typeof p.batch_snapshot === "object"
          ? (p.batch_snapshot as Record<string, unknown>)
          : {};
      const batchNumber =
        asString(p.batch_code) ||
        asString(batchSnapshot.batch_code) ||
        asString(batchSnapshot.batch_no) ||
        asString(batchSnapshot.batchNumber) ||
        "";
      const expDate = formatDetailDate(
        asString(batchSnapshot.expiry_date) ||
          asString(batchSnapshot.expiryDate) ||
          asString(batchSnapshot.exp_date),
      );
      const mfgDate = formatDetailDate(
        asString(batchSnapshot.mfg_date) ||
          asString(batchSnapshot.manufacture_date) ||
          asString(batchSnapshot.manufactureDate),
      );
      const grnNo =
        asString(batchSnapshot.grn_no) ||
        asString(batchSnapshot.grnNumber) ||
        asString(batchSnapshot.grn_number) ||
        "";

      const orderedDisplay = isPurchaseReturn
        ? orderBaseQty
        : Math.floor(orderBaseQty / packSize);
      const packedDisplay = isPurchaseReturn
        ? packedBaseQty
        : Math.floor(packedBaseQty / packSize);

      return {
        product: display.productName || "Unknown",
        sku: display.sku,
        productCode: display.productCode || display.sku,
        ordered_cases: orderedDisplay,
        packedQty: packedDisplay,
        orderBaseQty,
        packedBaseQty,
        packSize,
        productSnapshot: display.productSnapshot,
        lineId: p.packing_list_product_id,
        batchNumber: batchNumber || undefined,
        expDate: expDate || undefined,
        mfgDate: mfgDate || undefined,
        grnNo: grnNo || undefined,
        quantity_type: asString(p.quantity_type) || undefined,
        batchAllocations: batchNumber
          ? [
              {
                batchNumber,
                allocatedQty: packedDisplay,
                expiryDate: expDate || "—",
              },
            ]
          : undefined,
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
  const packingListFilters: Record<string, unknown> = {};

  if (selectedWarehouse && selectedWarehouse !== "All") {
    apiFilters.warehouse_id = selectedWarehouse;
  }

  const warehouseName = firstFilterValue(filters.warehouse);
  if (warehouseName) {
    packingListFilters.warehouse = { warehouse_name: warehouseName };
  }

  const customerName = firstFilterValue(filters.customer);
  if (customerName) {
    packingListFilters.customer_name = customerName;
  }

  if (Object.keys(packingListFilters).length > 0) {
    apiFilters.packing_list = packingListFilters;
  }

  const status = firstFilterValue(filters.status);
  if (status) {
    apiFilters.status = status;
  }

  const packingDoneNo = firstFilterValue(filters.packingNo);
  if (packingDoneNo) {
    apiFilters.packing_done_no = packingDoneNo;
  }

  const orderNo = firstFilterValue(filters.salesOrderNo);
  if (orderNo) {
    apiFilters.source_document_no = orderNo;
  }

  const packedBy = firstFilterValue(filters.packedBy);
  if (packedBy) {
    apiFilters.packed_by_user = { username: packedBy };
  }

  const poNumber = firstFilterValue(filters.poNumber);
  if (poNumber) {
    apiFilters.po_number = poNumber;
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
    salesOrderNo: "source_document_no",
    poNumber: "po_number",
    customer: "packing_list__customer_name",
    warehouse: "packing_list__warehouse__warehouse_name",
    packedBy: "packed_by_user__username",
    packingDate: "packing_date",
    status: "status",
    totalItems: "item_count",
    packedQuantity: "packed_qty",
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

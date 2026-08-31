import { axiosInstance as api } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { FilterState } from "@/components/listing/types";

export async function getPreviewNumber(warehouseId?: string | null): Promise<string> {
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.PREVIEW_NUMBER, {
    params: warehouseId ? { warehouse_id: warehouseId } : undefined,
    headers: { "Cache-Control": "no-cache" },
  });
  const data = response.data?.data;
  return typeof data === "string" ? data : data?.dispatchNumber || data?.dispatch_number || "";
}

export async function getDispatches(payload: any = {}) {
  const { page, page_size, search, ordering, filters } = payload;
  const params: any = {};
  if (page) params.page = page;
  if (page_size) params.page_size = page_size;
  if (search) params.search = search;
  if (ordering) params.ordering = ordering;
  
  const response = await api.post(API_ENDPOINTS.WAREHOUSE.DISPATCH.LIST, { filters: filters || {} }, { params });
  return response.data;
}

export interface DispatchDropdownItem {
  id: string;
  dispatch_number: string;
  source_type: string;
  source_id: string | null;
  source_document_no: string;
  status: string;
  customer_id: string | null;
  customer_name: string;
  customer_code?: string;
  warehouse_id: string | null;
  warehouse_name: string;
  label: string;
}

export type DispatchFilterOption = { label: string; value: string };

export type DispatchSourceTab =
  | "sales_order"
  | "sample"
  | "stock_transfer"
  | "purchase_return";

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

export function resolveDispatchApiSourceType(
  subTab: DispatchSourceTab,
): "normal_sales" | "sample" | "stock_transfer" | "purchase_return" {
  if (subTab === "sales_order") return "normal_sales";
  if (subTab === "sample") return "sample";
  if (subTab === "stock_transfer") return "stock_transfer";
  return "purchase_return";
}

/** Map listing column filters to backend whitelist keys. */
export function buildDispatchApiFilters(
  filters: FilterState,
  options: {
    selectedWarehouse?: string | null;
    sourceType: string;
  },
): Record<string, unknown> {
  const apiFilters: Record<string, unknown> = {
    source_type: options.sourceType,
  };

  if (options.selectedWarehouse && options.selectedWarehouse !== "All") {
    apiFilters.warehouse_id = options.selectedWarehouse;
  }

  const dispatchNo = firstFilterValue(filters.dispatch_number);
  if (dispatchNo) apiFilters.dispatch_number = dispatchNo;

  const sourceDocNo = firstFilterValue(filters.source_document_no);
  if (sourceDocNo) apiFilters.source_document_no = sourceDocNo;

  const party = firstFilterValue(filters["customer.customer_name"]);
  if (party) {
    if (options.sourceType === "stock_transfer") {
      apiFilters.to_warehouse = party;
    } else {
      apiFilters.customer_name = party;
    }
  }

  const warehouseName = firstFilterValue(filters.source_warehouse_name);
  if (warehouseName) {
    apiFilters.warehouse = { warehouse_name: warehouseName };
  }

  const vehicleNo = firstFilterValue(filters.vehicleNumber);
  if (vehicleNo) apiFilters.vehicle_number = vehicleNo;

  const transporter = firstFilterValue(filters.driverName);
  if (transporter) apiFilters.transporter = transporter;

  const status = firstFilterValue(filters.status);
  if (status) apiFilters.status = status;

  const dateRange = filters.dispatch_date;
  if (
    dateRange &&
    typeof dateRange === "object" &&
    ("fromDate" in dateRange || "toDate" in dateRange)
  ) {
    apiFilters.range = {
      dispatch_date: {
        from: (dateRange as { fromDate?: string }).fromDate,
        to: (dateRange as { toDate?: string }).toDate,
      },
    };
  }

  return apiFilters;
}

export function buildDispatchOrdering(
  sortKey: string,
  direction: "asc" | "desc" | "none",
): string | undefined {
  if (!sortKey || direction === "none") return undefined;

  const fieldMap: Record<string, string> = {
    dispatch_number: "dispatch_number",
    source_document_no: "source_document_no",
    "customer.customer_name": "customer.customer_name",
    source_warehouse_name: "source_warehouse_name",
    orderAmount: "order_amount",
    vehicleNumber: "vehicle_number",
    driverName: "transporter",
    dispatch_date: "dispatch_date",
    status: "status",
  };

  const backendKey = fieldMap[sortKey];
  if (!backendKey) return undefined;
  return direction === "desc" ? `-${backendKey}` : backendKey;
}

function pickFilterOptionValue(row: Record<string, unknown>, fieldName: string): string {
  const direct = asString(row[fieldName]).trim();
  if (direct) return direct;
  for (const value of Object.values(row)) {
    const text = asString(value).trim();
    if (text) return text;
  }
  return "";
}

/** Lightweight dispatch options for form selects (prefer over list API). */
export async function getDispatchDropdown(params?: {
  source_type?: string;
  status?: string;
  exclude_fully_returned?: boolean;
}): Promise<DispatchDropdownItem[]> {
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.DROPDOWN, {
    params: params || {},
  });
  const data = response.data?.data;
  return Array.isArray(data) ? data : [];
}

export async function getDispatchById(id: string) {
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.DETAILS(id));
  return response.data?.data;
}

export async function createDispatch(payload: any) {
  const response = await api.post(API_ENDPOINTS.WAREHOUSE.DISPATCH.CREATE, payload);
  return response.data;
}

export async function updateDispatch(id: string, payload: any) {
  const response = await api.patch(`/warehouse/dispatch/${id}`, payload);
  return response.data;
}

export async function updateDispatchStatus(id: string, status: string) {
  const response = await api.patch(`/warehouse/dispatch/${id}/status`, { status });
  return response.data;
}

export async function getDispatchFilterDropdown(
  fieldName: string,
  sourceType?: string,
  options?: {
    status?: string;
    excludeExistingStGrn?: boolean;
    warehouseId?: string;
  },
): Promise<DispatchFilterOption[]> {
  const params: Record<string, string> = { field_name: fieldName };
  if (sourceType) params.source_type = sourceType;
  if (options?.status) params.status = options.status;
  if (options?.excludeExistingStGrn) params.exclude_existing_st_grn = "true";
  if (options?.warehouseId) params.warehouse_id = options.warehouseId;

  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.FILTER_DROPDOWN, {
    params,
  });
  const data = response.data?.data;
  if (!Array.isArray(data)) return [];

  return data
    .map((row: Record<string, unknown>) => {
      const value = pickFilterOptionValue(row, fieldName);
      return value ? { label: value, value } : null;
    })
    .filter((opt): opt is DispatchFilterOption => Boolean(opt));
}

export async function revertDispatch(id: string) {
  const response = await api.post(API_ENDPOINTS.WAREHOUSE.DISPATCH.REVERT(id));
  return response.data;
}

export async function allocateDeliveryChallanNumber(id: string): Promise<string> {
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.ALLOCATE_DC(id));
  const data = response.data?.data;
  return (
    data?.challan_number ||
    response.data?.challan_number ||
    ""
  );
}

export async function allocateSalesInvoiceNumber(id: string): Promise<string> {
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.ALLOCATE_SI(id));
  const data = response.data?.data;
  return (
    data?.invoice_no ||
    response.data?.invoice_no ||
    ""
  );
}

export async function allocateStockTransferInvoiceNumber(id: string): Promise<string> {
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.ALLOCATE_ST(id));
  const data = response.data?.data;
  return (
    data?.invoice_no ||
    response.data?.invoice_no ||
    ""
  );
}

export async function downloadDeliveryChallan(
  id: string,
  options: { withGoodsValue?: boolean } = {},
): Promise<void> {
  const { blob, fileName } = await fetchDeliveryChallanPdf(id, options);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchDeliveryChallanPreview(
  id: string,
  options: { withGoodsValue?: boolean } = {},
): Promise<{ html: string; fileName: string; challanNumber: string }> {
  const withGoodsValue = options.withGoodsValue !== false;
  const response = await api.get(
    API_ENDPOINTS.WAREHOUSE.DISPATCH.CHALLAN_PREVIEW(id),
    { params: { withGoodsValue } },
  );
  const data = response.data?.data || {};
  return {
    html: String(data.html || ""),
    fileName: String(data.fileName || "delivery-challan.pdf"),
    challanNumber: String(data.challan_number || data.challanNumber || ""),
  };
}

export async function fetchDeliveryChallanPdf(
  id: string,
  options: { withGoodsValue?: boolean } = {},
): Promise<{ blob: Blob; fileName: string }> {
  const withGoodsValue = options.withGoodsValue !== false;
  const response = await api.get(
    API_ENDPOINTS.WAREHOUSE.DISPATCH.DOWNLOAD_CHALLAN(id),
    {
      responseType: "blob",
      params: { withGoodsValue },
    },
  );
  const blob = response.data as Blob;
  const disposition = response.headers?.["content-disposition"] as string | undefined;
  const matched = disposition?.match(/filename="?([^"]+)"?/i);
  return {
    blob,
    fileName:
      matched?.[1] ||
      `delivery-challan-${withGoodsValue ? "with-value" : "without-value"}-${id}.pdf`,
  };
}

/** Open official server PDF in a new tab for printing. */
export async function printDeliveryChallan(
  id: string,
  options: { withGoodsValue?: boolean } = {},
): Promise<void> {
  const { blob } = await fetchDeliveryChallanPdf(id, options);
  const url = window.URL.createObjectURL(blob);
  const popup = window.open(url, "_blank");
  if (!popup) {
    window.URL.revokeObjectURL(url);
    throw new Error("Popup blocked. Allow popups to print the delivery challan.");
  }
  const revoke = () => window.URL.revokeObjectURL(url);
  popup.addEventListener("load", () => {
    try {
      popup.focus();
      popup.print();
    } finally {
      setTimeout(revoke, 60_000);
    }
  });
  // Fallback revoke
  setTimeout(revoke, 120_000);
}

export async function getFilterDropdown(fieldName: string, sourceType?: string) {
  const params: any = { field_name: fieldName };
  if (sourceType) params.source_type = sourceType;
  
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.FILTER_DROPDOWN, { params });
  return response.data?.data || [];
}

export async function getPackingDoneList(payload: any = {}) {
  const response = await api.post(API_ENDPOINTS.WAREHOUSE.PACKING_DONE.LIST, payload);
  return response.data;
}

export async function getPackingDoneById(id: string) {
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.PACKING_DONE.DETAILS(id));
  return response.data?.data;
}

export interface PackedOrderDropdownItem {
  order_id: string;
  order_number: string;
  order_status: string | null;
  source_type: string;
  label: string;
  packing_list: {
    packing_list_id: string;
    packing_number: string;
    status: string;
    warehouse_id: string;
    warehouse_name: string;
    customer_name: string;
    order_amount: number;
    order_date: string | null;
    expected_delivery_date: string | null;
    customer_snapshot: unknown;
    remarks: string | null;
    generated_at: string | null;
    created_at: string;
    packing_dones: Array<{
      packing_done_id: string;
      packing_done_no: string;
      status: string;
      packing_date: string | null;
      warehouse_id: string | null;
      products?: Array<{
        packing_done_product_id: string;
        packing_list_product_id: string;
        product_id: string;
        product_code: string | null;
        sku?: string | null;
        product_name: string | null;
        product_snapshot: unknown;
        batch_code: string | null;
        batch_snapshot: unknown;
        /** Qty packed in THIS packing done (base units). */
        base_qty: number;
        order_base_qty: number;
        packed_base_qty: number;
        pending_base_qty: number;
        quantity_type: string | null;
        unit_per_packing: number;
        remarks: string | null;
      }>;
    }>;
    products: Array<{
      packing_list_product_id: string;
      source_item_id: string | null;
      product_id: string;
      product_code: string | null;
      product_name: string | null;
      product_snapshot: unknown;
      batch_code: string | null;
      batch_snapshot: unknown;
      order_base_qty: number;
      packed_base_qty: number;
      pending_base_qty: number;
      quantity_type: string | null;
      unit_per_packing?: number;
      remarks: string | null;
    }>;
  };
}

export async function getPackedOrdersDropdown(params?: {
  source_type?: string;
  warehouse_id?: string;
}): Promise<PackedOrderDropdownItem[]> {
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.PACKING_LIST.ORDERS_DROPDOWN, {
    params: params || {},
  });
  const data = response.data?.data;
  return Array.isArray(data) ? data : [];
}
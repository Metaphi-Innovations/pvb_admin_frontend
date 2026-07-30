import { axiosInstance as api } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

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

/** Lightweight dispatch options for form selects (prefer over list API). */
export async function getDispatchDropdown(params?: {
  source_type?: string;
  status?: string;
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
  },
) {
  const params: any = { field_name: fieldName };
  if (sourceType) params.source_type = sourceType;
  if (options?.status) params.status = options.status;
  if (options?.excludeExistingStGrn) params.exclude_existing_st_grn = "true";
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.FILTER_DROPDOWN, { params });
  return response.data?.data || [];
}

export async function revertDispatch(id: string) {
  const response = await api.post(API_ENDPOINTS.WAREHOUSE.DISPATCH.REVERT(id));
  return response.data;
}

export async function downloadDeliveryChallan(id: string): Promise<void> {
  const { blob, fileName } = await fetchDeliveryChallanPdf(id);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function fetchDeliveryChallanPdf(
  id: string,
): Promise<{ blob: Blob; fileName: string }> {
  const response = await api.get(API_ENDPOINTS.WAREHOUSE.DISPATCH.DOWNLOAD_CHALLAN(id), {
    responseType: "blob",
  });
  const blob = response.data as Blob;
  const disposition = response.headers?.["content-disposition"] as string | undefined;
  const matched = disposition?.match(/filename="?([^"]+)"?/i);
  return {
    blob,
    fileName: matched?.[1] || `delivery-challan-${id}.pdf`,
  };
}

/** Open official server PDF in a new tab for printing. */
export async function printDeliveryChallan(id: string): Promise<void> {
  const { blob } = await fetchDeliveryChallanPdf(id);
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
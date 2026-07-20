import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { SalesOrder, SalesOrderLineItem } from "@/app/(app)/sales/sample-order/orders-data";
import type { SalesOrderFormValues } from "@/app/(app)/sales/sample-order/components/SampleOrderForm";

function asString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return String(value);
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

export function mapBackendStatusToFrontend(status: string): any {
  const s = asString(status).toUpperCase().replace(/[\s_]+/g, "_");
  if (s === "PENDING_APPROVAL" || s === "SUBMITTED") return "pending_approval";
  if (s === "APPROVED") return "approved";
  if (s === "REJECTED") return "rejected";
  if (s === "CONFIRMED") return "confirmed";
  if (s === "READY_FOR_PACKING") return "ready_for_packing";
  if (s === "CANCELLED") return "cancelled";
  if (s === "DISPATCHED") return "dispatched";
  if (s === "DELIVERED") return "delivered";
  if (s === "PACKED" || s === "FULLY_PACKED" || s === "PICKING") return "fully_packed";
  return "draft";
}

export function mapFrontendStatusToBackend(status: string): string {
  const s = asString(status).toLowerCase();
  if (s === "pending_approval") return "SUBMITTED";
  if (s === "approved") return "APPROVED";
  if (s === "rejected") return "REJECTED";
  if (s === "confirmed") return "APPROVED";
  if (s === "cancelled") return "CANCELLED";
  if (s === "dispatched") return "DISPATCHED";
  if (s === "delivered") return "DELIVERED";
  if (s === "packed") return "PICKING";
  return "DRAFT";
}

function mapBackendLineItem(raw: any, idx: number): SalesOrderLineItem {
  const prodSnapshot = raw.product_snapshot || {};
  const product = raw.product || {};
  const unitsPerPacking = asNumber(prodSnapshot.conversion_qty || product.unit_per_packing || 1);
  const totalQty = asNumber(raw.base_qty);
  const caseQty = Math.floor(totalQty / unitsPerPacking);
  const pieceQty = totalQty % unitsPerPacking;

  let quantityType = "Piece";
  if (raw.quantity_type) {
    quantityType = String(raw.quantity_type).toUpperCase() === "CASE" ? "Case" : "Piece";
  } else {
    quantityType = caseQty > 0 ? "Case" : "Piece";
  }

  return {
    id: asString(raw.sample_order_item_id || `line-${idx}`),
    productId: raw.product_id,
    productCode: asString(prodSnapshot.product_code || product.product_code || raw.product_code),
    productName: asString(prodSnapshot.product_name || product.product_name || raw.product_name),
    availableStock: asNumber(raw.stock_available),
    quantity: totalQty,
    caseQuantity: caseQty,
    pieceQuantity: pieceQty,
    packSize: unitsPerPacking,
    quantityType: quantityType as "Case" | "Piece",
    unitPrice: asNumber(raw.dp_price),
    discount: asNumber(raw.discount_percent),
    discountValue: asNumber(raw.discount_amount),
    gstAmount: asNumber(raw.tax_amount),
    lineTotal: asNumber(raw.line_total),
    unit: asString(prodSnapshot.base_unit || product.unit || "Unit"),
    packingUnit: asString(prodSnapshot.packing_unit || product.packing_unit || "Unit"),
    batchNumber: asString(raw.batch_no),
    expiryDate: raw.expiry_date ? asDateOnly(raw.expiry_date) : undefined,
  };
}

export function mapBackendSampleOrder(raw: any): SalesOrder {
  const cust = raw.customer || {};
  const wh = raw.warehouse || {};
  const salesperson = raw.salesperson || {};
  const rawItems = Array.isArray(raw.items) ? raw.items : [];

  return {
    id: raw.sample_order_id || raw.id,
    soNumber: asString(raw.order_no),
    customerId: raw.customer_id || cust.customer_id,
    customerName: asString(cust.customer_name),
    customerCode: asString(cust.customer_code),
    territory: asString(cust.territory || ""),
    salesManId: raw.salesperson_id || salesperson.user_id,
    salesManName: salesperson ? `${salesperson.first_name || ""} ${salesperson.last_name || ""}`.trim() : "",
    salesManCode: asString(salesperson.employee_id || salesperson.username || ""),
    orderDate: asDateOnly(raw.order_date),
    deliveryDate: asDateOnly(raw.order_date),
    status: mapBackendStatusToFrontend(raw.status),
    remarks: asString(raw.remarks),
    totalAmount: asNumber(raw.grand_total),
    requiresApproval: raw.status === "SUBMITTED" || raw.status === "PENDING_APPROVAL",
    items: raw._count?.items ?? rawItems.length,
    lineItems: rawItems.map((item: any, idx: number) => mapBackendLineItem(item, idx)),
    warehouseId: raw.warehouse_id || wh.warehouse_id,
    warehouseName: asString(wh.warehouse_name),
    warehouseCode: asString(wh.warehouse_code || wh.code || ""),
    createdBy: raw.created_by_user ? `${raw.created_by_user.first_name || ""} ${raw.created_by_user.last_name || ""}`.trim() : "Admin",
    createdDate: asDateOnly(raw.created_at),
    updatedBy: raw.updated_by_user ? `${raw.updated_by_user.first_name || ""} ${raw.updated_by_user.last_name || ""}`.trim() : "Admin",
    updatedDate: asDateOnly(raw.updated_at),
    purpose: raw.purpose || undefined,
    recipientType: raw.recipient_type || undefined,
    recipientName: raw.recipient_name || undefined,
    recipientContact: raw.recipient_contact || undefined,
    recipientAddress: raw.recipient_address || undefined,
    billingParty: raw.billing_party || undefined,
  };
}

function buildBackendWriteBody(
  form: SalesOrderFormValues,
  options: { orderNo: string; status: string }
): Record<string, any> {
  const items = (form.lineItems || []).map((line: SalesOrderLineItem) => {
    return {
      product_id: line.productId,
      quantity_type: line.quantityType,
      stock_available: line.availableStock || 0,
      base_qty: line.quantity,
      dp_price: line.unitPrice || 0,
      discount_percent: line.discount !== undefined ? line.discount : 100,
      discount_amount: line.discountValue || 0,
      taxable_amount: line.lineTotal || 0,
      tax_amount: line.gstAmount || 0,
      line_total: line.lineTotal || 0,
      remarks: "",
    };
  });

  const totals = form.lineItems.reduce((acc: any, line: SalesOrderLineItem) => {
    return {
      total_qty: acc.total_qty + line.quantity,
      product_subtotal: acc.product_subtotal + (line.unitPrice * line.quantity),
      discount_total: acc.discount_total + (line.discountValue || 0),
      taxable_amount: acc.taxable_amount + (line.lineTotal || 0),
      tax_amount: acc.tax_amount + (line.gstAmount || 0),
      grand_total: acc.grand_total + (line.lineTotal || 0),
    };
  }, { total_qty: 0, product_subtotal: 0, discount_total: 0, taxable_amount: 0, tax_amount: 0, grand_total: 0 });

  return {
    order_no: options.orderNo,
    order_date: form.orderDate ? new Date(form.orderDate).toISOString() : new Date().toISOString(),
    status: mapFrontendStatusToBackend(options.status),
    remarks: form.remarks || null,
    customer_id: form.customerId,
    warehouse_id: form.warehouseId,
    salesperson_id: form.salesManId,
    ...totals,
    items,
  };
}

export const SampleOrderService = {
  async getNextNumber(signal?: AbortSignal): Promise<string> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.SAMPLE_ORDER.NEXT_NUMBER, { signal });
    return response.data?.data?.order_no || "";
  },

  async getDropdown(signal?: AbortSignal): Promise<any[]> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.SAMPLE_ORDER.DROPDOWN, { signal });
    return response.data?.data || [];
  },

  async getFilterDropdown(fieldName: string, signal?: AbortSignal): Promise<any[]> {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.SALES.SAMPLE_ORDER.FILTER}?field_name=${fieldName}`,
      { signal }
    );
    return response.data?.data || [];
  },

  async list(params: {
    page: number;
    pageSize: number;
    search?: string;
    ordering?: string;
    apiFilters?: Record<string, unknown>;
    signal?: AbortSignal;
  }): Promise<{ items: SalesOrder[]; total: number }> {
    const queryParams = new URLSearchParams();
    queryParams.set("page", String(params.page));
    queryParams.set("page_size", String(params.pageSize));
    if (params.search) queryParams.set("search", params.search);
    if (params.ordering) queryParams.set("ordering", params.ordering);

    const body = { filters: params.apiFilters || {} };
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.SALES.SAMPLE_ORDER.LIST}?${queryParams.toString()}`,
      body,
      { signal: params.signal }
    );

    const backendItems = Array.isArray(response.data?.data) ? response.data.data : [];
    const totalRecords = response.data?.totalRecords ?? backendItems.length;

    return {
      items: backendItems.map((item: any) => mapBackendSampleOrder(item)),
      total: totalRecords,
    };
  },

  async create(form: SalesOrderFormValues, options: { orderNo: string; status: string }): Promise<SalesOrder> {
    const body = buildBackendWriteBody(form, options);
    const response = await axiosInstance.post(API_ENDPOINTS.SALES.SAMPLE_ORDER.CREATE, body);
    return mapBackendSampleOrder(response.data?.data);
  },

  async getById(id: string, signal?: AbortSignal): Promise<SalesOrder> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.SAMPLE_ORDER.DETAILS(id), { signal });
    return mapBackendSampleOrder(response.data?.data);
  },

  async update(id: string, form: SalesOrderFormValues, options: { orderNo: string; status: string }): Promise<SalesOrder> {
    const body = buildBackendWriteBody(form, options);
    const response = await axiosInstance.put(API_ENDPOINTS.SALES.SAMPLE_ORDER.UPDATE(id), body);
    return mapBackendSampleOrder(response.data?.data);
  },

  async updateStatus(id: string, status: string, remarks?: string): Promise<SalesOrder> {
    const backendStatus = mapFrontendStatusToBackend(status);
    const response = await axiosInstance.patch(API_ENDPOINTS.SALES.SAMPLE_ORDER.UPDATE_STATUS(id), {
      status: backendStatus,
      remarks: remarks || null,
    });
    return mapBackendSampleOrder(response.data?.data);
  },

  async export(params: {
    search?: string;
    ordering?: string;
    apiFilters?: Record<string, unknown>;
  }): Promise<string> {
    const queryParams = new URLSearchParams();
    if (params.search) queryParams.set("search", params.search);
    if (params.ordering) queryParams.set("ordering", params.ordering);

    const body = { filters: params.apiFilters || {} };
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.SALES.SAMPLE_ORDER.EXPORT}?${queryParams.toString()}`,
      body,
      { responseType: "text" }
    );
    return response.data;
  },

  async downloadNote(id: string): Promise<Blob> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.SAMPLE_ORDER.DOWNLOAD_NOTE(id), {
      responseType: "blob",
    });
    return response.data;
  },
};

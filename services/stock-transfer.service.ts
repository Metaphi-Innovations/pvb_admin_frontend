import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { StockTransfer, TransferLineItem, StockTransferFormValues, TransferStatus } from "@/app/(app)/sales/stock-transfer/stock-transfer-data";
import type { SalesOrderAdditionalExpense } from "@/app/(app)/sales/orders/orders-data";

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

export function mapBackendStatusToFrontend(status: string): TransferStatus {
  const s = status ? status.toUpperCase() : "";
  switch (s) {
    case "DRAFT": return "draft";
    case "SUBMITTED": return "pending_approval";
    case "APPROVED": return "approved";
    case "PICKING": return "packing_in_progress";
    case "IN_TRANSIT": return "in_transit";
    case "RECEIVED": return "received";
    case "CANCELLED": return "cancelled";
    default: return "draft";
  }
}

export function mapFrontendStatusToBackend(status: string): string {
  const s = status ? status.toLowerCase() : "";
  switch (s) {
    case "draft": return "DRAFT";
    case "pending_approval": return "SUBMITTED";
    case "approved": return "APPROVED";
    case "confirmed": return "APPROVED";
    case "packing_in_progress": return "PICKING";
    case "in_transit": return "IN_TRANSIT";
    case "received": return "RECEIVED";
    case "rejected": return "REJECTED";
    case "cancelled": return "CANCELLED";
    default: return "DRAFT";
  }
}

function mapBackendLineItem(raw: any, idx: number): TransferLineItem {
  const prod = raw.product_snapshot || {};
  const batch = raw.batch_snapshot || {};
  const unitsPerPacking = asNumber(prod.conversion_qty || 1);
  const totalQty = asNumber(raw.transfer_base_qty);
  const caseQty = Math.floor(totalQty / unitsPerPacking);
  const pieceQty = totalQty % unitsPerPacking;

  return {
    id: asString(raw.stock_transfer_item_id || `line-${idx}`),
    productId: raw.product_id,
    productCode: asString(prod.product_code || raw.product_code),
    productName: asString(prod.product_name || raw.product_name),
    availableStock: asNumber(raw.available_base_qty),
    quantity: totalQty,
    caseQuantity: caseQty,
    pieceQuantity: pieceQty,
    quantityType: caseQty > 0 ? "Case" : "Piece",
    unitPrice: asNumber(raw.cp_price),
    dealerPrice: asNumber(raw.cp_price),
    discount: 0,
    discountValue: 0,
    schemeDiscountPercent: 0,
    schemeDiscountAmount: 0,
    finalRate: asNumber(raw.cp_price),
    schemeApplied: "No" as const,
    gstAmount: asNumber(raw.cgst_amount) + asNumber(raw.sgst_amount),
    lineTotal: asNumber(raw.total_amount),
    batchNumber: asString(batch.batch_code || raw.batch_no),
    batchInventoryId: raw.inventory_batch_id || undefined,
    expiryDate: batch.expiry_date ? asDateOnly(batch.expiry_date) : undefined,
    gstRate: prod.gst_percent ? `${prod.gst_percent}%` : "0%",
    packingUnit: asString(prod.packing_unit || "Unit"),
    baseUnit: asString(prod.base_unit || "Unit"),
    unitsPerPackingUnit: unitsPerPacking,
  };
}

function mapBackendExpense(raw: any, idx: number): SalesOrderAdditionalExpense {
  return {
    id: asString(raw.id || `exp-${idx}`),
    expenseName: asString(raw.charge_name),
    amount: asNumber(raw.amount),
    discountType: "percent",
    discountValue: 0,
    netAmount: asNumber(raw.amount),
    gstRate: asString(raw.gst_percent || "0"),
    cgstAmount: asNumber(raw.cgst_amount),
    sgstAmount: asNumber(raw.sgst_amount),
    igstAmount: asNumber(raw.igst_amount),
    gstAmount: asNumber(raw.cgst_amount ?? 0) + asNumber(raw.sgst_amount ?? 0) + asNumber(raw.igst_amount ?? 0),
    totalAmount: asNumber(raw.total_amount),
    remarks: asString(raw.remarks),
  };
}

export function mapBackendStockTransfer(raw: any): StockTransfer {
  const fromWh = raw.from_warehouse || {};
  const toWh = raw.to_warehouse || {};
  const req = raw.requester || {};
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const rawExpenses = Array.isArray(raw.expenses) ? raw.expenses : [];

  return {
    id: raw.stock_transfer_id,
    transferNumber: asString(raw.transfer_no),
    transferDate: asDateOnly(raw.transfer_date),
    deliveryDate: asDateOnly(raw.expected_delivery),
    sourceWarehouseId: raw.from_warehouse_id || fromWh.warehouse_id,
    sourceWarehouseName: asString(fromWh.warehouse_name),
    sourceWarehouseCode: asString(fromWh.warehouse_code),
    targetWarehouseId: raw.to_warehouse_id || toWh.warehouse_id,
    targetWarehouseName: asString(toWh.warehouse_name),
    targetWarehouseCode: asString(toWh.warehouse_code),
    status: mapBackendStatusToFrontend(raw.status),
    requestedBy: raw.requested_by || req.user_id || "",
    reasonPurpose: asString(raw.reason),
    remarks: asString(raw.remarks),
    transportDetails: raw.transport_details?.details || (typeof raw.transport_details === "string" ? raw.transport_details : ""),
    lineItems: rawItems.map((item: any, idx: number) => mapBackendLineItem(item, idx)),
    additionalExpenses: rawExpenses.map((exp: any, idx: number) => mapBackendExpense(exp, idx)),
    totalAmount: asNumber(raw.grand_total),
    totalItems: asNumber(raw.total_products) || rawItems.length,
    totalQuantity: asNumber(raw.total_quantity),
    createdBy: raw.created_by_user ? `${raw.created_by_user.first_name || ""} ${raw.created_by_user.last_name || ""}`.trim() : "Admin",
    createdDate: asDateOnly(raw.created_at),
    updatedBy: raw.updated_by_user ? `${raw.updated_by_user.first_name || ""} ${raw.updated_by_user.last_name || ""}`.trim() : "Admin",
    updatedDate: asDateOnly(raw.updated_at),
  };
}

function buildBackendWriteBody(
  form: StockTransferFormValues,
  options: { transferNo: string; status: string }
): Record<string, any> {
  const items = (form.lineItems || []).map((line) => {
    const cgstAmount = line.lineTotal ? Number(line.lineTotal) * 0.09 : 0;
    const sgstAmount = line.lineTotal ? Number(line.lineTotal) * 0.09 : 0;
    return {
      product_id: line.productId,
      inventory_batch_id: line.batchInventoryId || (line.id && line.id.toString().includes("-") && !line.id.toString().startsWith("line-") ? line.id : undefined),
      available_base_qty: line.availableStock,
      transfer_base_qty: line.quantity,
      cp_price: line.unitPrice,
      cgst_percent: 9,
      cgst_amount: cgstAmount,
      sgst_percent: 9,
      sgst_amount: sgstAmount,
      taxable_amount: line.lineTotal,
      total_amount: line.lineTotal ? line.lineTotal + cgstAmount + sgstAmount : 0,
      remarks: "",
    };
  });

  const expenses = (form.additionalExpenses || []).map((exp) => {
    const gstVal = asNumber(exp.gstRate);
    const isInter = (exp.igstAmount || 0) > 0;
    return {
      charge_name: exp.expenseName,
      amount: exp.amount,
      gst_percent: gstVal,
      cgst_percentage: isInter ? 0 : gstVal / 2,
      cgst_amount: isInter ? 0 : exp.cgstAmount,
      sgst_percentage: isInter ? 0 : gstVal / 2,
      sgst_amount: isInter ? 0 : exp.sgstAmount,
      igst_percentage: isInter ? gstVal : 0,
      igst_amount: isInter ? exp.igstAmount : 0,
      total_amount: exp.totalAmount,
      remarks: exp.remarks || "",
    };
  });

  const totalQty = items.reduce((acc, curr) => acc + curr.transfer_base_qty, 0);
  const subtotal = items.reduce((acc, curr) => acc + curr.taxable_amount, 0);
  const additionalExp = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalGst = items.reduce((acc, curr) => acc + (curr.cgst_amount || 0) + (curr.sgst_amount || 0), 0) +
                   expenses.reduce((acc, curr) => acc + (curr.cgst_amount || 0) + (curr.sgst_amount || 0) + (curr.igst_amount || 0), 0);

  return {
    transfer_no: options.transferNo,
    transfer_date: form.transferDate ? new Date(form.transferDate).toISOString() : null,
    expected_delivery: form.deliveryDate ? new Date(form.deliveryDate).toISOString() : null,
    status: mapFrontendStatusToBackend(options.status),
    reason: form.reasonPurpose || " replenishment ",
    remarks: form.remarks || null,
    from_warehouse_id: form.sourceWarehouseId,
    to_warehouse_id: form.targetWarehouseId,
    requested_by: form.requestedBy || undefined,
    transport_details: form.transportDetails ? { details: form.transportDetails } : null,
    total_products: items.length,
    total_quantity: totalQty,
    product_subtotal: subtotal,
    product_discount: 0,
    additional_expenses: additionalExp,
    taxable_amount: subtotal,
    gst_amount: totalGst,
    grand_total: subtotal + totalGst + additionalExp,
    items,
    expenses,
  };
}

export const StockTransferService = {
  async getNextNumber(signal?: AbortSignal): Promise<string> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.STOCK_TRANSFER.NEXT_NUMBER, { signal });
    return response.data?.data?.transfer_no || "";
  },

  async getDropdown(signal?: AbortSignal): Promise<{ warehouses: any[]; users: any[] }> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.STOCK_TRANSFER.DROPDOWN, { signal });
    return response.data?.data || { warehouses: [], users: [] };
  },

  async getFilterDropdown(fieldName: string, status?: string, signal?: AbortSignal): Promise<any[]> {
    let url = `${API_ENDPOINTS.SALES.STOCK_TRANSFER.FILTER}?field_name=${fieldName}`;
    if (status) {
      url += `&status=${status}`;
    }
    const response = await axiosInstance.get(url, { signal });
    return response.data?.data || [];
  },

  async getBatches(productId: string | number, warehouseId: string | number): Promise<any[]> {
    const response = await axiosInstance.get(
      `${API_ENDPOINTS.SALES.STOCK_TRANSFER.BATCHES}?product_id=${productId}&warehouse_id=${warehouseId}`
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
  }): Promise<{ items: StockTransfer[]; total: number }> {
    const queryParams = new URLSearchParams();
    queryParams.set("page", String(params.page));
    queryParams.set("page_size", String(params.pageSize));
    if (params.search) queryParams.set("search", params.search);
    if (params.ordering) queryParams.set("ordering", params.ordering);

    const body = { filters: params.apiFilters || {} };
    const { signal } = params;
    const response = await axiosInstance.post(
      `${API_ENDPOINTS.SALES.STOCK_TRANSFER.LIST}?${queryParams.toString()}`,
      body,
      { signal }
    );

    const backendItems = Array.isArray(response.data?.data) ? response.data.data : [];
    const totalRecords = response.data?.totalRecords ?? backendItems.length;

    return {
      items: backendItems.map((item: any) => mapBackendStockTransfer(item)),
      total: totalRecords,
    };
  },

  async create(form: StockTransferFormValues, options: { transferNo: string; status: string }): Promise<StockTransfer> {
    const body = buildBackendWriteBody(form, options);
    const response = await axiosInstance.post(API_ENDPOINTS.SALES.STOCK_TRANSFER.CREATE, body);
    return mapBackendStockTransfer(response.data?.data);
  },

  async getById(id: string, signal?: AbortSignal): Promise<StockTransfer> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.STOCK_TRANSFER.DETAILS(id), { signal });
    return mapBackendStockTransfer(response.data?.data);
  },

  async update(id: string, form: StockTransferFormValues, options: { transferNo: string; status: string }): Promise<StockTransfer> {
    const body = buildBackendWriteBody(form, options);
    const response = await axiosInstance.put(API_ENDPOINTS.SALES.STOCK_TRANSFER.UPDATE(id), body);
    return mapBackendStockTransfer(response.data?.data);
  },

  async updateStatus(id: string, status: string, remarks?: string): Promise<StockTransfer> {
    const backendStatus = mapFrontendStatusToBackend(status);
    const response = await axiosInstance.patch(API_ENDPOINTS.SALES.STOCK_TRANSFER.UPDATE_STATUS(id), {
      status: backendStatus,
      remarks: remarks || null,
    });
    return mapBackendStockTransfer(response.data?.data);
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
      `${API_ENDPOINTS.SALES.STOCK_TRANSFER.EXPORT}?${queryParams.toString()}`,
      body,
      { responseType: "text" }
    );
    return response.data;
  },

  async downloadNote(id: string): Promise<Blob> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.STOCK_TRANSFER.DOWNLOAD_NOTE(id), {
      responseType: "blob",
    });
    return response.data;
  },

  async getSummary(signal?: AbortSignal): Promise<{
    total: number;
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
    cancelled: number;
  }> {
    const response = await axiosInstance.get(API_ENDPOINTS.SALES.STOCK_TRANSFER.SUMMARY, { signal });
    return response.data?.data;
  },
};

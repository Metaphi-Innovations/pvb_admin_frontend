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
  const s = status ? status.toUpperCase().replace(/[\s_]+/g, "_") : "";
  switch (s) {
    case "DRAFT": return "draft";
    case "SUBMITTED": return "pending_approval";
    case "APPROVED": return "approved";
    case "PARTIALLY_RECEIVED": return "partially_received";
    case "RECEIVED": return "received";
    case "CANCELLED": return "cancelled";
    case "REJECTED": return "rejected";
    // Legacy values that used to live on status (warehouse flow) — treat as approved for display
    case "READY_FOR_PACKING":
    case "PICKING":
    case "FULLY_PACKED":
    case "PACKED":
    case "IN_TRANSIT":
      return "approved";
    default: return "draft";
  }
}

export function mapFrontendStatusToBackend(status: string): string {
  const s = status ? status.toLowerCase() : "";
  switch (s) {
    case "draft": return "DRAFT";
    case "pending_approval": return "SUBMITTED";
    case "approved":
    case "confirmed": return "APPROVED";
    case "partially_received": return "PARTIALLY_RECEIVED";
    case "received": return "RECEIVED";
    case "rejected": return "REJECTED";
    case "cancelled": return "CANCELLED";
    default: return "DRAFT";
  }
}

function mapBackendFulfillmentStatus(status: string): string {
  const raw = asString(status).trim();
  return raw || "PENDING";
}

function gstinStateCode(gstin?: string | null): string {
  const g = String(gstin || "").trim().toUpperCase();
  return g.length >= 2 ? g.slice(0, 2) : "";
}

/**
 * Legacy rows (before IGST columns) stored inter-state tax in CGST with SGST=0.
 * Only unfold when IGST columns are empty and context indicates inter-state.
 */
function unfoldLegacyFoldedIgst(params: {
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstPercentage: number;
  treatAsIgst?: boolean;
}): {
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
} {
  const {
    cgstPercentage,
    sgstPercentage,
    igstPercentage,
    cgstAmount,
    sgstAmount,
    igstAmount,
    gstPercentage,
    treatAsIgst,
  } = params;

  if (igstAmount > 0 || igstPercentage > 0) {
    return {
      cgstPercentage: igstAmount > 0 ? 0 : cgstPercentage,
      sgstPercentage: igstAmount > 0 ? 0 : sgstPercentage,
      igstPercentage: igstPercentage || (igstAmount > 0 ? gstPercentage : 0),
      cgstAmount: igstAmount > 0 ? 0 : cgstAmount,
      sgstAmount: igstAmount > 0 ? 0 : sgstAmount,
      igstAmount,
    };
  }

  const foldedIgst =
    Boolean(treatAsIgst) &&
    sgstAmount <= 0 &&
    sgstPercentage <= 0 &&
    cgstAmount > 0;

  if (foldedIgst) {
    return {
      cgstPercentage: 0,
      sgstPercentage: 0,
      igstPercentage: cgstPercentage || gstPercentage,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: cgstAmount,
    };
  }

  return {
    cgstPercentage,
    sgstPercentage,
    igstPercentage,
    cgstAmount,
    sgstAmount,
    igstAmount,
  };
}

function fillMissingTaxPercentages(params: {
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstPercentage: number;
}): {
  cgstPercentage: number;
  sgstPercentage: number;
  igstPercentage: number;
} {
  let { cgstPercentage, sgstPercentage, igstPercentage, cgstAmount, sgstAmount, igstAmount, gstPercentage } =
    params;

  if (igstAmount > 0 && igstPercentage <= 0 && gstPercentage > 0) {
    igstPercentage = gstPercentage;
  }
  if (
    cgstAmount > 0 &&
    sgstAmount > 0 &&
    cgstPercentage <= 0 &&
    sgstPercentage <= 0 &&
    gstPercentage > 0
  ) {
    const halfPct = Math.round((gstPercentage / 2) * 100) / 100;
    cgstPercentage = halfPct;
    sgstPercentage = Math.round((gstPercentage - halfPct) * 100) / 100;
  } else {
    if (cgstAmount > 0 && cgstPercentage <= 0 && gstPercentage > 0 && igstAmount <= 0) {
      cgstPercentage = Math.round((gstPercentage / 2) * 100) / 100;
    }
    if (sgstAmount > 0 && sgstPercentage <= 0 && gstPercentage > 0 && igstAmount <= 0) {
      sgstPercentage = Math.round((gstPercentage / 2) * 100) / 100;
    }
  }

  return { cgstPercentage, sgstPercentage, igstPercentage };
}

function mapBackendLineItem(
  raw: any,
  idx: number,
  opts?: { treatAsIgst?: boolean },
): TransferLineItem {
  const prod = raw.product_snapshot || {};
  const batch = raw.batch_snapshot || {};
  const unitsPerPacking = asNumber(prod.conversion_qty || 1) || 1;
  const totalQty = asNumber(raw.transfer_base_qty);
  const costPrice = asNumber(raw.cp_price ?? prod.cost_price ?? raw.product?.cost_price ?? 0);
  const caseQty = Math.floor(totalQty / unitsPerPacking);
  const pieceQty = totalQty % unitsPerPacking;

  let cgstPercentage = asNumber(raw.cgst_percent);
  let sgstPercentage = asNumber(raw.sgst_percent);
  let igstPercentage = asNumber(raw.igst_percent ?? raw.igst_percentage);
  let cgstAmount = asNumber(raw.cgst_amount);
  let sgstAmount = asNumber(raw.sgst_amount);
  let igstAmount = asNumber(raw.igst_amount);

  const productGstPct = asNumber(prod.gst_percent ?? raw.gst_percent);
  const storedSplitPct = cgstPercentage + sgstPercentage + igstPercentage;
  // Prefer stored tax; product GST master is fallback for display % only.
  const gstPercentage = storedSplitPct || productGstPct || 0;

  const computedTaxable = Math.round(totalQty * costPrice * 100) / 100;
  const storedTaxable = asNumber(raw.taxable_amount);
  const taxableAmount =
    computedTaxable > 0
      ? computedTaxable
      : storedTaxable > 0
        ? storedTaxable
        : Math.max(0, asNumber(raw.total_amount) - (cgstAmount + sgstAmount + igstAmount));

  ({
    cgstPercentage,
    sgstPercentage,
    igstPercentage,
    cgstAmount,
    sgstAmount,
    igstAmount,
  } = unfoldLegacyFoldedIgst({
    cgstPercentage,
    sgstPercentage,
    igstPercentage,
    cgstAmount,
    sgstAmount,
    igstAmount,
    gstPercentage: gstPercentage || productGstPct,
    treatAsIgst: opts?.treatAsIgst,
  }));

  ({ cgstPercentage, sgstPercentage, igstPercentage } = fillMissingTaxPercentages({
    cgstPercentage,
    sgstPercentage,
    igstPercentage,
    cgstAmount,
    sgstAmount,
    igstAmount,
    gstPercentage: cgstPercentage + sgstPercentage + igstPercentage || productGstPct || gstPercentage,
  }));

  const gstAmount = cgstAmount + sgstAmount + igstAmount;
  const resolvedGstPercentage =
    cgstPercentage + sgstPercentage + igstPercentage || productGstPct || gstPercentage;
  const lineTotal =
    asNumber(raw.total_amount) || Math.round((taxableAmount + gstAmount) * 100) / 100;

  let quantityType = "Piece";
  if (raw.quantity_type) {
    quantityType = String(raw.quantity_type).toUpperCase() === "CASE" ? "Case" : "Piece";
  } else {
    quantityType = caseQty > 0 ? "Case" : "Piece";
  }

  return {
    id: asString(raw.stock_transfer_item_id || `line-${idx}`),
    productId: raw.product_id,
    productCode: asString(prod.product_code || raw.product_code),
    productName: asString(prod.product_name || raw.product_name),
    availableStock: asNumber(raw.available_base_qty),
    quantity: totalQty,
    generatedBaseQty: asNumber(raw.generated_base_qty),
    caseQuantity: caseQty,
    pieceQuantity: pieceQty,
    quantityType: quantityType as "Case" | "Piece",
    unitPrice: costPrice,
    dealerPrice: costPrice,
    discount: 0,
    discountValue: 0,
    discountType: "Percentage",
    schemeDiscountPercent: 0,
    schemeDiscountAmount: 0,
    finalRate: costPrice,
    schemeApplied: "No" as const,
    cgstAmount,
    sgstAmount,
    igstAmount,
    cgstPercentage,
    sgstPercentage,
    igstPercentage,
    gstPercentage: resolvedGstPercentage,
    gstAmount,
    lineTotal,
    batchNumber: asString(batch.batch_code || raw.batch_no),
    batchInventoryId: raw.inventory_batch_id || undefined,
    expiryDate: batch.expiry_date ? asDateOnly(batch.expiry_date) : undefined,
    gstRate: `${resolvedGstPercentage}%`,
    packingUnit: asString(prod.packing_unit || "Unit"),
    baseUnit: asString(prod.base_unit || "Unit"),
    unitsPerPackingUnit: unitsPerPacking,
    packSize: unitsPerPacking,
    uom: asString(prod.base_unit || prod.unit || prod.uom || ""),
    unitPackSize: asNumber(prod.pack_size ?? prod.unit_pack_size) || null,
    netWeight: asNumber(prod.net_weight ?? prod.netWeight) || null,
    receivedQty: asNumber(raw.received_base_qty),
  };
}

function mapBackendExpense(raw: any, idx: number): SalesOrderAdditionalExpense {
  const cgstAmount = asNumber(raw.cgst_amount);
  const sgstAmount = asNumber(raw.sgst_amount);
  const igstAmount = asNumber(raw.igst_amount);
  const gstAmount = cgstAmount + sgstAmount + igstAmount;
  const amount = asNumber(raw.amount);
  const gstPercent = asNumber(raw.gst_percent);
  return {
    id: asString(raw.stock_transfer_expense_id || raw.id || `exp-${idx}`),
    expenseName: asString(raw.charge_name),
    amount,
    discountType: "percent",
    discountValue: 0,
    netAmount: amount,
    gstRate: asString(raw.gst_percent ?? gstPercent ?? "0"),
    cgstAmount,
    sgstAmount,
    igstAmount,
    gstAmount,
    totalAmount: asNumber(raw.total_amount) || Math.round((amount + gstAmount) * 100) / 100,
    remarks: asString(raw.remarks),
  };
}

export function mapBackendStockTransfer(raw: any): StockTransfer {
  const fromWh = raw.from_warehouse || {};
  const toWh = raw.to_warehouse || {};
  const req = raw.requester || {};
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const rawExpenses = Array.isArray(raw.expenses) ? raw.expenses : [];

  const fromState = gstinStateCode(fromWh.gst_number);
  const toState = gstinStateCode(toWh.gst_number);
  const itemHasIgst = rawItems.some((i: any) => asNumber(i.igst_amount) > 0);
  const expenseHasIgst = rawExpenses.some((e: any) => asNumber(e.igst_amount) > 0);
  // Legacy unfold only when items have no IGST amounts yet (pre-column / folded saves).
  const treatAsIgst =
    !itemHasIgst &&
    (expenseHasIgst || (Boolean(fromState) && Boolean(toState) && fromState !== toState));

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
    fulfillmentStatus: mapBackendFulfillmentStatus(raw.fulfillment_status),
    requestedBy: raw.requested_by || req.user_id || "",
    reasonPurpose: asString(raw.reason),
    remarks: asString(raw.remarks),
    transportDetails: raw.transport_details?.details || (typeof raw.transport_details === "string" ? raw.transport_details : ""),
    lineItems: rawItems.map((item: any, idx: number) =>
      mapBackendLineItem(item, idx, { treatAsIgst }),
    ),
    additionalExpenses: rawExpenses.map((exp: any, idx: number) => mapBackendExpense(exp, idx)),
    totalAmount: asNumber(raw.grand_total),
    totalItems: asNumber(raw.total_products) || rawItems.length,
    totalQuantity: asNumber(raw.total_quantity),
    createdBy: raw.created_by_user ? `${raw.created_by_user.first_name || ""} ${raw.created_by_user.last_name || ""}`.trim() : "Admin",
    createdDate: asDateOnly(raw.created_at),
    updatedBy: raw.updated_by_user ? `${raw.updated_by_user.first_name || ""} ${raw.updated_by_user.last_name || ""}`.trim() : "Admin",
    updatedDate: asDateOnly(raw.updated_at),
    packingListNumber:
      Array.isArray(raw.packing_lists) && raw.packing_lists.length > 0
        ? asString(raw.packing_lists[0].packing_number)
        : undefined,
    packingListId:
      Array.isArray(raw.packing_lists) && raw.packing_lists.length > 0
        ? raw.packing_lists[0].packing_list_id
        : undefined,
    packingLists: Array.isArray(raw.packing_lists)
      ? raw.packing_lists.map((pl: any) => ({
          packingListId: asString(pl.packing_list_id),
          packingNumber: asString(pl.packing_number),
          generatedAt: asDateOnly(pl.generated_at || pl.created_at),
          status: asString(pl.status),
        }))
      : undefined,
  };
}

function buildBackendWriteBody(
  form: StockTransferFormValues,
  options: { transferNo: string; status: string }
): Record<string, any> {
  const items = (form.lineItems || []).map((line) => {
    const qty = Number(line.quantity || 0);
    const rate = Number(line.finalRate ?? line.unitPrice ?? 0);
    const taxable = Math.round(Math.max(0, qty * rate) * 100) / 100;
    const cgstAmount = Math.round(Number(line.cgstAmount || 0) * 100) / 100;
    const sgstAmount = Math.round(Number(line.sgstAmount || 0) * 100) / 100;
    const igstAmount = Math.round(Number(line.igstAmount || 0) * 100) / 100;
    const gstPct =
      Number(line.gstPercentage || 0) ||
      Number.parseFloat(String(line.gstRate || "0").replace("%", "")) ||
      0;
    let cgstPercent = Number(line.cgstPercentage || 0);
    let sgstPercent = Number(line.sgstPercentage || 0);
    let igstPercent = Number(line.igstPercentage || 0);

    if (igstAmount > 0 && igstPercent <= 0 && gstPct > 0) {
      igstPercent = gstPct;
      cgstPercent = 0;
      sgstPercent = 0;
    } else if (cgstAmount > 0 && sgstAmount > 0 && cgstPercent <= 0 && sgstPercent <= 0 && gstPct > 0) {
      cgstPercent = Math.round((gstPct / 2) * 100) / 100;
      sgstPercent = Math.round((gstPct - cgstPercent) * 100) / 100;
    }

    const lineGst = cgstAmount + sgstAmount + igstAmount;
    return {
      product_id: line.productId,
      quantity_type: line.quantityType || "Piece",
      available_base_qty: line.availableStock || 0,
      transfer_base_qty: qty,
      cp_price: rate,
      cgst_percent: cgstPercent,
      cgst_amount: cgstAmount,
      sgst_percent: sgstPercent,
      sgst_amount: sgstAmount,
      igst_percent: igstPercent,
      igst_amount: igstAmount,
      taxable_amount: taxable,
      total_amount: Math.round((taxable + lineGst) * 100) / 100,
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
  const productSubtotal = items.reduce((acc, curr) => acc + curr.taxable_amount, 0);
  const additionalExp = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const productGst = items.reduce(
    (acc, curr) =>
      acc +
      Number(curr.cgst_amount || 0) +
      Number(curr.sgst_amount || 0) +
      Number(curr.igst_amount || 0),
    0,
  );
  const expenseGst = expenses.reduce(
    (acc, curr) =>
      acc +
      Number(curr.cgst_amount || 0) +
      Number(curr.sgst_amount || 0) +
      Number(curr.igst_amount || 0),
    0,
  );
  const totalGst = Math.round((productGst + expenseGst) * 100) / 100;
  const taxableAmount = Math.round((productSubtotal + additionalExp) * 100) / 100;

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
    product_subtotal: productSubtotal,
    product_discount: 0,
    additional_expenses: additionalExp,
    taxable_amount: taxableAmount,
    gst_amount: totalGst,
    grand_total: Math.round((taxableAmount + totalGst) * 100) / 100,
    items,
    expenses,
  };
}

export const StockTransferService = {
  async getNextNumber(
    fromWarehouseId?: string | null,
    signal?: AbortSignal,
  ): Promise<string> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.SALES.STOCK_TRANSFER.NEXT_NUMBER,
      {
        signal,
        params: fromWarehouseId
          ? { from_warehouse_id: fromWarehouseId }
          : undefined,
        headers: { "Cache-Control": "no-cache" },
      },
    );
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

  async getBatches(productId: string | number, warehouseId: string | number, quantityType?: string): Promise<any[]> {
    let url = `${API_ENDPOINTS.SALES.STOCK_TRANSFER.BATCHES}?product_id=${productId}&warehouse_id=${warehouseId}`;
    if (quantityType) {
      url += `&quantity_type=${quantityType}`;
    }
    const response = await axiosInstance.get(url);
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

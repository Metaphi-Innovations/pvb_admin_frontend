import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  PurchaseInvoiceLine,
  PurchaseInvoiceRecord,
  PurchaseNature,
  PurchaseSourceType,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type PurchaseInvoiceBackendType = "PURCHASE" | "DIRECT_PURCHASE";
export type PurchaseInvoiceBackendStatus = "POSTED" | "CANCELLED" | "REVERSED" | "PENDING";

export type PiNumberParams = {
  warehouseId?: string | null;
  state?: string | null;
};

export type ListPurchaseInvoicesQuery = {
  page?: number;
  page_size?: number;
  search?: string;
  supplier_id?: string;
  warehouse_id?: string;
  invoice_type?: PurchaseInvoiceBackendType;
  status?: PurchaseInvoiceBackendStatus;
  from_date?: string;
  to_date?: string;
  financial_year_id?: string;
  supplier_invoice_number?: string;
  ordering?: string;
  filters?: string;
  include_pending?: boolean;
};

export type EligibleGrnsQuery = {
  page?: number;
  page_size?: number;
  search?: string;
  warehouse_id?: string;
  supplier_id?: string;
  from_date?: string;
  to_date?: string;
  ordering?: string;
  filters?: string;
};

export type AdditionalChargeInput = {
  additional_charge_id: string;
  amount: number | string;
  charge_source: "ORDER" | "INVOICE";
  gst_applicable?: boolean;
  gst_rate?: number | string;
  remarks?: string;
};

export type CreateFromGrnPayload = {
  purchase_invoice_date: string;
  supplier_invoice_number?: string;
  supplier_invoice_date?: string | null;
  narration?: string | null;
  remarks?: string | null;
  additional_charges?: AdditionalChargeInput[];
};

export type DirectPurchaseItemInput = {
  item_type: "SERVICE" | "EXPENSE";
  expense_ledger_id: string;
  expense_description: string;
  sac_id?: string | null;
  hsn_id?: string | null;
  quantity?: number | string;
  rate: number | string;
  gst_rate?: number | string;
  is_input_credit_eligible?: boolean;
  narration?: string | null;
};

export type CreateDirectPurchasePayload = {
  purchase_invoice_date: string;
  supplier_invoice_number: string;
  supplier_invoice_date: string;
  warehouse_id: string;
  supplier_id: string;
  narration?: string | null;
  remarks?: string | null;
  items: DirectPurchaseItemInput[];
  additional_charges?: Array<
    Omit<AdditionalChargeInput, "charge_source"> & {
      charge_source?: "INVOICE";
    }
  >;
};

export type CancelPurchaseInvoicePayload = {
  reason: string;
  reversal_date?: string;
};

export type PurchaseInvoiceCreateResult = {
  purchase_invoice_id: string;
  purchase_invoice_number: string;
  invoice_type: PurchaseInvoiceBackendType;
  status: PurchaseInvoiceBackendStatus;
  invoice_amount: string;
  accounting_voucher_id?: string;
  voucher_number?: string;
  already_posted?: boolean;
};

export type PurchaseInvoiceCancelResult = {
  purchase_invoice_id: string;
  status: PurchaseInvoiceBackendStatus;
  reversal_voucher_id?: string;
  reversal_voucher_number?: string;
  already_reversed?: boolean;
};

export type EligibleGrnDto = {
  grn_id: string;
  grn_number: string;
  grn_date: string;
  status: string;
  source_type: string;
  purchase_order_id?: string | null;
  warehouse_id: string;
  warehouse_name?: string | null;
  supplier_id: string | null;
  supplier_name?: string | null;
  item_count: number;
  total_received_qty: string | number;
  has_supplier_invoice: boolean;
  supplier_invoice_no?: string | null;
  supplier_invoice_date?: string | null;
  invoice_amount?: string | number | null;
  gst_amount?: string | number | null;
  total_invoice_amount?: string | number | null;
};

export type PurchaseInvoiceListDto = {
  purchase_invoice_id: string;
  purchase_invoice_number: string;
  purchase_invoice_date: string;
  invoice_type: PurchaseInvoiceBackendType;
  status: PurchaseInvoiceBackendStatus;
  invoice_amount: string | number;
  taxable_amount?: string | number;
  gst_amount?: string | number;
  cgst_amount?: string | number;
  sgst_amount?: string | number;
  igst_amount?: string | number;
  round_off_amount?: string | number;
  supplier_invoice_number?: string | null;
  supplier_invoice_date?: string | null;
  warehouse_id: string;
  supplier_id: string;
  grn_id?: string | null;
  grn_number?: string | null;
  is_pending_grn?: boolean;
  purchase_order_id?: string | null;
  narration?: string | null;
  remarks?: string | null;
  cancellation_reason?: string | null;
  supplier?: {
    supplier_id: string;
    supplier_code?: string | null;
    supplier_name?: string | null;
  } | null;
  supplier_snapshot?: Record<string, unknown> | null;
  warehouse?: {
    warehouse_id: string;
    warehouse_name?: string | null;
  } | null;
};

export type PurchaseInvoiceDetailDto = PurchaseInvoiceListDto & {
  items?: Array<Record<string, unknown>>;
  additional_charges?: Array<Record<string, unknown>>;
  purchase_order?: {
    purchase_order_id?: string | null;
    po_no?: string | null;
  } | null;
  grn?: {
    id?: string | null;
    grnNumber?: string | null;
    grnDate?: string | null;
  } | null;
  place_of_supply_state_code?: string | null;
  place_of_supply_snapshot?: Record<string, unknown> | null;
  is_interstate?: boolean;
  gross_amount?: string | number;
  discount_amount?: string | number;
  additional_charge_amount?: string | number;
  accounting_voucher?: {
    accounting_voucher_id?: string;
    voucher_number?: string | null;
    status?: string | null;
    total_debit?: string | number;
    total_credit?: string | number;
  } | null;
};

export type PrepareGrnInvoiceDto = {
  grn: {
    grn_id: string;
    grn_number: string;
    grn_date: string;
    status: string;
    warehouse_id: string;
    supplier_id: string | null;
  };
  purchase_order: {
    purchase_order_id: string;
    po_no: string | null;
    po_status?: string | null;
  } | null;
  supplier: {
    supplier_id: string;
    supplier_code?: string | null;
    supplier_name?: string | null;
    state?: string | null;
  };
  warehouse: {
    warehouse_id: string;
    warehouse_name?: string | null;
    state?: string | null;
  };
  place_of_supply?: Record<string, unknown> | null;
  supplier_invoice: {
    supplier_invoice_number?: string | null;
    supplier_invoice_date?: string | null;
    purchase_order_invoice_id?: string | null;
  };
  items: Array<{
    purchase_order_product_id?: string | null;
    grn_item_id?: string | null;
    product_id?: string | null;
    product_snapshot?: Record<string, unknown> | null;
    quantity: string;
    rate: string;
    taxable_amount: string;
    gst_rate: string;
    gst_amount: string;
    line_total: string;
    hsn_id?: string | null;
  }>;
  suggested_additional_charges: Array<{
    charge_name: string;
    amount: string;
    gst_percent: string | null;
    charge_source: "ORDER";
    matched_additional_charge_id: string | null;
    matched_ledger_id: string | null;
    mapping_ok: boolean;
  }>;
};

export type PaginatedResult<T> = {
  page: number;
  page_size: number;
  total: number;
  results: T[];
};

export type PurchaseInvoiceListRow = {
  id: string;
  invoiceNo: string;
  invoiceDate: string;
  vendorInvoiceNo: string;
  vendorName: string;
  warehouseName: string;
  sourceType: PurchaseSourceType;
  invoiceType: PurchaseInvoiceBackendType | null;
  status: PurchaseInvoiceBackendStatus | "PENDING";
  taxableAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOffAmount: number;
  netPayable: number;
  outstandingAmount: number;
  purchaseNature: PurchaseNature | null;
  grnNo: string;
  poNo: string;
  voucherNumber: string;
  isPendingGrn?: boolean;
  grnId?: string | null;
};

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

function unwrapData<T>(response: { data?: ApiResponse<T> | T }): T {
  const body = response.data as ApiResponse<T> | T | undefined;
  if (
    body &&
    typeof body === "object" &&
    "data" in body &&
    (body as ApiResponse<T>).data !== undefined
  ) {
    return (body as ApiResponse<T>).data as T;
  }
  return body as T;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

function snapshotStr(
  snapshot: Record<string, unknown> | null | undefined,
  ...keys: string[]
): string {
  if (!snapshot) return "";
  for (const key of keys) {
    const v = snapshot[key];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return "";
}

function buildQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function mapInvoiceTypeToSource(
  type: PurchaseInvoiceBackendType | string | undefined,
): PurchaseSourceType {
  return type === "DIRECT_PURCHASE" ? "direct_purchase" : "from_grn";
}

export function sourceTypeToInvoiceType(
  source: PurchaseSourceType | "all",
): PurchaseInvoiceBackendType | undefined {
  if (source === "from_grn") return "PURCHASE";
  if (source === "direct_purchase") return "DIRECT_PURCHASE";
  return undefined;
}

export function mapPurchaseInvoiceListDto(
  dto: PurchaseInvoiceListDto,
): PurchaseInvoiceListRow {
  const sourceType = mapInvoiceTypeToSource(dto.invoice_type);
  const isPendingGrn = Boolean(dto.is_pending_grn) || dto.status === "PENDING";
  const status = isPendingGrn ? "PENDING" : dto.status;
  const netPayable = asNumber(dto.invoice_amount);
  return {
    id: dto.purchase_invoice_id,
    invoiceNo: dto.purchase_invoice_number,
    invoiceDate: asDateOnly(dto.purchase_invoice_date),
    vendorInvoiceNo: asString(dto.supplier_invoice_number),
    vendorName:
      dto.supplier?.supplier_name ||
      snapshotStr(
        (dto as { supplier_snapshot?: Record<string, unknown> }).supplier_snapshot,
        "supplier_name",
        "name",
      ) ||
      "—",
    warehouseName: dto.warehouse?.warehouse_name || "—",
    sourceType,
    invoiceType: dto.invoice_type,
    status,
    taxableAmount: asNumber(dto.taxable_amount),
    gstAmount: asNumber(dto.gst_amount),
    cgstAmount: asNumber(dto.cgst_amount),
    sgstAmount: asNumber(dto.sgst_amount),
    igstAmount: asNumber(dto.igst_amount),
    roundOffAmount: asNumber(dto.round_off_amount),
    netPayable,
    outstandingAmount: status === "POSTED" || isPendingGrn ? netPayable : 0,
    purchaseNature: sourceType === "direct_purchase" ? "expense" : null,
    grnNo: asString(dto.grn_number),
    poNo: "",
    voucherNumber: "",
    isPendingGrn,
    grnId: dto.grn_id ?? null,
  };
}

export function mapEligibleGrnToListRow(dto: EligibleGrnDto): PurchaseInvoiceListRow {
  const taxable = asNumber(dto.invoice_amount);
  const gstAmount = asNumber(dto.gst_amount);
  const netPayable = asNumber(dto.total_invoice_amount) || taxable + gstAmount;
  return {
    id: `pending-grn-${dto.grn_id}`,
    invoiceNo: "—",
    invoiceDate: asDateOnly(dto.supplier_invoice_date) || asDateOnly(dto.grn_date),
    vendorInvoiceNo: asString(dto.supplier_invoice_no),
    vendorName: dto.supplier_name || "—",
    warehouseName: dto.warehouse_name || "—",
    sourceType: "from_grn",
    invoiceType: null,
    status: "PENDING",
    taxableAmount: taxable,
    gstAmount,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
    roundOffAmount: 0,
    netPayable,
    outstandingAmount: netPayable,
    purchaseNature: null,
    grnNo: dto.grn_number,
    poNo: "",
    voucherNumber: "",
    isPendingGrn: true,
    grnId: dto.grn_id,
  };
}

export function mapPurchaseInvoiceDetailToRecord(
  dto: PurchaseInvoiceDetailDto,
): PurchaseInvoiceRecord {
  const sourceType = mapInvoiceTypeToSource(dto.invoice_type);
  const status = dto.status;
  const taxable = asNumber(dto.taxable_amount);
  const gstAmount = asNumber(dto.gst_amount);
  const grandTotal = asNumber(dto.invoice_amount);
  const vendorName =
    dto.supplier?.supplier_name ||
    snapshotStr(
      (dto as { supplier_snapshot?: Record<string, unknown> }).supplier_snapshot,
      "supplier_name",
      "name",
    ) ||
    "—";

  const lineItems: PurchaseInvoiceLine[] = (dto.items || []).map((raw, index) => {
    const item = raw as Record<string, unknown>;
    const productSnap = (item.product_snapshot || {}) as Record<string, unknown>;
    const qty = asNumber(item.quantity);
    const rate = asNumber(item.rate);
    const lineTaxable = asNumber(item.taxable_amount);
    const lineGst = asNumber(item.gst_amount);
    return {
      id: asString(item.purchase_invoice_item_id) || `line-${index}`,
      productId: null,
      productName:
        snapshotStr(productSnap, "product_name", "name") ||
        asString(item.expense_description) ||
        `Line ${index + 1}`,
      description: asString(item.expense_description) || asString(item.narration),
      invoiceQty: qty,
      unit: asString(item.quantity_type) || "NOS",
      unitPrice: rate,
      taxPct: asNumber(item.gst_rate),
      lineAmount: lineTaxable,
      taxAmount: lineGst,
      debitedQty: 0,
      debitedAmount: 0,
    };
  });

  return {
    id: 0,
    invoiceNo: dto.purchase_invoice_number,
    invoiceDate: asDateOnly(dto.purchase_invoice_date),
    vendorInvoiceNo: asString(dto.supplier_invoice_number),
    vendorId: 0,
    vendorName,
    vendorGst: snapshotStr(
      (dto as { supplier_snapshot?: Record<string, unknown> }).supplier_snapshot,
      "gstin_number",
      "gstin",
      "gst_number",
    ),
    poId: null,
    poNumber: dto.purchase_order?.po_no || "",
    poDate: "",
    grnId: dto.grn_id || dto.grn?.id || null,
    grnNo: dto.grn?.grnNumber || "",
    warehouse: dto.warehouse?.warehouse_name || "",
    source: sourceType === "from_grn" ? "po_invoice" : "manual_entry",
    sourceType,
    purchaseNature: sourceType === "direct_purchase" ? "expense" : undefined,
    postingDate: asDateOnly(dto.purchase_invoice_date),
    placeOfSupply: snapshotStr(
      dto.place_of_supply_snapshot,
      "state_name",
      "place_of_supply_state_name",
    ),
    narration: dto.narration || "",
    remarks: dto.remarks || "",
    taxableAmount: taxable,
    cgstTotal: asNumber(dto.cgst_amount),
    sgstTotal: asNumber(dto.sgst_amount),
    igstTotal: asNumber(dto.igst_amount),
    roundingAdjustment: asNumber(dto.round_off_amount),
    netPayable: grandTotal,
    lineItems,
    additionalCharges: [],
    productAmount: taxable,
    subtotal: taxable,
    taxAmount: gstAmount,
    grandTotal,
    amountPaid: status === "POSTED" ? 0 : grandTotal,
    amountDebited: 0,
    balanceDebitAllowed: status === "POSTED" ? grandTotal : 0,
    debitStatus: "no_debit",
    poAdjustmentStatus: "open",
    attachment: null,
    createdBy: "",
    updatedBy: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activity: [],
    invoiceMatchStatus: "matched",
    backendId: dto.purchase_invoice_id,
    backendStatus: status,
  };
}

export function mapPrepareItemsToLines(
  items: PrepareGrnInvoiceDto["items"],
): PurchaseInvoiceLine[] {
  return (items || []).map((item, index) => {
    const snap = (item.product_snapshot || {}) as Record<string, unknown>;
    return {
      id: item.grn_item_id || `prep-${index}`,
      productId: null,
      productName:
        snapshotStr(snap, "product_name", "name", "product_code") || `Item ${index + 1}`,
      description: snapshotStr(snap, "hsn_code", "hsn") || "",
      invoiceQty: asNumber(item.quantity),
      unit: snapshotStr(snap, "unit", "uom") || "NOS",
      unitPrice: asNumber(item.rate),
      taxPct: asNumber(item.gst_rate),
      lineAmount: asNumber(item.taxable_amount),
      taxAmount: asNumber(item.gst_amount),
      debitedQty: 0,
      debitedAmount: 0,
    };
  });
}

export const PurchaseInvoiceService = {
  isUuid(value: string | null | undefined): boolean {
    return Boolean(value && UUID_RE.test(value.trim()));
  },

  async getPreviewNumber(params: PiNumberParams = {}): Promise<string> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.PREVIEW_NUMBER,
      {
        params: {
          ...(params.warehouseId ? { warehouse_id: params.warehouseId } : {}),
          ...(params.state ? { state: params.state } : {}),
        },
        headers: { "Cache-Control": "no-cache" },
      },
    );
    const data = unwrapData(response) as Record<string, unknown> | string;
    if (typeof data === "string") return data;
    return (
      asString(data?.purchase_invoice_no) ||
      asString(data?.purchaseInvoiceNo) ||
      ""
    );
  },

  async listEligibleGrns(
    query: EligibleGrnsQuery = {},
  ): Promise<PaginatedResult<EligibleGrnDto>> {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.ELIGIBLE_GRNS}${buildQuery(query)}`,
      );
      return unwrapData(response) as PaginatedResult<EligibleGrnDto>;
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to load eligible GRNs."));
    }
  },

  async countEligibleGrns(): Promise<{ total: number }> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.ELIGIBLE_GRNS_COUNT,
      );
      return unwrapData(response) as { total: number };
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to count eligible GRNs."));
    }
  },

  async getFilterDropdown(
    fieldName: string,
    opts?: { invoice_type?: PurchaseInvoiceBackendType; include_pending?: boolean },
  ): Promise<Array<Record<string, string>>> {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.FILTER_DROPDOWN}${buildQuery({
          field_name: fieldName,
          invoice_type: opts?.invoice_type,
          include_pending: opts?.include_pending,
        })}`,
      );
      return (unwrapData(response) as Array<Record<string, string>>) || [];
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to load filter options."),
      );
    }
  },

  async getEligibleGrnFilterDropdown(
    fieldName: string,
  ): Promise<Array<Record<string, string>>> {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.ELIGIBLE_GRNS_FILTER_DROPDOWN}${buildQuery({
          field_name: fieldName,
        })}`,
      );
      return (unwrapData(response) as Array<Record<string, string>>) || [];
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to load filter options."),
      );
    }
  },

  async prepareGrn(grnId: string): Promise<PrepareGrnInvoiceDto> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.PREPARE_GRN(grnId),
      );
      return unwrapData(response) as PrepareGrnInvoiceDto;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to prepare GRN for invoice."),
      );
    }
  },

  async createFromGrn(
    grnId: string,
    payload: CreateFromGrnPayload,
  ): Promise<PurchaseInvoiceCreateResult> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.CREATE_FROM_GRN(grnId),
        payload,
      );
      const data = unwrapData(response);
      if (!data) throw new Error("Failed to create purchase invoice from GRN.");
      return data as PurchaseInvoiceCreateResult;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to create purchase invoice from GRN."),
      );
    }
  },

  async createDirectPurchase(
    payload: CreateDirectPurchasePayload,
  ): Promise<PurchaseInvoiceCreateResult> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.CREATE_DIRECT_PURCHASE,
        payload,
      );
      const data = unwrapData(response);
      if (!data) throw new Error("Failed to create direct purchase invoice.");
      return data as PurchaseInvoiceCreateResult;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to create direct purchase invoice."),
      );
    }
  },

  async list(
    query: ListPurchaseInvoicesQuery = {},
  ): Promise<PaginatedResult<PurchaseInvoiceListDto>> {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.LIST}${buildQuery(query)}`,
      );
      return unwrapData(response) as PaginatedResult<PurchaseInvoiceListDto>;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to list purchase invoices."),
      );
    }
  },

  async getById(id: string): Promise<PurchaseInvoiceDetailDto> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.BY_ID(id),
      );
      return unwrapData(response) as PurchaseInvoiceDetailDto;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to load purchase invoice."),
      );
    }
  },

  async cancel(
    id: string,
    payload: CancelPurchaseInvoicePayload,
  ): Promise<PurchaseInvoiceCancelResult> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.CANCEL(id),
        payload,
      );
      return unwrapData(response) as PurchaseInvoiceCancelResult;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to cancel purchase invoice."),
      );
    }
  },
};

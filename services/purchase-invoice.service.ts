import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { getStoredFYId } from "@/lib/fy-storage";
import type { ApiResponse } from "@/types/api.types";
import type {
  PurchaseInvoiceLine,
  PurchaseAttachment,
  PurchaseInvoiceRecord,
  PurchaseNature,
  PurchaseSourceType,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PENDING_GRN_VIEW_PREFIX = "pending-grn-";

export function toPendingGrnViewId(grnId: string): string {
  return `${PENDING_GRN_VIEW_PREFIX}${grnId}`;
}

export function parsePendingGrnViewId(id: string): string | null {
  if (!id.startsWith(PENDING_GRN_VIEW_PREFIX)) return null;
  const grnId = id.slice(PENDING_GRN_VIEW_PREFIX.length).trim();
  return UUID_RE.test(grnId) ? grnId : null;
}

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

export type ExportPurchaseInvoicesQuery = Omit<
  ListPurchaseInvoicesQuery,
  "page" | "page_size"
> & {
  format?: "csv" | "xlsx";
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
  due_date?: string | null;
  narration?: string | null;
  remarks?: string | null;
  additional_charges?: AdditionalChargeInput[];
  attachment?: File | null;
};

export type DirectPurchaseItemInput = {
  item_type: "SERVICE" | "EXPENSE";
  expense_ledger_id: string;
  expense_description: string;
  sac_id?: string | null;
  hsn_id?: string | null;
  quantity?: number | string;
  quantity_type?: string | null;
  rate: number | string;
  gst_rate?: number | string;
  is_input_credit_eligible?: boolean;
  narration?: string | null;
};

export type CreateDirectPurchasePayload = {
  purchase_invoice_date: string;
  supplier_invoice_number: string;
  supplier_invoice_date: string;
  due_date?: string | null;
  warehouse_id: string;
  supplier_id: string;
  narration?: string | null;
  remarks?: string | null;
  round_off_amount?: number | string | null;
  items: DirectPurchaseItemInput[];
  additional_charges?: Array<
    Omit<AdditionalChargeInput, "charge_source"> & {
      charge_source?: "INVOICE";
    }
  >;
  attachment?: File | null;
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
  po_no?: string | null;
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
  due_date?: string | null;
  approval_status?: string | null;
  payment_status?: "PAID" | "UNPAID" | "PARTIAL" | string | null;
  amount_paid?: string | number;
  outstanding_amount?: string | number;
  attachment_urls?: Array<string | { file_url?: string | null; file_name?: string | null }> | null;
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
    gst_number?: string | null;
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
    qcRecord?: {
      id?: string | null;
      qcNumber?: string | null;
    } | null;
  } | null;
  place_of_supply_state_code?: string | null;
  place_of_supply_snapshot?: Record<string, unknown> | null;
  warehouse_gst_snapshot?: Record<string, unknown> | null;
  warehouse_snapshot?: Record<string, unknown> | null;
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
  amount_paid?: string | number;
  outstanding_amount?: string | number;
};

export type PrepareGrnInvoiceDto = {
  grn: {
    grn_id: string;
    grn_number: string;
    grn_date: string;
    status: string;
    warehouse_id: string;
    supplier_id: string | null;
    qc_id?: string | null;
    qc_no?: string | null;
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
    batch_snapshot?: Record<string, unknown> | null;
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

export type PurchaseInvoicePaymentStatus = "paid" | "unpaid" | "partial";
export type PurchaseInvoiceApprovalStatus = "approved" | "pending_approval" | "draft";

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
  amountPaid: number;
  dueDate: string;
  approvalStatus: PurchaseInvoiceApprovalStatus;
  paymentStatus: PurchaseInvoicePaymentStatus;
  postingStatusLabel: string;
  purchaseNature: PurchaseNature | null;
  purchaseNatureLabel: string;
  hasAttachment: boolean;
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
  if (value == null || value === "") return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    return value.toISOString().slice(0, 10);
  }
  const raw =
    typeof value === "string"
      ? value
      : typeof value === "number"
        ? String(value)
        : typeof value === "object" &&
            value !== null &&
            typeof (value as { toISOString?: () => string }).toISOString ===
              "function"
          ? (value as Date).toISOString()
          : asString(value);
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

function isAbortError(error: unknown): boolean {
  const err = error as { name?: string; code?: string };
  return (
    err?.name === "CanceledError" ||
    err?.name === "AbortError" ||
    err?.code === "ERR_CANCELED"
  );
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

function firstBatchSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const batches = snapshot?.batches;
  if (!Array.isArray(batches) || batches.length === 0) return null;
  const first = batches[0];
  return first && typeof first === "object" ? (first as Record<string, unknown>) : null;
}

function hasPurchaseInvoiceAttachment(
  attachments:
    | Array<string | { file_url?: string | null; file_name?: string | null }>
    | null
    | undefined,
): boolean {
  if (!attachments?.length) return false;
  return attachments.some((item) => {
    if (typeof item === "string") return Boolean(item.trim());
    return Boolean(asString(item.file_url).trim());
  });
}

function mapPaymentStatus(
  raw: string | null | undefined,
): PurchaseInvoicePaymentStatus {
  const status = String(raw ?? "").toUpperCase();
  if (status === "PAID") return "paid";
  if (status === "PARTIAL") return "partial";
  return "unpaid";
}

function mapApprovalStatus(
  raw: string | null | undefined,
): PurchaseInvoiceApprovalStatus {
  const status = String(raw ?? "APPROVED").toUpperCase();
  if (status === "PENDING_APPROVAL" || status === "PENDING") return "pending_approval";
  if (status === "DRAFT") return "draft";
  return "approved";
}

function mapPostingStatusLabel(status: string): string {
  if (status === "POSTED") return "Posted";
  if (status === "PENDING") return "Draft";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "REVERSED") return "Reversed";
  return status || "—";
}

function resolvePurchaseNatureLabel(
  sourceType: PurchaseSourceType,
  purchaseNature: PurchaseNature | null,
): string {
  if (sourceType === "from_grn") return "Inventory";
  if (purchaseNature === "expense") return "Expense";
  if (purchaseNature === "fixed_asset") return "Fixed Asset";
  if (purchaseNature === "service") return "Service";
  if (purchaseNature === "other_non_stock") return "Capital Goods";
  return "—";
}

function mapAttachment(
  attachments:
    | Array<string | { file_url?: string | null; file_name?: string | null }>
    | null
    | undefined,
): PurchaseAttachment | null {
  const first = attachments?.[0];
  if (!first) return null;

  if (typeof first === "string") {
    const fileName = decodeURIComponent(first.split("/").pop() || "attachment");
    return {
      id: first,
      documentName: "Supplier Invoice",
      fileName,
      fileUrl: first,
      uploadedAt: new Date().toISOString(),
    };
  }

  const fileUrl = asString(first.file_url);
  if (!fileUrl) return null;
  return {
    id: fileUrl,
    documentName: "Supplier Invoice",
    fileName:
      asString(first.file_name) ||
      decodeURIComponent(fileUrl.split("/").pop() || "attachment"),
    fileUrl,
    uploadedAt: new Date().toISOString(),
  };
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

function buildMultipartPayload(payload: Record<string, unknown>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null || value === "") continue;
    if (key === "attachment" && value instanceof File) {
      formData.append("attachments", value);
      continue;
    }
    if (Array.isArray(value) || (typeof value === "object" && !(value instanceof File))) {
      formData.append(key, JSON.stringify(value));
      continue;
    }
    formData.append(key, String(value));
  }

  return formData;
}

/** Prefer explicit Working FY UUID; fall back to storage. Never call create APIs without this. */
function resolveFyHeaderId(explicit?: string | null): string {
  const id = (explicit?.trim() || getStoredFYId() || "").trim();
  if (!id) {
    throw new Error(
      "Select a financial year from the header before posting.",
    );
  }
  return id;
}

function multipartFyHeaders(financialYearId: string): Record<string, string | false> {
  return {
    "x-financial-year-id": financialYearId,
    // Let the browser set multipart boundary (instance default is application/json).
    "Content-Type": false,
  };
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
  const outstandingAmount = asNumber(dto.outstanding_amount);
  const amountPaid = asNumber(dto.amount_paid);
  const purchaseNature = sourceType === "direct_purchase" ? "expense" : null;
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
    outstandingAmount:
      status === "POSTED" || isPendingGrn
        ? outstandingAmount || netPayable
        : 0,
    amountPaid,
    dueDate: asDateOnly(dto.due_date),
    approvalStatus: mapApprovalStatus(dto.approval_status),
    paymentStatus: mapPaymentStatus(dto.payment_status),
    postingStatusLabel: mapPostingStatusLabel(status),
    purchaseNature,
    purchaseNatureLabel: resolvePurchaseNatureLabel(sourceType, purchaseNature),
    hasAttachment: hasPurchaseInvoiceAttachment(dto.attachment_urls),
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
    amountPaid: 0,
    dueDate: "",
    approvalStatus: "draft",
    paymentStatus: "unpaid",
    postingStatusLabel: "Draft",
    purchaseNature: null,
    purchaseNatureLabel: "Inventory",
    hasAttachment: false,
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
  const amountPaid = asNumber(dto.amount_paid);
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
    const batchSnap = firstBatchSnapshot(
      (item.batch_snapshot || null) as Record<string, unknown> | null,
    );
    const qty = asNumber(item.quantity);
    const rate = asNumber(item.rate);
    const lineTaxable = asNumber(item.taxable_amount);
    const lineGst = asNumber(item.gst_amount);
    const qtyComparisonRaw = item.qty_comparison as Record<string, unknown> | undefined;
    const supplierInvoiceQty = asNumber(qtyComparisonRaw?.supplier_invoice_qty) || qty;
    const grnReceivedQty = asNumber(qtyComparisonRaw?.grn_received_qty);
    const qcAcceptedQty = asNumber(qtyComparisonRaw?.qc_accepted_qty);
    const qcRejectedQty = asNumber(qtyComparisonRaw?.qc_rejected_qty);
    return {
      id: asString(item.purchase_invoice_item_id) || `line-${index}`,
      productId: null,
      productName:
        snapshotStr(productSnap, "product_name", "name") ||
        asString(item.expense_description) ||
        `Line ${index + 1}`,
      description: asString(item.expense_description) || asString(item.narration),
      batchNumber: snapshotStr(batchSnap, "batch_number", "batchNumber"),
      mfgDate: asDateOnly(batchSnap?.manufacture_date),
      expDate: asDateOnly(batchSnap?.expiry_date),
      invoiceQty: qty,
      unit:
        asString(item.quantity_type) ||
        snapshotStr(
          (item.uom_snapshot || null) as Record<string, unknown> | null,
          "unit",
          "uom",
          "quantity_type",
        ) ||
        snapshotStr(productSnap, "unit", "uom") ||
        "NOS",
      unitPrice: rate,
      taxPct: asNumber(item.gst_rate),
      lineAmount: lineTaxable,
      taxAmount: lineGst,
      debitedQty: 0,
      debitedAmount: 0,
      qtyComparison: qtyComparisonRaw
        ? {
            supplierInvoiceQty,
            grnReceivedQty,
            qcAcceptedQty,
            qcRejectedQty,
            shortQty:
              asNumber(qtyComparisonRaw.short_qty) ||
              Math.max(0, Math.round((supplierInvoiceQty - grnReceivedQty) * 100) / 100),
          }
        : undefined,
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
    qcId: dto.grn?.qcRecord?.id || null,
    qcNo: dto.grn?.qcRecord?.qcNumber || "",
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
    branchGstin:
      snapshotStr(dto.warehouse_gst_snapshot, "gst_number", "gstin") ||
      snapshotStr(dto.warehouse_snapshot, "gst_number", "gstin") ||
      asString(dto.warehouse?.gst_number) ||
      undefined,
    dueDate: asDateOnly(dto.due_date),
    narration: dto.narration || "",
    remarks: dto.remarks || "",
    grossAmount: asNumber(dto.gross_amount),
    discountTotal: asNumber(dto.discount_amount),
    taxableAmount: taxable,
    cgstTotal: asNumber(dto.cgst_amount),
    sgstTotal: asNumber(dto.sgst_amount),
    igstTotal: asNumber(dto.igst_amount),
    roundingAdjustment: asNumber(dto.round_off_amount),
    netPayable: grandTotal,
    lineItems,
    additionalCharges: (dto.additional_charges || []).map((raw, idx) => {
      const c = raw as Record<string, unknown>;
      const snap = (c.additional_charge_snapshot || {}) as Record<string, unknown>;
      return {
        uid: asString(c.purchase_invoice_additional_charge_id) || `charge-${idx}`,
        chargeName:
          asString(snap.charge_name || snap.chargeName || c.charge_name) ||
          `Charge ${idx + 1}`,
        amount: asNumber(c.taxable_amount || c.amount),
        cgstPct: asNumber(c.cgst_rate),
        sgstPct: asNumber(c.sgst_rate),
        igstPct: asNumber(c.igst_rate),
        remarks: asString(c.remarks) || undefined,
      };
    }),
    productAmount: taxable,
    subtotal: taxable,
    taxAmount: gstAmount,
    grandTotal,
    amountPaid,
    amountDebited: 0,
    balanceDebitAllowed: Math.max(0, grandTotal - amountPaid),
    debitStatus: "no_debit",
    poAdjustmentStatus: "open",
    attachment: mapAttachment(dto.attachment_urls),
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
    const batchSnap = firstBatchSnapshot(
      (item.batch_snapshot || null) as Record<string, unknown> | null,
    );
    return {
      id: item.grn_item_id || `prep-${index}`,
      productId: null,
      productName:
        snapshotStr(snap, "product_name", "name", "product_code") || `Item ${index + 1}`,
      description: snapshotStr(snap, "hsn_code", "hsn") || "",
      batchNumber: snapshotStr(batchSnap, "batch_number", "batchNumber"),
      mfgDate: asDateOnly(batchSnap?.manufacture_date),
      expDate: asDateOnly(batchSnap?.expiry_date),
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

export function mapPrepareGrnToRecord(dto: PrepareGrnInvoiceDto): PurchaseInvoiceRecord {
  const lineItems = mapPrepareItemsToLines(dto.items);
  const taxable = lineItems.reduce((sum, line) => sum + line.lineAmount, 0);
  const gstAmount = lineItems.reduce((sum, line) => sum + line.taxAmount, 0);
  const chargeTotal = (dto.suggested_additional_charges || [])
    .filter((charge) => charge.mapping_ok)
    .reduce((sum, charge) => sum + asNumber(charge.amount), 0);
  const grandTotal = taxable + gstAmount + chargeTotal;
  return {
    id: 0,
    invoiceNo: "Pending GRN Invoice",
    invoiceDate: asDateOnly(dto.supplier_invoice.supplier_invoice_date) || asDateOnly(dto.grn.grn_date),
    vendorInvoiceNo: asString(dto.supplier_invoice.supplier_invoice_number),
    vendorId: 0,
    vendorName: dto.supplier?.supplier_name || "—",
    vendorGst: "",
    poId: null,
    poNumber: dto.purchase_order?.po_no || "",
    poDate: "",
    grnId: dto.grn.grn_id,
    grnNo: dto.grn.grn_number,
    qcId: dto.grn.qc_id || null,
    qcNo: dto.grn.qc_no || "",
    warehouse: dto.warehouse?.warehouse_name || "",
    source: "po_invoice",
    sourceType: "from_grn",
    postingDate: asDateOnly(dto.grn.grn_date),
    narration: "",
    remarks: "",
    taxableAmount: taxable,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: gstAmount,
    roundingAdjustment: 0,
    netPayable: grandTotal,
    lineItems,
    additionalCharges: [],
    productAmount: taxable,
    subtotal: taxable,
    taxAmount: gstAmount,
    grandTotal,
    amountPaid: 0,
    amountDebited: 0,
    balanceDebitAllowed: 0,
    debitStatus: "no_debit",
    poAdjustmentStatus: "open",
    attachment: null,
    createdBy: "",
    updatedBy: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activity: [],
    invoiceMatchStatus: "matched",
    backendStatus: "PENDING",
  };
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
    signal?: AbortSignal,
  ): Promise<PaginatedResult<EligibleGrnDto>> {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.ELIGIBLE_GRNS}${buildQuery(query)}`,
        { signal },
      );
      return unwrapData(response) as PaginatedResult<EligibleGrnDto>;
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new Error(extractErrorMessage(error, "Failed to load eligible GRNs."));
    }
  },

  async listPendingGrns(
    query: EligibleGrnsQuery = {},
    signal?: AbortSignal,
  ): Promise<PaginatedResult<EligibleGrnDto>> {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.PENDING_GRNS}${buildQuery(query)}`,
        { signal },
      );
      return unwrapData(response) as PaginatedResult<EligibleGrnDto>;
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new Error(extractErrorMessage(error, "Failed to load pending GRNs."));
    }
  },

  async countEligibleGrns(signal?: AbortSignal): Promise<{ total: number }> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.ELIGIBLE_GRNS_COUNT,
        { signal },
      );
      return unwrapData(response) as { total: number };
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new Error(extractErrorMessage(error, "Failed to count eligible GRNs."));
    }
  },

  async countPendingGrns(signal?: AbortSignal): Promise<{ total: number }> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.PENDING_GRNS_COUNT,
        { signal },
      );
      return unwrapData(response) as { total: number };
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new Error(extractErrorMessage(error, "Failed to count pending GRNs."));
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

  async getPendingGrnFilterDropdown(
    fieldName: string,
  ): Promise<Array<Record<string, string>>> {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.PENDING_GRNS_FILTER_DROPDOWN}${buildQuery({
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
    options?: { financialYearId?: string | null },
  ): Promise<PurchaseInvoiceCreateResult> {
    try {
      const fyId = resolveFyHeaderId(options?.financialYearId);
      const formData = buildMultipartPayload(payload as Record<string, unknown>);
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.CREATE_FROM_GRN(grnId),
        formData,
        {
          headers: multipartFyHeaders(fyId),
        },
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
    options?: { financialYearId?: string | null },
  ): Promise<PurchaseInvoiceCreateResult> {
    try {
      const fyId = resolveFyHeaderId(options?.financialYearId);
      const formData = buildMultipartPayload(payload as Record<string, unknown>);
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.CREATE_DIRECT_PURCHASE,
        formData,
        {
          headers: multipartFyHeaders(fyId),
        },
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
    signal?: AbortSignal,
  ): Promise<PaginatedResult<PurchaseInvoiceListDto>> {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.LIST}${buildQuery(query)}`,
        { signal },
      );
      return unwrapData(response) as PaginatedResult<PurchaseInvoiceListDto>;
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new Error(
        extractErrorMessage(error, "Failed to list purchase invoices."),
      );
    }
  },

  async export(query: ExportPurchaseInvoicesQuery = {}): Promise<void> {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ACCOUNTS.PURCHASE_INVOICE.EXPORT}${buildQuery(query)}`,
        { responseType: "blob" },
      );

      const contentType = String(response.headers?.["content-type"] ?? "");
      if (contentType.includes("application/json")) {
        const text = await (response.data as Blob).text();
        let message = "No purchase invoices found to export.";
        try {
          const body = JSON.parse(text) as { message?: string };
          message = body.message || message;
        } catch {
          // keep default message
        }
        throw new Error(message);
      }

      const format = query.format === "xlsx" ? "xlsx" : "csv";
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `purchase_invoices_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to export purchase invoices."),
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

import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { ApiResponse } from "@/types/api.types";
import type {
  InvoiceLineItem,
  InvoiceRecord,
  InvoiceStatus,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { recalculateLineItem } from "@/app/(app)/accounts/invoices/invoices-data";
import type { InvoiceAdditionalExpense } from "@/app/(app)/accounts/invoices/invoice-additional-expenses";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SalesInvoiceBackendType = "SALES" | "DIRECT_SERVICE" | "STOCK_TRANSFER";
export type SalesInvoiceBackendStatus = "POSTED" | "CANCELLED" | "REVERSED";

export type SiNumberParams = {
  warehouseId?: string | null;
  state?: string | null;
};

export type ListSalesInvoicesQuery = {
  page?: number;
  page_size?: number;
  search?: string;
  customer_id?: string;
  warehouse_id?: string;
  invoice_type?: SalesInvoiceBackendType;
  status?: SalesInvoiceBackendStatus;
  from_date?: string;
  to_date?: string;
  financial_year_id?: string;
};

export type EligibleDispatchesQuery = {
  page?: number;
  page_size?: number;
  search?: string;
  warehouse_id?: string;
  from_date?: string;
  to_date?: string;
};

export type AdditionalChargeInput = {
  charge_name: string;
  ledger_id: string;
  hsn_id: string;
  amount: number | string;
  gst_applicable?: boolean;
  gst_rate?: number | string;
  remarks?: string | null;
  charge_source: "ORDER" | "INVOICE";
  /** Optional — legacy / source master link only. */
  additional_charge_id?: string | null;
};

export type CreateFromDispatchPayload = {
  invoice_date: string;
  due_date?: string | null;
  narration?: string | null;
  remarks?: string | null;
  transporter?: string | null;
  transporter_id?: string | null;
  transport_mode?: string | null;
  vehicle_number?: string | null;
  vehicle_type?: string | null;
  lr_number?: string | null;
  lr_date?: string | null;
  transport_doc_number?: string | null;
  transport_doc_date?: string | null;
  approx_distance?: number | string | null;
  irn_number?: string | null;
  acknowledgement_number?: string | null;
  acknowledgement_date?: string | null;
  signed_qr_code?: string | null;
  einvoice_status?: string | null;
  eway_bill_number?: string | null;
  eway_bill_date?: string | null;
  eway_bill_valid_upto?: string | null;
  eway_bill_status?: string | null;
  eway_bill_qr_code?: string | null;
  additional_charges?: AdditionalChargeInput[];
  round_off_amount?: number | string | null;
};

export type DirectServiceItemInput = {
  service_ledger_id: string;
  service_name: string;
  sac_id: string;
  quantity?: number | string;
  rate: number | string;
  gst_rate?: number | string;
  narration?: string | null;
};

export type CreateDirectServicePayload = {
  invoice_date: string;
  due_date?: string | null;
  warehouse_id: string;
  customer_id: string;
  narration?: string | null;
  remarks?: string | null;
  items: DirectServiceItemInput[];
  additional_charges?: AdditionalChargeInput[];
  round_off_amount?: number | string | null;
};

export type CancelSalesInvoicePayload = {
  reason: string;
  reversal_date?: string;
};

export type SalesInvoiceCreateResult = {
  sales_invoice_id: string;
  invoice_number: string;
  invoice_type: SalesInvoiceBackendType;
  status: SalesInvoiceBackendStatus;
  invoice_amount: string;
  accounting_voucher_id?: string;
  voucher_number?: string;
  already_posted?: boolean;
};

export type SalesInvoiceCancelResult = {
  sales_invoice_id: string;
  status: SalesInvoiceBackendStatus;
  reversal_voucher_id?: string;
  reversal_voucher_number?: string;
  already_reversed?: boolean;
};

export type EligibleDispatchDto = {
  dispatch_id: string;
  dispatch_number: string;
  dispatch_date: string;
  status: string;
  source_type: string;
  source_id: string | null;
  warehouse_id: string;
  warehouse_name?: string | null;
  customer_id: string | null;
  customer_name?: string | null;
  item_count: number;
  total_qty: string | number;
};

export type SalesInvoiceListDto = {
  sales_invoice_id: string;
  sr_no?: string | number;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  invoice_type: SalesInvoiceBackendType;
  status: SalesInvoiceBackendStatus;
  invoice_amount: string | number;
  taxable_amount?: string | number;
  gst_amount?: string | number;
  warehouse_id: string;
  customer_id?: string | null;
  dispatch_id?: string | null;
  destination_warehouse_id?: string | null;
  irn_number?: string | null;
  einvoice_status?: string | null;
  acknowledgement_number?: string | null;
  acknowledgement_date?: string | null;
  eway_bill_number?: string | null;
  eway_bill_date?: string | null;
  eway_bill_valid_upto?: string | null;
  eway_bill_status?: string | null;
  eway_bill_qr_code?: string | null;
  dispatch?: {
    dispatch_number?: string | null;
    source_id?: string | null;
    source_type?: string | null;
    transporter?: string | null;
    transporter_id?: string | null;
    transport_mode?: string | null;
    vehicle_number?: string | null;
    vehicle_type?: string | null;
    lr_number?: string | null;
    lr_date?: string | null;
    transport_doc_number?: string | null;
    transport_doc_date?: string | null;
    approx_distance?: number | string | null;
  } | null;
  narration?: string | null;
  remarks?: string | null;
  cancellation_reason?: string | null;
  customer?: {
    customer_id: string;
    customer_code?: string | null;
    customer_name?: string | null;
  } | null;
  warehouse?: {
    warehouse_id: string;
    warehouse_name?: string | null;
  } | null;
  customer_snapshot?: Record<string, unknown> | null;
  warehouse_snapshot?: Record<string, unknown> | null;
  destination_warehouse_snapshot?: Record<string, unknown> | null;
  dispatch_number?: string | null;
  sales_order?: {
    sales_order_id?: string | null;
    so_number?: string | null;
    salesperson_name?: string | null;
  } | null;
  total_quantity?: number | string | null;
};

export type SalesInvoiceDetailDto = SalesInvoiceListDto & {
  items?: Array<Record<string, unknown>>;
  additional_charges?: Array<Record<string, unknown>>;
  dispatch?: {
    id: string;
    dispatch_number?: string | null;
    dispatch_date?: string | null;
    source_id?: string | null;
    source_type?: string | null;
    transporter?: string | null;
    transporter_id?: string | null;
    transport_mode?: string | null;
    vehicle_number?: string | null;
    vehicle_type?: string | null;
    lr_number?: string | null;
    lr_date?: string | null;
    transport_doc_number?: string | null;
    transport_doc_date?: string | null;
    approx_distance?: number | string | null;
  } | null;
  billing_address_snapshot?: Record<string, unknown> | null;
  shipping_address_snapshot?: Record<string, unknown> | null;
  place_of_supply_state_code?: string | null;
  place_of_supply_snapshot?: Record<string, unknown> | null;
  is_interstate?: boolean;
  gross_amount?: string | number;
  product_discount_amount?: string | number;
  additional_charge_amount?: string | number;
  cgst_amount?: string | number;
  sgst_amount?: string | number;
  igst_amount?: string | number;
  round_off_amount?: string | number;
  acknowledgement_number?: string | null;
  acknowledgement_date?: string | null;
  signed_qr_code?: string | null;
  accounting_voucher?: {
    accounting_voucher_id?: string;
    voucher_number?: string | null;
    status?: string | null;
    party_ledger_id?: string | null;
  } | null;
  customer_ledger_id?: string | null;
  salesperson_name?: string | null;
};

export type PrepareDispatchInvoiceDto = {
  dispatch: {
    dispatch_id: string;
    dispatch_number: string;
    dispatch_date: string;
    status: string;
    source_type: string;
    source_id: string | null;
    transporter?: string | null;
    transporter_id?: string | null;
    transport_mode?: string | null;
    vehicle_number?: string | null;
    vehicle_type?: string | null;
    lr_number?: string | null;
    lr_date?: string | null;
    transport_doc_number?: string | null;
    transport_doc_date?: string | null;
    approx_distance?: number | string | null;
    remarks?: string | null;
  };
  sales_order: {
    sales_order_id: string;
    so_number: string | null;
    salesperson_name?: string | null;
  } | null;
  customer: Record<string, unknown>;
  customer_ledger_id?: string | null;
  warehouse: Record<string, unknown>;
  warehouse_gst?: Record<string, unknown> | null;
  source_warehouse_gst?: Record<string, unknown> | null;
  destination_warehouse_gst?: Record<string, unknown> | null;
  stock_transfer?: {
    stock_transfer_id: string;
    transfer_no: string | null;
    transport_details?: Record<string, unknown> | string | null;
    distance_km?: number | null;
    from_warehouse?: {
      warehouse_id: string;
      warehouse_name: string;
      state?: string | null;
      gst_number?: string | null;
      address?: string | null;
      city?: string | null;
      pincode?: string | null;
    } | null;
    to_warehouse?: {
      warehouse_id: string;
      warehouse_name: string;
      state?: string | null;
      gst_number?: string | null;
      address?: string | null;
      city?: string | null;
      pincode?: string | null;
    } | null;
  } | null;
  place_of_supply?: Record<string, unknown> | null;
  billing_address?: Record<string, unknown> | null;
  shipping_address?: Record<string, unknown> | null;
  items: Array<{
    dispatch_item_id: string;
    product_id: string;
    product_code?: string | null;
    product_name?: string | null;
    batch_id?: string | null;
    batch_no?: string | null;
    manufacture_date?: string | null;
    expiry_date?: string | null;
    unit_per_packing?: number | null;
    qty_in_case?: number | null;
    salesperson_name?: string | null;
    quantity: string;
    quantity_type?: string | null;
    unit_price?: string | null;
    discount_amount?: string | null;
    discount_percentage?: string | null;
    gst_rate?: string | null;
    hsn_id?: string | null;
    hsn_code?: string | null;
    unit_cost?: string | null;
    source_item_id?: string | null;
  }>;
  suggested_additional_charges: Array<{
    sales_order_expense_id: string;
    charge_name: string;
    amount: string;
    gst_percent: string | null;
    charge_source: "ORDER";
    matched_additional_charge_id: string | null;
    matched_ledger_id: string | null;
    matched_ledger_code: string | null;
    matched_ledger_name: string | null;
    gst_applicable: boolean | null;
    default_gst_rate: string | null;
    mapping_ok: boolean;
    hsn_id?: string | null;
    hsn_code?: string | null;
  }>;
  totals?: DispatchInvoiceTotalsPreview;
};

export type DispatchInvoiceTotalsPreview = {
  gross_amount: string;
  product_discount_amount: string;
  taxable_amount: string;
  additional_charge_amount: string;
  cgst_amount: string;
  sgst_amount: string;
  igst_amount: string;
  gst_amount: string;
  round_off_amount: string;
  invoice_amount: string;
};

export function readTransportDistanceKm(
  transportDetails: unknown,
): number | null {
  if (!transportDetails) return null;
  if (typeof transportDetails === "string") {
    const trimmed = transportDetails.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number(trimmed);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return null;
  }
  if (typeof transportDetails !== "object" || Array.isArray(transportDetails)) {
    return null;
  }
  const record = transportDetails as Record<string, unknown>;
  for (const key of ["distance_km", "distanceKm", "distance", "km"]) {
    const raw = record[key];
    if (raw == null || raw === "") continue;
    const n = Number(raw);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const details = record.details;
  if (typeof details === "string") {
    const trimmed = details.trim();
    if (/^\d+(\.\d+)?$/.test(trimmed)) {
      const n = Number(trimmed);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
  }
  return null;
}

export function readWarehouseGstin(
  ...sources: Array<
    | {
        gst_number?: string | null;
        gstNumber?: string | null;
        gstin?: string | null;
        gstin_no?: string | null;
      }
    | Record<string, unknown>
    | null
    | undefined
  >
): string {
  for (const source of sources) {
    if (!source) continue;
    const value =
      source.gst_number ??
      source.gstNumber ??
      source.gstin ??
      source.gstin_no;
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function resolvePreparePlaceOfSupply(
  pos: Record<string, unknown> | null | undefined,
  billing?: Record<string, unknown> | null,
  shipping?: Record<string, unknown> | null,
): string {
  const snap = (pos?.placeOfSupplySnapshot ||
    pos?.place_of_supply_snapshot) as Record<string, unknown> | undefined;
  return asString(
    pos?.placeOfSupplyStateName ||
      pos?.place_of_supply_state_name ||
      snap?.state_name ||
      billing?.state ||
      shipping?.state ||
      "",
  );
}

export function mapPrepareDispatchItemsToLineItems(
  items: PrepareDispatchInvoiceDto["items"],
  dispatchNumber: string,
  salespersonName?: string | null,
): InvoiceLineItem[] {
  const sp = salespersonName?.trim() || "";
  return (items || []).map((item, index) => {
    const qty = Number(item.quantity || 0);
    // For stock transfer dispatches unit_price is null; fall back to unit_cost (batch cost)
    const rate = Number((item as any).unit_price || (item as any).unit_cost || 0);
    const discountPct = Number(item.discount_percentage || 0);
    const discountAmt = Number(item.discount_amount || 0);
    const gstPercent = Number(item.gst_rate || 18);
    const qtyInCase =
      item.qty_in_case != null
        ? Number(item.qty_in_case)
        : item.unit_per_packing != null
          ? Number(item.unit_per_packing)
          : null;
    return recalculateLineItem({
      id: item.dispatch_item_id || `line-${index}`,
      productId: null,
      productUuid: item.product_id || null,
      productCode: item.product_code || "",
      productName: item.product_name || "—",
      description: `Dispatch Ref: ${dispatchNumber}`,
      hsn: item.hsn_code || "—",
      qty,
      unit: item.quantity_type || "PCS",
      unitPrice: rate,
      discountPct,
      taxPct: gstPercent,
      amount: qty * rate,
      batchNo: item.batch_no || "—",
      batchId: item.batch_id || undefined,
      manufacturingDate: asDateOnly(item.manufacture_date) || undefined,
      expiryDate: asDateOnly(item.expiry_date) || undefined,
      qtyInCase: qtyInCase != null && qtyInCase > 0 ? qtyInCase : null,
      salesperson: item.salesperson_name?.trim() || sp || undefined,
      dispatchReadyQty: qty,
      schemeDiscountPercent: discountPct,
      schemeDiscountAmount: discountAmt,
      schemeApplied: discountAmt > 0 ? "Yes" : "No",
    });
  });
}

export type PaginatedResult<T> = {
  page: number;
  page_size: number;
  total: number;
  results: T[];
};

export type SalesInvoiceKindFromApi =
  | "sales_order"
  | "stock_transfer"
  | "sample_order"
  | "service";

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

function statutoryStatus(
  stored: string | null | undefined,
  hasDocument: boolean,
): string {
  const raw = String(stored || "").trim().toLowerCase();
  if (raw) return raw;
  return hasDocument ? "generated" : "not_generated";
}

function formatAddressSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
): string {
  if (!snapshot) return "";
  const single = snapshotStr(
    snapshot,
    "address",
    "full_address",
    "line1",
    "address_line_1",
    "registered_gst_address",
    "billing_address",
    "shipping_address",
  );
  if (single) return single;

  const parts = [
    snapshot.address_line_1 ?? snapshot.addressLine1,
    snapshot.address_line_2 ?? snapshot.addressLine2,
    snapshot.city,
    snapshot.state,
    snapshot.pincode,
  ]
    .map((v) => String(v ?? "").trim())
    .filter(Boolean);
  return parts.join(", ");
}

function mapBackendStatusToFrontend(status: string | undefined): InvoiceStatus {
  const s = asString(status).toUpperCase();
  if (s === "CANCELLED" || s === "REVERSED") return "cancelled";
  if (s === "POSTED") return "sent";
  return "draft";
}

export function mapInvoiceTypeToKind(
  invoiceType: string | undefined,
  sourceType?: string | null,
): SalesInvoiceKindFromApi {
  const t = asString(invoiceType).toUpperCase();
  if (t === "DIRECT_SERVICE") return "service";
  if (t === "STOCK_TRANSFER") return "stock_transfer";
  const src = asString(sourceType).toLowerCase();
  if (src.includes("sample")) return "sample_order";
  if (src.includes("stock")) return "stock_transfer";
  return "sales_order";
}

export function tabToInvoiceType(
  tab: SalesInvoiceKindFromApi | "all",
): SalesInvoiceBackendType | undefined {
  if (tab === "service") return "DIRECT_SERVICE";
  if (tab === "stock_transfer") return "STOCK_TRANSFER";
  if (tab === "sales_order" || tab === "sample_order") return "SALES";
  return undefined;
}

function mapBackendLineItem(
  raw: Record<string, unknown>,
  idx: number,
): InvoiceLineItem {
  const productSnap = (raw.product_snapshot || {}) as Record<string, unknown>;
  const sacSnap = (raw.sac_snapshot || {}) as Record<string, unknown>;
  const hsnSnap = (raw.hsn_snapshot || {}) as Record<string, unknown>;
  const batchSnap = (raw.batch_snapshot || {}) as Record<string, unknown>;
  const uomSnap = (raw.uom_snapshot || {}) as Record<string, unknown>;
  const qty = asNumber(raw.quantity);
  const rate = asNumber(raw.rate);
  const discountPct = asNumber(raw.discount_percentage);
  const gstPct = asNumber(raw.gst_rate);
  const taxable = asNumber(raw.taxable_amount);
  const lineTotal = asNumber(raw.line_total);
  const serviceName = asString(raw.service_name);
  const qtyInCaseRaw =
    raw.qty_in_case ??
    raw.unit_per_packing ??
    productSnap.unit_per_packing ??
    productSnap.unitPerPacking;
  const qtyInCase = asNumber(qtyInCaseRaw);
  const salesperson =
    asString(raw.salesperson_name) ||
    asString(raw.salesperson) ||
    asString(productSnap.salesperson_name);
  const productName =
    serviceName ||
    asString(productSnap.product_name) ||
    asString(productSnap.productName) ||
    `Line ${idx + 1}`;

  return {
    id: asString(raw.sales_invoice_item_id || raw.id || `line-${idx}`),
    productId: null,
    productName,
    productCode: asString(productSnap.product_code || productSnap.productCode),
    description: asString(raw.narration) || productName,
    hsn:
      asString(hsnSnap.hsnCode || hsnSnap.hsn_code) ||
      asString(sacSnap.hsnCode || sacSnap.hsn_code || sacSnap.code) ||
      "",
    qty,
    unit: asString(uomSnap.label || uomSnap.uom || uomSnap.unit || raw.quantity_type) || "NOS",
    unitPrice: rate,
    discountPct,
    taxPct: gstPct,
    amount: lineTotal || taxable,
    cgstAmount: asNumber(raw.cgst_amount),
    sgstAmount: asNumber(raw.sgst_amount),
    igstAmount: asNumber(raw.igst_amount),
    batchNo: asString(batchSnap.batch_no || batchSnap.batch_code || batchSnap.batchNo),
    manufacturingDate: asDateOnly(
      batchSnap.manufacture_date || batchSnap.mfg_date || batchSnap.manufacturingDate,
    ),
    expiryDate: asDateOnly(batchSnap.expiry_date || batchSnap.expiryDate),
    qtyInCase: qtyInCase > 0 ? qtyInCase : null,
    salesperson: salesperson || undefined,
    schemeDiscountPercent: discountPct,
    schemeDiscountAmount: asNumber(raw.discount_amount),
    schemeApplied: asNumber(raw.discount_amount) > 0 ? "Yes" : "No",
  };
}

function mapBackendAdditionalCharge(
  raw: Record<string, unknown>,
  idx: number,
): InvoiceAdditionalExpense {
  const snap = (raw.additional_charge_snapshot || {}) as Record<string, unknown>;
  const ledgerSnap = (raw.ledger_snapshot || {}) as Record<string, unknown>;
  const hsnSnap = (raw.hsn_snapshot || {}) as Record<string, unknown>;
  const gstPct = asNumber(raw.gst_rate);
  const chargeName =
    asString(raw.charge_name) ||
    asString(snap.charge_name || snap.chargeName) ||
    "Other Charges";
  const ledgerId =
    asString(raw.ledger_id) ||
    asString(ledgerSnap.ledger_id || ledgerSnap.id) ||
    undefined;
  const ledgerName =
    asString(raw.ledger_name) ||
    asString(ledgerSnap.ledger_name || ledgerSnap.name) ||
    "";
  const ledgerCode =
    asString(raw.ledger_code) ||
    asString(ledgerSnap.ledger_code || ledgerSnap.code) ||
    "";
  const hsnId =
    asString(raw.hsn_id) ||
    asString(hsnSnap.hsn_id || hsnSnap.id) ||
    undefined;
  const hsnCode =
    asString(raw.hsn_code) ||
    asString(hsnSnap.hsn_code || hsnSnap.hsnCode || hsnSnap.code) ||
    undefined;
  const chargeSourceRaw = asString(raw.charge_source).toUpperCase();
  const isOrder = chargeSourceRaw === "ORDER";

  return {
    id: asString(raw.sales_invoice_additional_charge_id || raw.id || `chg-${idx}`),
    expenseHead: chargeName,
    amount: asNumber(raw.amount ?? raw.taxable_amount),
    gstApplicable: Boolean(raw.gst_applicable) || gstPct > 0,
    gstPct,
    remarks: asString(raw.remarks) || "",
    origin: isOrder ? "sales_order" : "manual",
    chargeSource: isOrder ? "ORDER" : "INVOICE",
    chargeMasterId: asString(raw.additional_charge_id) || undefined,
    coaLedgerId: ledgerId || undefined,
    coaLedgerName: ledgerName,
    coaLedgerCode: ledgerCode,
    hsnId: hsnId || undefined,
    hsnCode: hsnCode || undefined,
  };
}

export function mapSalesInvoiceDetailToRecord(
  dto: SalesInvoiceDetailDto,
): InvoiceRecord {
  const kind = mapInvoiceTypeToKind(dto.invoice_type, dto.dispatch?.source_type);
  const customerSnap = (dto.customer_snapshot || {}) as Record<string, unknown>;
  const warehouseSnap = (dto.warehouse_snapshot || {}) as Record<string, unknown>;
  const billing = (dto.billing_address_snapshot || {}) as Record<string, unknown>;
  const shipping = (dto.shipping_address_snapshot || {}) as Record<string, unknown>;
  const status = mapBackendStatusToFrontend(dto.status);
  const grandTotal = asNumber(dto.invoice_amount);
  const taxAmount = asNumber(dto.gst_amount);
  const discountTotal = asNumber(dto.product_discount_amount);
  const subtotal = asNumber(dto.gross_amount) || asNumber(dto.taxable_amount);
  const customerName =
    dto.customer?.customer_name ||
    snapshotStr(customerSnap, "customer_name", "customerName", "name") ||
    "";
  const gstin =
    snapshotStr(customerSnap, "gstin_no", "gstin", "customerGst") || "";
  const warehouseName =
    dto.warehouse?.warehouse_name ||
    snapshotStr(warehouseSnap, "warehouse_name", "warehouseName", "name") ||
    "";
  const salespersonName =
    dto.sales_order?.salesperson_name || dto.salesperson_name || "";
  const posSnap = (dto.place_of_supply_snapshot || {}) as Record<string, unknown>;
  const placeOfSupply =
    snapshotStr(posSnap, "state_name", "stateName") ||
    asString(dto.place_of_supply_state_code);
  const lineItems = (dto.items || []).map((item, idx) => {
    const line = mapBackendLineItem(item, idx);
    return salespersonName && !line.salesperson
      ? { ...line, salesperson: salespersonName }
      : line;
  });
  const additionalExpenses = (dto.additional_charges || []).map((c, idx) =>
    mapBackendAdditionalCharge(c, idx),
  );
  const srNo = asNumber(dto.sr_no);

  return {
    id: srNo || 0,
    salesInvoiceId: dto.sales_invoice_id,
    invoiceNo: dto.invoice_number,
    invoiceType: kind === "stock_transfer" ? "stock_transfer" : "sales",
    invoiceDate: asDateOnly(dto.invoice_date),
    dueDate: asDateOnly(dto.due_date) || asDateOnly(dto.invoice_date),
    referenceNo: dto.dispatch?.dispatch_number || "",
    remarks: asString(dto.remarks || dto.narration),
    customerId: null,
    customerUuid: dto.customer_id || dto.customer?.customer_id || undefined,
    customerName,
    customerMobile: snapshotStr(customerSnap, "mobile_no", "mobile"),
    customerEmail: snapshotStr(customerSnap, "email"),
    customerGst: gstin,
    billingAddress:
      formatAddressSnapshot(billing) ||
      snapshotStr(customerSnap, "registered_gst_address", "billing_address"),
    shippingAddress:
      formatAddressSnapshot(shipping) ||
      snapshotStr(customerSnap, "shipping_address"),
    lineItems,
    subtotal,
    discountTotal,
    taxAmount,
    grandTotal,
    amountReceived: 0,
    balanceAmount: status === "cancelled" ? 0 : grandTotal,
    invoiceStatus: status,
    paymentStatus: status === "cancelled" ? "paid" : "unpaid",
    collections: [],
    attachments: [],
    activity: [],
    cancellationReason: asString(dto.cancellation_reason) || undefined,
    sourceDispatchId: dto.dispatch_id || dto.dispatch?.id || undefined,
    dispatchDate: asDateOnly(dto.dispatch?.dispatch_date),
    sourceType:
      kind === "service"
        ? "service"
        : kind === "stock_transfer"
          ? "stock_transfer"
          : kind === "sample_order"
            ? "sample_order"
            : "sales_order",
    dispatchNo: dto.dispatch?.dispatch_number || dto.dispatch_number || undefined,
    salesOrderNo:
      dto.sales_order?.so_number ||
      undefined,
    salesOrderId: dto.sales_order?.sales_order_id ?? null,
    branch: warehouseName,
    warehouse: warehouseName,
    warehouseUuid: dto.warehouse_id || dto.warehouse?.warehouse_id || undefined,
    placeOfSupply,
    interstate: dto.is_interstate ?? false,
    cgstTotal: asNumber(dto.cgst_amount),
    sgstTotal: asNumber(dto.sgst_amount),
    igstTotal: asNumber(dto.igst_amount),
    additionalExpenses,
    roundOff: asNumber(dto.round_off_amount),
    irn: asString(dto.irn_number) || undefined,
    eInvoiceNo: asString(dto.acknowledgement_number) || undefined,
    eInvoiceStatus: (dto.einvoice_status || dto.irn_number
      ? statutoryStatus(dto.einvoice_status, Boolean(asString(dto.irn_number)))
      : undefined) as InvoiceRecord["eInvoiceStatus"],
    acknowledgementNo: asString(dto.acknowledgement_number) || undefined,
    acknowledgementDate: asDateOnly(dto.acknowledgement_date) || undefined,
    qrCodeAvailable: Boolean(asString(dto.signed_qr_code || dto.irn_number)),
    ewayBillNo: asString(dto.eway_bill_number) || undefined,
    ewayBillExpiryDate: asDateOnly(dto.eway_bill_valid_upto) || undefined,
    ewayBillGeneratedAt: asDateOnly(dto.eway_bill_date) || undefined,
    ewayBillStatus: (dto.eway_bill_status || dto.eway_bill_number
      ? statutoryStatus(
          dto.eway_bill_status,
          Boolean(asString(dto.eway_bill_number)),
        )
      : undefined) as InvoiceRecord["ewayBillStatus"],
    vehicleNo: asString(dto.dispatch?.vehicle_number) || undefined,
    transporterName: asString(dto.dispatch?.transporter) || undefined,
    transporterId: asString(dto.dispatch?.transporter_id) || undefined,
    transportMode: asString(dto.dispatch?.transport_mode) || undefined,
    lrNo: asString(dto.dispatch?.lr_number) || undefined,
    lrDate: asDateOnly(dto.dispatch?.lr_date) || undefined,
    transportDocNo:
      asString(dto.dispatch?.transport_doc_number) ||
      asString(dto.dispatch?.lr_number) ||
      undefined,
    transportDocDate:
      asDateOnly(dto.dispatch?.transport_doc_date) ||
      asDateOnly(dto.dispatch?.lr_date) ||
      undefined,
    distanceKm: (() => {
      const n = Number(dto.dispatch?.approx_distance);
      return Number.isFinite(n) && n > 0 ? n : undefined;
    })(),
    postedVoucherNo: dto.accounting_voucher?.voucher_number || undefined,
    postedVoucherId: dto.accounting_voucher?.accounting_voucher_id ?? null,
    customerLedgerUuid:
      dto.customer_ledger_id ||
      dto.accounting_voucher?.party_ledger_id ||
      undefined,
    salesperson:
      dto.sales_order?.salesperson_name ||
      dto.salesperson_name ||
      lineItems.find((line) => line.salesperson)?.salesperson ||
      undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "",
    updatedBy: "",
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

export const SalesInvoiceService = {
  async getPreviewNumber(params: SiNumberParams = {}): Promise<string> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.PREVIEW_NUMBER,
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
    return asString(data?.invoice_no) || asString(data?.invoiceNo) || "";
  },

  async allocateNumber(
    params: SiNumberParams = {},
  ): Promise<{ invoice_no: string; document_sequence_id: string }> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.ALLOCATE,
      {
        ...(params.warehouseId ? { warehouse_id: params.warehouseId } : {}),
        ...(params.state ? { state: params.state } : {}),
      },
    );
    const data = (unwrapData(response) ?? {}) as Record<string, unknown>;
    return {
      invoice_no: asString(data.invoice_no || data.invoiceNo),
      document_sequence_id: asString(
        data.document_sequence_id || data.documentSequenceId,
      ),
    };
  },

  async listEligibleDispatches(
    query: EligibleDispatchesQuery = {},
  ): Promise<PaginatedResult<EligibleDispatchDto>> {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.ELIGIBLE_DISPATCHES}${buildQuery(query)}`,
      );
      return unwrapData(response) as PaginatedResult<EligibleDispatchDto>;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to load eligible dispatches."),
      );
    }
  },

  async prepareDispatch(dispatchId: string): Promise<PrepareDispatchInvoiceDto> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.PREPARE_DISPATCH(dispatchId),
      );
      return unwrapData(response) as PrepareDispatchInvoiceDto;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to prepare dispatch for invoice."),
      );
    }
  },

  async previewDispatchTotals(
    dispatchId: string,
    payload: Pick<CreateFromDispatchPayload, "additional_charges" | "round_off_amount"> = {},
  ): Promise<DispatchInvoiceTotalsPreview> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.PREVIEW_DISPATCH_TOTALS(dispatchId),
        payload,
      );
      const data = unwrapData(response);
      if (!data) {
        throw new Error("Failed to preview dispatch invoice totals.");
      }
      return data as DispatchInvoiceTotalsPreview;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to preview dispatch invoice totals."),
      );
    }
  },

  async createFromDispatch(
    dispatchId: string,
    payload: CreateFromDispatchPayload,
  ): Promise<SalesInvoiceCreateResult> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.CREATE_FROM_DISPATCH(dispatchId),
        payload,
      );
      const data = unwrapData(response);
      if (!data) throw new Error("Failed to create sales invoice from dispatch.");
      return data as SalesInvoiceCreateResult;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to create sales invoice from dispatch."),
      );
    }
  },

  async createDirectService(
    payload: CreateDirectServicePayload,
  ): Promise<SalesInvoiceCreateResult> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.CREATE_DIRECT_SERVICE,
        payload,
      );
      const data = unwrapData(response);
      if (!data) throw new Error("Failed to create service invoice.");
      return data as SalesInvoiceCreateResult;
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to create service invoice."),
      );
    }
  },

  async list(
    query: ListSalesInvoicesQuery = {},
  ): Promise<PaginatedResult<SalesInvoiceListDto>> {
    try {
      const response = await axiosInstance.get(
        `${API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.LIST}${buildQuery(query)}`,
      );
      return unwrapData(response) as PaginatedResult<SalesInvoiceListDto>;
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to list sales invoices."));
    }
  },

  async getById(id: string): Promise<SalesInvoiceDetailDto> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.BY_ID(id),
      );
      return unwrapData(response) as SalesInvoiceDetailDto;
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to load sales invoice."));
    }
  },

  async cancel(
    id: string,
    payload: CancelSalesInvoicePayload,
  ): Promise<SalesInvoiceCancelResult> {
    try {
      const response = await axiosInstance.post(
        API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.CANCEL(id),
        payload,
      );
      return unwrapData(response) as SalesInvoiceCancelResult;
    } catch (error) {
      throw new Error(extractErrorMessage(error, "Failed to cancel sales invoice."));
    }
  },

  async generatePdf(params: {
    htmlContent: string;
    filename: string;
  }): Promise<Blob> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.PDF,
      { htmlContent: params.htmlContent, filename: params.filename },
      { responseType: "blob" },
    );
    return response.data as Blob;
  },

  async generateExcel(params: {
    headers: string[];
    rows: unknown[][];
    filename: string;
  }): Promise<Blob> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.ACCOUNTS.SALES_INVOICE.EXCEL,
      {
        headers: params.headers,
        rows: params.rows,
        filename: params.filename,
      },
      { responseType: "blob" },
    );
    return response.data as Blob;
  },

  isUuid(value: string | null | undefined): boolean {
    return Boolean(value && UUID_RE.test(value.trim()));
  },
};

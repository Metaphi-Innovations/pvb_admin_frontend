import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import { amountInWords, round2 } from "@/lib/procurement/utils";
import type { ProcurementAdditionalCharge } from "@/lib/procurement/procurement-line-utils";
import {
  mapBackendStatusToFrontend,
  mapFrontendStatusToBackend,
  type POListStatus,
} from "@/lib/procurement/po-status"; 
import type {
  POAttachment,
  POLineItem,
  POSummary,
  PurchaseOrder,
} from "@/app/(app)/procurement/purchase-orders/po-data";
import type { POFormValues } from "@/app/(app)/procurement/purchase-orders/components/PurchaseOrderForm";
import { recalcPO } from "@/app/(app)/procurement/purchase-orders/po-data";
import type { POFollowUpEntry } from "@/app/(app)/procurement/purchase-orders/po-followup-data";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function toUuidOrNull(value: unknown): string | null {
  const raw = asString(value).trim();
  if (!raw || !UUID_RE.test(raw)) return null;
  return raw;
}

function toDisplayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const username = asString(record.username).trim();
  if (username) return username;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  return `${first} ${last}`.trim();
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapDiscountType(value: unknown): "percentage" | "flat" {
  const raw = asString(value).toLowerCase();
  return raw === "flat" || raw === "fixed" ? "flat" : "percentage";
}

function mapBackendDiscountType(value: unknown): "Percentage" | "Flat" {
  return mapDiscountType(value) === "flat" ? "Flat" : "Percentage";
}

function mapAdditionalCharges(raw: unknown): ProcurementAdditionalCharge[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      uid: `chg-${idx}`,
      chargeName: asString(row.charge_name ?? row.name ?? row.chargeName),
      amount: asNumber(row.amount ?? row.value),
      remarks: asString(row.remarks),
      cgstPct: asNumber(row.cgst_percent ?? row.cgstPct),
      sgstPct: asNumber(row.sgst_percent ?? row.sgstPct),
      igstPct: asNumber(row.igst_percent ?? row.igstPct),
    };
  });
}

function mapAttachments(raw: unknown): POAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item, idx) => {
    if (typeof item === "string") {
      const name = item.split("/").pop() || `attachment-${idx + 1}`;
      return {
        uid: `att-${idx}`,
        name,
        size: "",
        uploadedAt: "",
        uploadedBy: "",
        url: item,
      };
    }
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      uid: asString(row.uid ?? `att-${idx}`),
      name: asString(row.name ?? row.file_name ?? row.fileName),
      size: asString(row.size),
      uploadedAt: asDateOnly(row.uploaded_at ?? row.uploadedAt),
      uploadedBy: asString(row.uploaded_by ?? row.uploadedBy),
    };
  });
}

function mapLine(raw: Record<string, unknown>, index: number): POLineItem {
  const orderedQty = asNumber(raw.ordered_qty ?? raw.ordered_base_qty);
  const rate = asNumber(raw.rate);
  const discountType = mapDiscountType(raw.discount_type);
  const discountValue = asNumber(raw.discount_value);
  const discountAmount =
    discountType === "percentage"
      ? round2((orderedQty * rate * discountValue) / 100)
      : discountValue;
  const taxable = round2(orderedQty * rate - discountAmount);
  const cgstPct = asNumber(raw.cgst_percent);
  const sgstPct = asNumber(raw.sgst_percent);
  const igstPct = asNumber(raw.igst_percent);
  const gstAmount = asNumber(raw.gst_amount);
  const totalAmount = asNumber(raw.total_amount);
  const productId = toUuidOrNull(raw.product_id) ?? asString(raw.product_id) ?? 0;

  return {
    uid: asString(raw.purchase_order_product_id) || `pl-${index}`,
    purchaseOrderProductId: toUuidOrNull(raw.purchase_order_product_id) ?? undefined,
    productId: productId || 0,
    productCode: asString(raw.product_code),
    productName: asString(raw.product_name),
    description: "",
    sku: asString(raw.product_code),
    category: "",
    hsnCode: "",
    baseUnit: asString(raw.base_unit) || "Unit",
    packagingUnit: asString(raw.packing_unit) || "Box",
    conversionQty: 1,
    orderUom: "Unit",
    orderedQtyPack: orderedQty || 1,
    uom: asString(raw.base_unit) || "Unit",
    orderedQty: orderedQty || 1,
    unitPrice: rate,
    discountType,
    discountPct: discountType === "percentage" ? discountValue : 0,
    discountFlatAmount: discountType === "flat" ? discountValue : 0,
    discountAmount,
    cgstPct,
    sgstPct,
    igstPct,
    grossAmount: round2(orderedQty * rate),
    taxAmount: gstAmount,
    netAmount: totalAmount || round2(taxable + gstAmount),
    deliverySchedule: "",
    remarks: asString(raw.remarks),
    receivedQty: asNumber(raw.received_qty),
    shortClosedQty: asNumber(raw.short_closed_qty),
  };
}

function mapSummaryFromDetail(raw: Record<string, unknown>, lines: POLineItem[]): POSummary {
  const productTotal = asNumber(raw.product_total);
  const additionalChargesTotal = asNumber(raw.additional_charges_amount);
  const taxableValue = asNumber(raw.taxable_amount);
  const gstAmount = asNumber(raw.gst_amount);
  const grandTotal = asNumber(raw.grand_total);
  const totalCgst = lines.reduce(
    (s, l) => s + round2((l.orderedQty * l.unitPrice - l.discountAmount) * (l.cgstPct / 100)),
    0,
  );
  const totalSgst = lines.reduce(
    (s, l) => s + round2((l.orderedQty * l.unitPrice - l.discountAmount) * (l.sgstPct / 100)),
    0,
  );
  const totalIgst = lines.reduce(
    (s, l) => s + round2((l.orderedQty * l.unitPrice - l.discountAmount) * (l.igstPct / 100)),
    0,
  );

  return {
    grossAmount: productTotal,
    totalDiscount: 0,
    productTotal,
    additionalChargesTotal,
    taxableValue,
    totalCgst: round2(totalCgst),
    totalSgst: round2(totalSgst),
    totalIgst: round2(totalIgst),
    otherCharges: additionalChargesTotal,
    grandTotal,
    amountInWords: amountInWords(grandTotal),
  };
}

function mapInvoices(raw: unknown): PurchaseOrder["activity"] {
  return [];
}

export function mapDetail(raw: Record<string, unknown>): PurchaseOrder {
  const supplier = asRecord(raw.supplier);
  const snapshot = asRecord(raw.supplier_snapshot);
  const supplierTypeFromSupplier = asString(
    asRecord(supplier.supplier_type).supplier_type_name ?? supplier.supplier_type,
  );
  const supplierTypeFromSnapshot = asString(
    asRecord(snapshot.supplier_type).supplier_type_name ?? snapshot.supplier_type,
  );
  const pr =
    raw.purchase_requisition &&
    typeof raw.purchase_requisition === "object" &&
    !Array.isArray(raw.purchase_requisition)
      ? (raw.purchase_requisition as Record<string, unknown>)
      : {};
  const products = Array.isArray(raw.products) ? raw.products : [];
  const lines = products.map((row, idx) =>
    mapLine((row ?? {}) as Record<string, unknown>, idx),
  );
  const followups = Array.isArray(raw.followups) ? raw.followups : [];
  const invoices = Array.isArray(raw.invoices) ? raw.invoices : [];

  const supplierName =
    asString(supplier.supplier_name) ||
    asString(snapshot.supplier_name) ||
    "";
  const supplierGstin =
    asString(supplier.gstin_number) || asString(snapshot.gst_no) || "";

  const status = mapBackendStatusToFrontend(raw.po_status);
  const hasInvoice = invoices.length > 0;
  const displayStatus: POListStatus =
    hasInvoice && status === "approved" ? "invoice_uploaded" : status;

  const shortClose =
    status === "short_closed" || asNumber(raw.short_closed_qty) > 0
      ? {
          closeType: "short_close" as const,
          quantity: lines.reduce((s, l) => s + (l.shortClosedQty ?? 0), 0),
          reason: "other" as const,
          remarks: asString(raw.short_close_remarks),
          shortClosedBy: toDisplayName(raw.short_closed_by_user),
          shortClosedDate: asDateOnly(raw.short_closed_at),
          shortClosedTime: "",
        }
      : undefined;

  const activity = [
    ...followups.map((f) => {
      const row = (f ?? {}) as Record<string, unknown>;
      return {
        date: asDateOnly(row.followup_date ?? row.created_at),
        action: "Supplier Follow-up",
        by: toDisplayName(row.created_by_user),
        note: asString(row.remarks),
      };
    }),
    ...mapInvoices(invoices),
  ];

  return {
    id: asString(raw.purchase_order_id),
    poNumber: asString(raw.po_no),
    poDate: asDateOnly(raw.po_date),
    supplierId: toUuidOrNull(raw.supplier_id ?? supplier.supplier_id) ?? 0,
    supplierName,
    supplierType: supplierTypeFromSnapshot || supplierTypeFromSupplier || "",
    supplierContactPerson:
      asString(supplier.contact_person) || asString(snapshot.contact_person),
    supplierMobile: asString(supplier.mobile_number) || asString(snapshot.mobile),
    supplierMobileCountry: "+91",
    supplierEmail: asString(supplier.email) || asString(snapshot.email),
    supplierGstin,
    referenceNumber: "",
    currency: "INR",
    paymentType: asString(raw.payment_type),
    creditDays: asNumber(raw.credit_days),
    deliveryTerms: "",
    expectedDeliveryDate: asDateOnly(raw.delivery_date),
    state: asString(raw.state),
    warehouseId: toUuidOrNull(raw.warehouse_id),
    warehouseName: asString(raw.warehouse_name),
    deliveryAddress: asString(raw.delivery_address),
    notes: asString(raw.remarks),
    sourcePrId: toUuidOrNull(raw.purchase_requisition_id ?? pr.id),
    sourcePrNumber: asString(pr.pr_number),
    billing: COMPANY_BILLING,
    shipping: {
      shipToLocation: asString(raw.warehouse_name),
      branch: asString(raw.state),
      address: asString(raw.delivery_address),
      contactPerson: "",
      contactNumber: "",
      sameAsBilling: false,
    },
    lines,
    terms: [],
    attachments: mapAttachments(raw.attachment_urls),
    additionalCharges: mapAdditionalCharges(raw.additional_charges),
    otherCharges: asNumber(raw.additional_charges_amount),
    summary: mapSummaryFromDetail(raw, lines),
    status: displayStatus,
    createdBy: toDisplayName(raw.created_by_user),
    createdDate: asDateOnly(raw.created_at),
    updatedBy: toDisplayName(raw.updated_by_user),
    updatedDate: asDateOnly(raw.updated_at),
    approvedBy: toDisplayName(raw.approved_by_user),
    approvedDate: asDateOnly(raw.approved_at),
    activity,
    shortClose,
  };
}

export function mapFollowupsFromDetail(raw: Record<string, unknown>): POFollowUpEntry[] {
  const followups = Array.isArray(raw.followups) ? raw.followups : [];
  const poId = asString(raw.purchase_order_id);
  return followups.map((item, idx) => {
    const row = (item ?? {}) as Record<string, unknown>;
    return {
      id: asString(row.purchase_order_followup_id) || `fu-${idx}`,
      poId,
      followUpAt: asString(row.followup_date ?? row.created_at),
      followUpType: asString(row.followup_type) as POFollowUpEntry["followUpType"],
      nextFollowUpAt: asString(row.next_followup_date) || undefined,
      spokeWith: asString(row.spoke_with) || "—",
      remarks: asString(row.remarks),
      createdBy: toDisplayName(row.created_by_user),
      createdAt: asString(row.created_at),
    };
  });
}

export interface POVendorInvoiceView {
  id: string;
  vendorInvoiceNo: string;
  invoiceDate: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  remarks: string;
  attachmentUrls: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export function mapInvoicesFromDetail(raw: Record<string, unknown>): POVendorInvoiceView[] {
  const invoices = Array.isArray(raw.invoices) ? raw.invoices : [];
  return invoices.map((item, idx) => {
    const row = (item ?? {}) as Record<string, unknown>;
    const urls = Array.isArray(row.invoice_attachment_urls)
      ? row.invoice_attachment_urls.map((u) => asString(u)).filter(Boolean)
      : [];
    return {
      id: asString(row.purchase_order_invoice_id) || `inv-${idx}`,
      vendorInvoiceNo: asString(row.supplier_invoice_no),
      invoiceDate: asDateOnly(row.supplier_invoice_date),
      subtotal: asNumber(row.invoice_amount),
      taxAmount: asNumber(row.gst_amount),
      grandTotal: asNumber(row.total_invoice_amount),
      remarks: asString(row.remarks),
      attachmentUrls: urls,
      createdBy: toDisplayName(row.created_by_user),
      createdAt: asString(row.created_at),
      updatedAt: asString(row.updated_at),
    };
  });
}

function buildWriteBody(
  form: POFormValues,
  options: { poNumber?: string; status: POListStatus },
): Record<string, unknown> {
  const { attachments: _newAtts, existingAttachments, ...restForm } = form;
  const draft = recalcPO({
    id: "temp",
    poNumber: options.poNumber ?? "",
    ...restForm,
    attachments: existingAttachments || [],
    summary: {
      grossAmount: 0,
      totalDiscount: 0,
      productTotal: 0,
      additionalChargesTotal: 0,
      taxableValue: 0,
      totalCgst: 0,
      totalSgst: 0,
      totalIgst: 0,
      otherCharges: 0,
      grandTotal: 0,
      amountInWords: "",
    },
    status: options.status,
    createdBy: "",
    createdDate: "",
    updatedBy: "",
    updatedDate: "",
    approvedBy: "",
    approvedDate: "",
    activity: [],
  });

  const backendStatus = mapFrontendStatusToBackend(options.status) ?? "Draft";
  const gstAmount = round2(
    draft.summary.totalCgst + draft.summary.totalSgst + draft.summary.totalIgst,
  );

  return {
    po_no: options.poNumber?.trim() || null,
    purchase_requisition_id: toUuidOrNull(form.sourcePrId),
    supplier_id: toUuidOrNull(form.supplierId),
    po_date: form.poDate || null,
    delivery_date: form.expectedDeliveryDate || null,
    remarks: form.notes || null,
    po_status: backendStatus,
    payment_type: form.paymentType || null,
    credit_days: form.creditDays ?? null,
    state: form.state || null,
    warehouse_id: toUuidOrNull(form.warehouseId),
    warehouse_name: form.warehouseName || null,
    delivery_address: form.deliveryAddress || null,
    additional_charges: (form.additionalCharges ?? []).map((c) => ({
      charge_name: c.chargeName,
      charge_type: "Fixed",
      value: c.amount,
      amount: c.amount,
      cgst_percent: c.cgstPct ?? 0,
      sgst_percent: c.sgstPct ?? 0,
      igst_percent: c.igstPct ?? 0,
      remarks: c.remarks ?? "",
    })),
    product_total: draft.summary.productTotal,
    additional_charges_amount: draft.summary.additionalChargesTotal,
    taxable_amount: draft.summary.taxableValue,
    gst_amount: gstAmount,
    grand_total: draft.summary.grandTotal,
    products: form.lines
      .filter((l) => l.productName || l.productCode || l.productId)
      .map((line) => ({
        product_id: toUuidOrNull(line.productId),
        product_code: line.productCode || null,
        product_name: line.productName || null,
        base_unit: line.baseUnit || null,
        packing_unit: line.packagingUnit || null,
        requested_qty: line.orderedQtyPack ?? line.orderedQty,
        ordered_qty: line.orderedQty,
        rate: line.unitPrice,
        discount_type: mapBackendDiscountType(line.discountType),
        discount_value:
          line.discountType === "flat" ? line.discountFlatAmount : line.discountPct,
        gst_percent: round2(line.cgstPct + line.sgstPct + line.igstPct),
        cgst_percent: line.cgstPct,
        sgst_percent: line.sgstPct,
        igst_percent: line.igstPct,
        gst_amount: line.taxAmount,
        total_amount: line.netAmount,
        remarks: line.remarks || null,
      })),
    existingAttachments: (form.existingAttachments ?? [])
      .map((a) => a.url)
      .filter(Boolean),
  };
}

function appendFormData(body: Record<string, unknown>, files: File[] = []): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    if (value === null) {
      formData.append(key, "");
      continue;
    }
    if (typeof value === "object") {
      formData.append(key, JSON.stringify(value));
      continue;
    }
    formData.append(key, String(value));
  }
  files.forEach((file, index) => {
    formData.append(`attachments[${index}]`, file);
  });
  return formData;
}

function assertSuccess(body: Record<string, unknown>, fallback: string): void {
  if (body.success === false) {
    throw new Error(asString(body.message) || fallback);
  }
}

export const PurchaseOrderService = {
  async getById(id: string, signal?: AbortSignal): Promise<PurchaseOrder> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.DETAILS(id),
      { signal },
    );
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapDetail(data as Record<string, unknown>);
  },

  async getRawById(id: string, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.DETAILS(id),
      { signal },
    );
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return data as Record<string, unknown>;
  },

  async getPreviewNumber(signal?: AbortSignal): Promise<string> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.PREVIEW_NUMBER,
      { signal },
    );
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!data || typeof data !== "object") return "";
    return asString((data as Record<string, unknown>).po_no);
  },

  async create(
    form: POFormValues,
    options: { poNumber?: string; status: POListStatus; files?: File[] },
  ): Promise<PurchaseOrder> {
    const body = buildWriteBody(form, options);
    const formData = appendFormData(body, options.files);
    const response = await axiosInstance.post(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.CREATE,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to create purchase order.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapDetail(data as Record<string, unknown>);
  },

  async update(
    id: string,
    form: POFormValues,
    options: { poNumber?: string; status: POListStatus; files?: File[] },
  ): Promise<PurchaseOrder> {
    const body = buildWriteBody(form, options);
    const formData = appendFormData(body, options.files);
    const response = await axiosInstance.put(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.UPDATE(id),
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to update purchase order.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapDetail(data as Record<string, unknown>);
  },

  async createFollowup(input: {
    purchaseOrderId: string;
    followupDate?: string;
    followupType?: string;
    nextFollowupDate?: string;
    spokeWith?: string;
    remarks?: string;
  }): Promise<void> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.FOLLOWUP_CREATE,
      {
        purchase_order_id: input.purchaseOrderId,
        followup_date: input.followupDate || null,
        followup_type: input.followupType || null,
        next_followup_date: input.nextFollowupDate || null,
        spoke_with: input.spokeWith || null,
        remarks: input.remarks || null,
      },
    );
    assertSuccess(response.data as Record<string, unknown>, "Failed to create follow-up.");
  },

  async uploadInvoice(input: {
    purchaseOrderId: string;
    supplierInvoiceNo: string;
    supplierInvoiceDate: string;
    invoiceAmount: number;
    gstAmount: number;
    totalInvoiceAmount: number;
    remarks?: string;
    file?: File | null;
  }): Promise<void> {
    const formData = new FormData();
    formData.append("purchase_order_id", input.purchaseOrderId);
    formData.append("supplier_invoice_no", input.supplierInvoiceNo);
    formData.append("supplier_invoice_date", input.supplierInvoiceDate);
    formData.append("invoice_amount", String(input.invoiceAmount));
    formData.append("gst_amount", String(input.gstAmount));
    formData.append("total_invoice_amount", String(input.totalInvoiceAmount));
    formData.append("remarks", input.remarks ?? "");
    if (input.file) {
      formData.append("attachments", input.file);
    }
    const response = await axiosInstance.post(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.INVOICE_UPLOAD,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    assertSuccess(response.data as Record<string, unknown>, "Failed to upload invoice.");
  },

  async shortClose(input: {
    purchaseOrderId: string;
    shortCloseReason?: string;
    shortCloseRemarks?: string;
    products: { purchaseOrderProductId: string; shortClosedQty: number }[];
  }): Promise<PurchaseOrder> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.SHORT_CLOSE,
      {
        purchase_order_id: input.purchaseOrderId,
        short_close_reason: input.shortCloseReason || null,
        short_close_remarks: input.shortCloseRemarks || null,
        products: input.products.map((p) => ({
          purchase_order_product_id: p.purchaseOrderProductId,
          short_closed_qty: p.shortClosedQty,
        })),
      },
    );
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to short close purchase order.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapDetail(data as Record<string, unknown>);
  },

  async close(purchaseOrderId: string): Promise<PurchaseOrder> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.CLOSE,
      { purchase_order_id: purchaseOrderId },
    );
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to close purchase order.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapDetail(data as Record<string, unknown>);
  },

  async cancel(purchaseOrderId: string): Promise<PurchaseOrder> {
    const response = await axiosInstance.post(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_ORDER.CANCEL,
      { purchase_order_id: purchaseOrderId },
    );
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to cancel purchase order.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapDetail(data as Record<string, unknown>);
  },
};

/** Allocate a total short-close qty across lines (FIFO by line order). */
export function allocateShortCloseProducts(
  lines: POLineItem[],
  totalQty: number,
): { purchaseOrderProductId: string; productName: string; productCode: string; pendingQty: number; shortClosedQty: number }[] {
  let remaining = Math.floor(totalQty);
  return lines
    .map((line) => {
      const productId = line.purchaseOrderProductId;
      if (!productId) return null;
      const pending = Math.max(
        0,
        (line.orderedQty || 0) - (line.receivedQty ?? 0) - (line.shortClosedQty ?? 0),
      );
      if (pending <= 0) {
        return {
          purchaseOrderProductId: productId,
          productName: line.productName,
          productCode: line.productCode,
          pendingQty: 0,
          shortClosedQty: 0,
        };
      }
      const take = Math.min(pending, remaining);
      remaining -= take;
      return {
        purchaseOrderProductId: productId,
        productName: line.productName,
        productCode: line.productCode,
        pendingQty: pending,
        shortClosedQty: take,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

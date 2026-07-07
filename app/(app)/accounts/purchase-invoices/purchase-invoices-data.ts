import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { splitInvoiceGst } from "@/lib/accounts/invoice-gst-breakup";
import { getActiveVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { buildPurchaseInvoiceSeedRecords } from "./purchase-invoice-seed";
import {
  getPOById,
  loadPurchaseOrders,
  savePurchaseOrders,
  type POLineItem,
  type PurchaseOrder,
} from "@/app/(app)/procurement/purchase-orders/po-data";
import { todayStr } from "@/lib/procurement/utils";
import type { ProcurementAdditionalCharge } from "@/lib/procurement/procurement-line-utils";
import { sumAdditionalCharges } from "@/lib/procurement/procurement-line-utils";
import { maybePostPurchaseInvoice } from "@/lib/accounts/document-posting-bridge";
import type { AccountsDocumentWorkflow } from "@/lib/accounts/accounts-maker-checker";

export type PurchaseDebitStatus = "no_debit" | "partially_debited" | "fully_debited";
export type POCreditDebitStatus = "open" | "partially_returned" | "closed";
export type PurchaseSource = "po_invoice" | "manual_entry";

export const PURCHASE_SOURCE_LABELS: Record<PurchaseSource, string> = {
  po_invoice: "PO Invoice",
  manual_entry: "Manual Entry",
};

export interface PurchaseAttachment {
  id: string;
  documentName: string;
  fileName: string;
  dataUrl?: string;
  uploadedAt: string;
}

export interface PurchaseInvoiceLine {
  id: string;
  productId: number | null;
  productName: string;
  description: string;
  batchNumber?: string;
  mfgDate?: string;
  expDate?: string;
  invoiceQty: number;
  unit: string;
  unitPrice: number;
  taxPct: number;
  lineAmount: number;
  taxAmount: number;
  debitedQty: number;
  debitedAmount: number;
}

/** OCR / API invoice ingestion payload (future-ready) */
export interface PurchaseInvoiceOcrPayload {
  source: "manual" | "ocr" | "api";
  rawText?: string;
  confidence?: number;
  extractedAt?: string;
  vendorGstin?: string;
  lineItems?: Array<{
    description: string;
    qty: number;
    rate: number;
    amount: number;
    hsn?: string;
  }>;
}

export interface PurchaseInvoiceRecord {
  id: number;
  /** Internal purchase record no. (e.g. PUR-0001) */
  invoiceNo: string;
  invoiceDate: string;
  /** Vendor's invoice number */
  vendorInvoiceNo: string;
  vendorId: number;
  vendorName: string;
  vendorGst: string;
  poId: number | null;
  poNumber: string;
  poDate: string;
  grnId: string | null;
  grnNo: string;
  source: PurchaseSource;
  lineItems: PurchaseInvoiceLine[];
  additionalCharges: ProcurementAdditionalCharge[];
  productAmount: number;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  amountPaid: number;
  amountDebited: number;
  balanceDebitAllowed: number;
  debitStatus: PurchaseDebitStatus;
  poAdjustmentStatus: POCreditDebitStatus;
  remarks: string;
  attachment: PurchaseAttachment | null;
  ocrPayload?: PurchaseInvoiceOcrPayload | null;
  matchStatus?: "pending" | "matched" | "partial_match" | "mismatch";
  workflow?: AccountsDocumentWorkflow;
  activity?: Array<{ date: string; time?: string; action: string; by: string; remarks?: string }>;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_accounts_purchase_invoices_v2";

function toNumericId(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function lineFromPO(line: POLineItem): PurchaseInvoiceLine {
  const taxPct = line.cgstPct + line.sgstPct + line.igstPct;
  const taxable = Math.max(0, line.netAmount - (line.taxAmount ?? 0));
  return {
    id: line.uid,
    productId: typeof line.productId === "number" ? line.productId : null,
    productName: line.productName,
    description: line.description,
    invoiceQty: line.orderedQty,
    unit: line.uom,
    unitPrice: line.unitPrice,
    taxPct,
    lineAmount: taxable,
    taxAmount: line.taxAmount ?? 0,
    debitedQty: 0,
    debitedAmount: 0,
  };
}

function nextPurchaseNo(records: PurchaseInvoiceRecord[]): string {
  const max = records.reduce((m, r) => {
    const n = parseInt(r.invoiceNo.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `PUR-${String(max + 1).padStart(4, "0")}`;
}

export function newPurchaseAttachmentId(): string {
  return `patt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePI(rec: PurchaseInvoiceRecord): PurchaseInvoiceRecord {
  const amountDebited = rec.lineItems.reduce((s, l) => s + l.debitedAmount, 0);
  const amountPaid = rec.amountPaid ?? 0;
  const balanceDebitAllowed = Math.max(0, rec.grandTotal - amountDebited);
  let debitStatus: PurchaseDebitStatus = "no_debit";
  if (amountDebited > 0 && amountDebited < rec.grandTotal) debitStatus = "partially_debited";
  if (amountDebited >= rec.grandTotal && rec.grandTotal > 0) debitStatus = "fully_debited";
  const productAmount =
    rec.productAmount ??
    rec.lineItems.reduce((s, l) => s + l.lineAmount, 0);
  const additionalCharges = rec.additionalCharges ?? [];
  const additionalTotal = sumAdditionalCharges(additionalCharges);
  const subtotal = rec.subtotal ?? productAmount + additionalTotal;
  return {
    ...rec,
    grnId: rec.grnId ?? null,
    grnNo: rec.grnNo ?? "",
    additionalCharges,
    productAmount: Math.round(productAmount * 100) / 100,
    subtotal: Math.round(subtotal * 100) / 100,
    amountPaid: Math.round(amountPaid * 100) / 100,
    amountDebited: Math.round(amountDebited * 100) / 100,
    balanceDebitAllowed: Math.round(balanceDebitAllowed * 100) / 100,
    debitStatus,
    attachment: rec.attachment ?? null,
    vendorInvoiceNo: rec.vendorInvoiceNo ?? "",
    remarks: rec.remarks ?? "",
    poDate: rec.poDate ?? "",
    source: rec.source ?? (rec.poId ? "po_invoice" : "manual_entry"),
    ocrPayload: rec.ocrPayload ?? null,
    activity: rec.activity ?? [],
  };
}

export function isGrnPurchaseInvoice(rec: PurchaseInvoiceRecord): boolean {
  return rec.source !== "manual_entry" && Boolean(rec.grnId?.trim() && rec.grnNo?.trim());
}

export function getPurchaseInvoiceGstBreakup(rec: PurchaseInvoiceRecord) {
  const taxableValue = rec.subtotal ?? rec.productAmount ?? 0;
  const { cgst, sgst, igst } = splitInvoiceGst(rec.taxAmount ?? 0, false);
  return { taxableValue, cgst, sgst, igst };
}

export function getPurchaseInvoicePaymentStatus(
  rec: Pick<PurchaseInvoiceRecord, "amountPaid" | "grandTotal">,
): "paid" | "partial" | "unpaid" {
  if (rec.amountPaid >= rec.grandTotal && rec.grandTotal > 0) return "paid";
  if (rec.amountPaid > 0) return "partial";
  return "unpaid";
}

export function loadPurchaseInvoices(): PurchaseInvoiceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const legacy = localStorage.getItem("ds_accounts_purchase_invoices_v1");
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw && legacy) {
      const migrated = (JSON.parse(legacy) as PurchaseInvoiceRecord[]).map(normalizePI);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    let list: PurchaseInvoiceRecord[] = raw ? JSON.parse(raw) : [];
    if (list.length === 0) {
      list = buildPurchaseInvoiceSeedRecords();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return list.map(normalizePI);
    }
    const normalized = list.map(normalizePI);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return [];
  }
}

/** Listing scope — GRN-linked purchase invoices only. */
export function loadGrnPurchaseInvoices(): PurchaseInvoiceRecord[] {
  return loadPurchaseInvoices().filter(isGrnPurchaseInvoice);
}

export function savePurchaseInvoices(records: PurchaseInvoiceRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.map(normalizePI)));
}

export function getPurchaseInvoiceById(id: number): PurchaseInvoiceRecord | undefined {
  return loadPurchaseInvoices().find((p) => p.id === id);
}

export function getPurchaseInvoiceByNo(invoiceNo: string): PurchaseInvoiceRecord | undefined {
  return loadPurchaseInvoices().find((p) => p.invoiceNo === invoiceNo);
}

export function listPurchaseInvoicesByPO(poId: number): PurchaseInvoiceRecord[] {
  return loadPurchaseInvoices().filter((p) => p.poId === poId);
}

export function listCreditablePurchaseInvoices(): PurchaseInvoiceRecord[] {
  return loadPurchaseInvoices().filter((p) => p.debitStatus !== "fully_debited");
}

export type POVendorInvoiceInput = {
  vendorInvoiceNo: string;
  vendorInvoiceDate: string;
  invoiceAmount: number;
  taxAmount: number;
  totalAmount: number;
  remarks: string;
  attachment: PurchaseAttachment | null;
};

export type ManualPurchaseInput = {
  vendorId: number;
  vendorInvoiceNo: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxAmount: number;
  totalAmount: number;
  remarks: string;
  attachment: PurchaseAttachment | null;
  poId?: number | null;
  lineItems?: PurchaseInvoiceLine[];
};

function appendPOVendorInvoiceActivity(
  po: PurchaseOrder,
  vendorInvoiceNo: string,
  purchaseNo: string,
  replaced: boolean,
) {
  const updated: PurchaseOrder = {
    ...po,
    status: po.status === "closed" ? "closed" : "invoice_uploaded",
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedDate: todayStr(),
    activity: [
      ...po.activity,
      {
        date: todayStr(),
        action: replaced ? "Supplier Invoice Replaced" : "Supplier Invoice Uploaded",
        by: ACCOUNTS_CURRENT_USER,
        note: `${vendorInvoiceNo} → ${purchaseNo}`,
      },
    ],
  };
  savePurchaseOrders(loadPurchaseOrders().map((p) => (p.id === po.id ? updated : p)));
}

/** Create Accounts → Purchase record when vendor invoice is uploaded on a PO */
export function createPurchaseFromPOUpload(
  poId: number,
  input: POVendorInvoiceInput,
): PurchaseInvoiceRecord {
  const po = getPOById(poId);
  if (!po) throw new Error("Purchase order not found.");
  const allowed: PurchaseOrder["status"][] = ["approved", "invoice_uploaded"];
  if (!allowed.includes(po.status)) {
    throw new Error("Supplier invoice can be uploaded only after PO is approved.");
  }
  if (listPurchaseInvoicesByPO(poId).length > 0) {
    throw new Error("Invoice already uploaded for this PO. Use replace instead.");
  }
  if (!input.vendorInvoiceNo.trim()) throw new Error("Supplier invoice number is required.");
  if (input.totalAmount <= 0) throw new Error("Total amount must be greater than zero.");

  const all = loadPurchaseInvoices();
  const lines = po.lines.map(lineFromPO);
  const productAmount = lines.reduce((s, l) => s + l.lineAmount, 0);
  const additionalCharges = po.additionalCharges ?? [];
  const additionalTotal = sumAdditionalCharges(additionalCharges);
  const subtotal = Math.round((productAmount + additionalTotal) * 100) / 100;
  const taxAmount = Math.round(input.taxAmount * 100) / 100;
  const grandTotal = Math.round(input.totalAmount * 100) / 100;

  const rec = normalizePI({
    id: all.length ? Math.max(...all.map((r) => r.id)) + 1 : 1,
    invoiceNo: nextPurchaseNo(all),
    invoiceDate: input.vendorInvoiceDate,
    vendorInvoiceNo: input.vendorInvoiceNo.trim(),
    vendorId: toNumericId(po.supplierId) ?? 0,
    vendorName: po.supplierName,
    vendorGst: po.supplierGstin ?? "",
    poId: toNumericId(po.id),
    poNumber: po.poNumber,
    poDate: po.poDate,
    grnId: null,
    grnNo: "",
    source: "po_invoice",
    lineItems: lines,
    additionalCharges: [...additionalCharges],
    productAmount,
    subtotal,
    taxAmount,
    grandTotal,
    amountPaid: 0,
    amountDebited: 0,
    balanceDebitAllowed: grandTotal,
    debitStatus: "no_debit",
    poAdjustmentStatus: "open",
    remarks: input.remarks.trim(),
    attachment: input.attachment,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  savePurchaseInvoices([...all, rec]);
  appendPOVendorInvoiceActivity(po, rec.vendorInvoiceNo, rec.invoiceNo, false);
  maybePostPurchaseInvoice(rec);
  return rec;
}

/** Replace existing vendor invoice on PO — updates linked Accounts → Purchase record */
export function replacePurchaseFromPOUpload(
  poId: number,
  input: POVendorInvoiceInput,
): PurchaseInvoiceRecord {
  const po = getPOById(poId);
  if (!po) throw new Error("Purchase order not found.");
  if (!["approved", "invoice_uploaded"].includes(po.status)) {
    throw new Error("Cannot replace invoice for this PO status.");
  }
  const existing = listPurchaseInvoicesByPO(poId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!existing) throw new Error("No invoice found to replace.");

  if (!input.vendorInvoiceNo.trim()) throw new Error("Supplier invoice number is required.");
  if (input.totalAmount <= 0) throw new Error("Total amount must be greater than zero.");

  const all = loadPurchaseInvoices();
  const idx = all.findIndex((p) => p.id === existing.id);
  if (idx < 0) throw new Error("Purchase record not found.");

  const subtotal = Math.round(input.invoiceAmount * 100) / 100;
  const taxAmount = Math.round(input.taxAmount * 100) / 100;
  const grandTotal = Math.round(input.totalAmount * 100) / 100;

  const updated = normalizePI({
    ...existing,
    invoiceDate: input.vendorInvoiceDate,
    vendorInvoiceNo: input.vendorInvoiceNo.trim(),
    subtotal,
    taxAmount,
    grandTotal,
    balanceDebitAllowed: Math.max(0, grandTotal - existing.amountDebited),
    remarks: input.remarks.trim(),
    attachment: input.attachment ?? existing.attachment,
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });

  all[idx] = updated;
  savePurchaseInvoices(all);
  appendPOVendorInvoiceActivity(po, updated.vendorInvoiceNo, updated.invoiceNo, true);
  return updated;
}

export function createManualPurchaseEntry(input: ManualPurchaseInput): PurchaseInvoiceRecord {
  const vendor = getActiveVendors().find((v) => v.id === input.vendorId);
  if (!vendor) throw new Error("Supplier not found.");
  if (!input.vendorInvoiceNo.trim()) throw new Error("Supplier invoice number is required.");
  if (!input.remarks.trim()) throw new Error("Remarks are required.");
  if (input.totalAmount <= 0) throw new Error("Total amount must be greater than zero.");

  const po = input.poId ? getPOById(input.poId) : undefined;
  const lines =
    input.lineItems?.length
      ? input.lineItems
      : po
        ? po.lines.map(lineFromPO)
        : [];

  const all = loadPurchaseInvoices();
  const productAmount = lines.reduce((s, l) => s + l.lineAmount, 0);
  const additionalCharges = po?.additionalCharges ?? [];
  const rec = normalizePI({
    id: all.length ? Math.max(...all.map((r) => r.id)) + 1 : 1,
    invoiceNo: nextPurchaseNo(all),
    invoiceDate: input.invoiceDate,
    vendorInvoiceNo: input.vendorInvoiceNo.trim(),
    vendorId: vendor.id,
    vendorName: vendor.vendorName,
    vendorGst: vendor.gstNumber ?? "",
    poId: po ? toNumericId(po.id) : null,
    poNumber: po?.poNumber ?? "",
    poDate: po?.poDate ?? "",
    grnId: null,
    grnNo: "",
    source: "manual_entry",
    lineItems: lines,
    additionalCharges: [...additionalCharges],
    productAmount,
    subtotal: Math.round(input.invoiceAmount * 100) / 100,
    taxAmount: Math.round(input.taxAmount * 100) / 100,
    grandTotal: Math.round(input.totalAmount * 100) / 100,
    amountPaid: 0,
    amountDebited: 0,
    balanceDebitAllowed: Math.round(input.totalAmount * 100) / 100,
    debitStatus: "no_debit",
    poAdjustmentStatus: "open",
    remarks: input.remarks.trim(),
    attachment: input.attachment,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  savePurchaseInvoices([...all, rec]);
  maybePostPurchaseInvoice(rec);
  return rec;
}

export function updateManualPurchaseEntry(
  id: number,
  input: ManualPurchaseInput,
): PurchaseInvoiceRecord {
  const all = loadPurchaseInvoices();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) throw new Error("Purchase record not found.");
  const cur = all[idx];
  if (cur.source !== "manual_entry") {
    throw new Error("Only manual purchase entries can be edited.");
  }

  const vendor = getActiveVendors().find((v) => v.id === input.vendorId);
  if (!vendor) throw new Error("Supplier not found.");

  const updated = normalizePI({
    ...cur,
    invoiceDate: input.invoiceDate,
    vendorInvoiceNo: input.vendorInvoiceNo.trim(),
    vendorId: vendor.id,
    vendorName: vendor.vendorName,
    vendorGst: vendor.gstNumber ?? "",
    subtotal: Math.round(input.invoiceAmount * 100) / 100,
    taxAmount: Math.round(input.taxAmount * 100) / 100,
    grandTotal: Math.round(input.totalAmount * 100) / 100,
    balanceDebitAllowed: Math.max(0, Math.round(input.totalAmount * 100) / 100 - cur.amountDebited),
    remarks: input.remarks.trim(),
    attachment: input.attachment,
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  savePurchaseInvoices(all);
  return updated;
}

export function filterPurchaseInvoices(
  records: PurchaseInvoiceRecord[],
  filters: {
    search: string;
    source?: string;
    vendor?: string;
    dateFrom: string;
    dateTo: string;
    status?: string;
  },
): PurchaseInvoiceRecord[] {
  let r = records.filter(isGrnPurchaseInvoice);
  if (filters.source && filters.source !== "all") {
    r = r.filter((x) => x.source === filters.source);
  }
  if (filters.vendor && filters.vendor !== "all") {
    r = r.filter((x) => x.vendorName === filters.vendor);
  }
  if (filters.status && filters.status !== "all") {
    r = r.filter((x) => getPurchaseInvoicePaymentStatus(x) === filters.status);
  }
  if (filters.dateFrom) r = r.filter((x) => x.invoiceDate >= filters.dateFrom);
  if (filters.dateTo) r = r.filter((x) => x.invoiceDate <= filters.dateTo);
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    r = r.filter(
      (x) =>
        x.invoiceNo.toLowerCase().includes(q) ||
        x.vendorInvoiceNo.toLowerCase().includes(q) ||
        x.vendorName.toLowerCase().includes(q) ||
        x.grnNo.toLowerCase().includes(q) ||
        x.poNumber.toLowerCase().includes(q),
    );
  }
  return r;
}

export function getVendorsForPurchaseDropdown() {
  return getActiveVendors();
}

export function reconcilePurchaseInvoiceDebits(
  invoiceId: number,
  lineDebits: { lineId: string; debitedQty: number; debitedAmount: number }[],
): void {
  const all = loadPurchaseInvoices();
  const idx = all.findIndex((p) => p.id === invoiceId);
  if (idx < 0) return;
  const cur = all[idx];
  const lines = cur.lineItems.map((l) => {
    const d = lineDebits.find((x) => x.lineId === l.id);
    if (!d) return l;
    return {
      ...l,
      debitedQty: Math.min(l.invoiceQty, l.debitedQty + d.debitedQty),
      debitedAmount: l.debitedAmount + d.debitedAmount,
    };
  });
  let poAdjustmentStatus = cur.poAdjustmentStatus;
  const updated = normalizePI({
    ...cur,
    lineItems: lines,
    updatedAt: new Date().toISOString(),
  });
  if (updated.debitStatus === "fully_debited") poAdjustmentStatus = "closed";
  else if (updated.amountDebited > 0) poAdjustmentStatus = "partially_returned";
  all[idx] = { ...updated, poAdjustmentStatus };
  savePurchaseInvoices(all);
}

export type PurchaseInvoiceLookup = {
  invoice: PurchaseInvoiceRecord;
  lines: {
    lineId: string;
    productName: string;
    invoiceQty: number;
    alreadyReturnedQty: number;
    balanceQty: number;
    invoiceAmount: number;
    alreadyDebitedAmount: number;
    balanceDebitAllowed: number;
    taxPct: number;
  }[];
};

export function lookupPurchaseInvoiceForDebit(invoiceId: number): PurchaseInvoiceLookup | null {
  const invoice = getPurchaseInvoiceById(invoiceId);
  if (!invoice) return null;
  return {
    invoice,
    lines: invoice.lineItems.map((l) => ({
      lineId: l.id,
      productName: l.productName,
      invoiceQty: l.invoiceQty,
      alreadyReturnedQty: l.debitedQty,
      balanceQty: Math.max(0, l.invoiceQty - l.debitedQty),
      invoiceAmount: l.lineAmount + l.taxAmount,
      alreadyDebitedAmount: l.debitedAmount,
      balanceDebitAllowed: Math.max(0, l.lineAmount + l.taxAmount - l.debitedAmount),
      taxPct: l.taxPct,
    })),
  };
}

// ── GRN-based creation ──────────────────────────────────────────────────────

export type GrnPurchaseInput = {
  grnId: string;
  grnNo: string;
  vendorId: number;
  vendorInvoiceNo: string;
  invoiceDate: string;
  remarks: string;
  /** Override line rates from GRN — if omitted, uses receivedQty as qty with rate=0 */
  lineItems: PurchaseInvoiceLine[];
};

/**
 * Returns GRNs with status qc_completed that do NOT yet have a purchase invoice.
 * Reads from warehouse GRN storage.
 */
export function getGrnsPendingInvoice(): import("@/app/(app)/warehouse/grn/types").GrnRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const { getGrnRecords } = require("@/app/(app)/warehouse/grn/mock-data");
    const all = loadPurchaseInvoices();
    const invoicedGrnIds = new Set(all.map((p) => p.grnId).filter(Boolean));
    return (getGrnRecords() as import("@/app/(app)/warehouse/grn/types").GrnRecord[]).filter(
      (g) => g.status === "qc_completed" && !invoicedGrnIds.has(g.id),
    );
  } catch {
    return [];
  }
}

/** Create a purchase invoice from a received GRN */
export function createPurchaseFromGrn(input: GrnPurchaseInput): PurchaseInvoiceRecord {
  if (!input.vendorId) throw new Error("Supplier is required.");
  if (!input.vendorInvoiceNo.trim()) throw new Error("Supplier invoice number is required.");
  if (!input.lineItems.length) throw new Error("At least one line item is required.");

  const all = loadPurchaseInvoices();
  const existing = all.find((p) => p.grnId === input.grnId);
  if (existing) throw new Error(`Invoice already created for ${input.grnNo} (${existing.invoiceNo}).`);

  const { getActiveVendors } = require("@/app/(app)/masters/vendors/vendor-data");
  const vendor = (getActiveVendors() as import("@/app/(app)/masters/vendors/vendor-data").Vendor[]).find(
    (v) => v.id === input.vendorId,
  );

  const productAmount = input.lineItems.reduce((s, l) => s + l.lineAmount, 0);
  const taxAmount = input.lineItems.reduce((s, l) => s + l.taxAmount, 0);
  const grandTotal = productAmount + taxAmount;

  const rec = normalizePI({
    id: all.length ? Math.max(...all.map((r) => r.id)) + 1 : 1,
    invoiceNo: nextPurchaseNo(all),
    invoiceDate: input.invoiceDate,
    vendorInvoiceNo: input.vendorInvoiceNo.trim(),
    vendorId: input.vendorId,
    vendorName: vendor?.vendorName ?? input.grnNo,
    vendorGst: vendor?.gstNumber ?? "",
    poId: null,
    poNumber: "",
    poDate: "",
    grnId: input.grnId,
    grnNo: input.grnNo,
    source: "po_invoice",
    lineItems: input.lineItems,
    additionalCharges: [],
    productAmount,
    subtotal: productAmount,
    taxAmount,
    grandTotal,
    amountPaid: 0,
    amountDebited: 0,
    balanceDebitAllowed: grandTotal,
    debitStatus: "no_debit",
    poAdjustmentStatus: "open",
    remarks: input.remarks.trim(),
    attachment: null,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activity: [{ date: new Date().toISOString().slice(0, 10), action: "Invoice Created from GRN", by: ACCOUNTS_CURRENT_USER }],
  });

  savePurchaseInvoices([...all, rec]);
  maybePostPurchaseInvoice(rec);
  return rec;
}

export function recordPurchaseInvoicePayment(invoiceId: number, paidDelta: number): void {
  const all = loadPurchaseInvoices();
  const idx = all.findIndex((p) => p.id === invoiceId);
  if (idx < 0) return;
  const cur = all[idx];
  all[idx] = normalizePI({
    ...cur,
    amountPaid: cur.amountPaid + paidDelta,
    updatedAt: new Date().toISOString(),
  });
  savePurchaseInvoices(all);
}

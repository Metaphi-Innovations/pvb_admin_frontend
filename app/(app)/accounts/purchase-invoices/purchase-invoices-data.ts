import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { splitInvoiceGst } from "@/lib/accounts/invoice-gst-breakup";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import { getActiveVendors } from "@/app/(app)/masters/vendors/vendor-data";
import { mergePurchaseInvoiceDemoScenarios } from "./purchase-invoice-seed";
import { mergeDirectPurchaseDemoScenarios } from "./purchase-invoice-direct-seed";
import {
  dedupePurchaseInvoices,
  ensurePurchaseInvoiceStorageMigration,
  PurchaseInvoiceStorageQuotaError,
  PURCHASE_INVOICE_STORAGE_KEY,
  sanitizePurchaseInvoiceForStorage,
  stripDemoRecordsFromStorage,
  writePurchaseInvoicesToStorage,
} from "./purchase-invoice-storage";
import { persistDataUrlAttachment } from "./purchase-invoice-attachment-store";
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
import {
  createInitialWorkflow,
  markWorkflowPosted,
  resolveWorkflowStatus,
  submitForApproval,
  type AccountsVoucherWorkflowStatus,
} from "@/lib/accounts/accounts-maker-checker";
import { loadAccountingSettings } from "@/lib/accounts/accounting-settings-data";
import {
  calcDirectPurchaseTotals,
  computeDirectPurchaseInvoiceTotals,
  recalcDirectLine,
  validateDuplicateSupplierInvoice,
  type DuplicateCheckInput,
} from "./purchase-invoice-direct-utils";

import type {
  DirectPurchaseLineItem,
  ItcClassification,
  PurchaseNature,
  PurchaseSourceType,
} from "./purchase-invoice-types";
import { PURCHASE_SOURCE_TYPE_LABELS } from "./purchase-invoice-types";

export type PurchaseDebitStatus = "no_debit" | "partially_debited" | "fully_debited";
export type POCreditDebitStatus = "open" | "partially_returned" | "closed";
export type PurchaseSource = "po_invoice" | "manual_entry";

export const PURCHASE_SOURCE_LABELS: Record<PurchaseSource, string> = {
  po_invoice: "PO Invoice",
  manual_entry: "Manual Entry",
};

export type { DirectPurchaseLineItem, ItcClassification, PurchaseNature, PurchaseSourceType };
export { PURCHASE_SOURCE_TYPE_LABELS };

export interface PurchaseAttachment {
  id: string;
  documentName: string;
  fileName: string;
  fileType?: string;
  fileSize?: number;
  /** IndexedDB / object-store reference (same as id when stored locally). */
  fileUrl?: string;
  uploadedAt: string;
  /** Session-only preview URL — never persisted to localStorage. */
  dataUrl?: string;
}

/** Per-line quantity comparison (supplier invoice vs GRN vs QC) — display only. */
export interface PurchaseInvoiceLineQtyComparison {
  supplierInvoiceQty: number;
  grnReceivedQty: number;
  qcAcceptedQty: number;
  qcRejectedQty: number;
  shortQty: number;
}

export type PurchaseInvoiceMatchStatus =
  | "matched"
  | "quantity_mismatch"
  | "debit_note_pending"
  | "debit_note_posted";

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
  /** Comparison snapshot — does not alter invoice qty */
  qtyComparison?: PurchaseInvoiceLineQtyComparison;
  /** Direct purchase line snapshot (when sourceType = direct_purchase) */
  directLine?: DirectPurchaseLineItem;
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
  warehouse?: string;
  bankAccountId?: number | null;
  source: PurchaseSource;
  sourceType?: PurchaseSourceType;
  purchaseNature?: PurchaseNature;
  postingDate?: string;
  placeOfSupply?: string;
  branchGstin?: string;
  reverseChargeApplicable?: boolean;
  defaultItcClassification?: ItcClassification;
  paymentTerms?: string;
  creditDays?: number;
  dueDate?: string;
  currency?: string;
  referenceNumber?: string;
  narration?: string;
  tdsApplicable?: boolean;
  gstApplicable?: boolean;
  rcmCgst?: number;
  rcmSgst?: number;
  rcmIgst?: number;
  tdsSectionMasterId?: number | null;
  tdsBaseAmount?: number;
  tdsLedgerId?: number | null;
  tdsLedgerName?: string;
  allowMixedGst?: boolean;
  grossAmount?: number;
  discountTotal?: number;
  taxableAmount?: number;
  cgstTotal?: number;
  sgstTotal?: number;
  igstTotal?: number;
  tdsDeduction?: number;
  roundingAdjustment?: number;
  netPayable?: number;
  directLines?: DirectPurchaseLineItem[];
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
  /** OCR / supplier invoice reference from GRN */
  supplierInvoiceId?: string | null;
  qcId?: string | null;
  qcNo?: string;
  /** Quantity match workflow status */
  invoiceMatchStatus?: PurchaseInvoiceMatchStatus;
  hasQuantityMismatch?: boolean;
  pendingDebitNoteId?: number | null;
  pendingDebitNoteNo?: string;
  matchStatus?: "pending" | "matched" | "partial_match" | "mismatch";
  workflow?: AccountsDocumentWorkflow;
  activity?: Array<{ date: string; time?: string; action: string; by: string; remarks?: string }>;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = PURCHASE_INVOICE_STORAGE_KEY;

export { PurchaseInvoiceStorageQuotaError };
export { hasPurchaseInvoiceAttachment } from "./purchase-invoice-storage";

function lineFromPO(line: POLineItem): PurchaseInvoiceLine {
  const taxPct = line.cgstPct + line.sgstPct + line.igstPct;
  const taxable = Math.max(0, line.netAmount - (line.taxAmount ?? 0));
  return {
    id: line.uid,
    productId: line.productId,
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
  const sourceType = resolvePurchaseSourceType(rec);
  const directLines = rec.directLines ?? [];
  const totalsFromDirect =
    directLines.length > 0
      ? calcDirectPurchaseTotals(directLines, rec.roundingAdjustment ?? 0)
      : null;
  return {
    ...rec,
    grnId: rec.grnId ?? null,
    grnNo: rec.grnNo ?? "",
    sourceType,
    purchaseNature: rec.purchaseNature ?? "expense",
    postingDate: rec.postingDate ?? rec.invoiceDate,
    placeOfSupply: rec.placeOfSupply ?? "",
    branchGstin: rec.branchGstin ?? COMPANY_BILLING.gstNumber,
    reverseChargeApplicable: rec.reverseChargeApplicable ?? false,
    defaultItcClassification: rec.defaultItcClassification ?? "eligible",
    paymentTerms: rec.paymentTerms ?? "",
    creditDays: rec.creditDays ?? 30,
    dueDate: rec.dueDate ?? "",
    currency: rec.currency ?? "INR",
    referenceNumber: rec.referenceNumber ?? "",
    narration: rec.narration ?? rec.remarks ?? "",
    tdsApplicable: rec.tdsApplicable ?? false,
    grossAmount: totalsFromDirect?.grossAmount ?? rec.grossAmount ?? subtotal,
    discountTotal: totalsFromDirect?.discountTotal ?? rec.discountTotal ?? 0,
    taxableAmount: totalsFromDirect?.taxableAmount ?? rec.taxableAmount ?? subtotal,
    cgstTotal: totalsFromDirect?.cgst ?? rec.cgstTotal,
    sgstTotal: totalsFromDirect?.sgst ?? rec.sgstTotal,
    igstTotal: totalsFromDirect?.igst ?? rec.igstTotal,
    tdsDeduction: totalsFromDirect?.tdsDeduction ?? rec.tdsDeduction ?? 0,
    roundingAdjustment: rec.roundingAdjustment ?? 0,
    netPayable: totalsFromDirect?.netPayable ?? rec.netPayable ?? rec.grandTotal,
    directLines,
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
    supplierInvoiceId: rec.supplierInvoiceId ?? null,
    qcId: rec.qcId ?? null,
    qcNo: rec.qcNo ?? "",
    invoiceMatchStatus: rec.invoiceMatchStatus ?? "matched",
    hasQuantityMismatch: rec.hasQuantityMismatch ?? false,
    pendingDebitNoteId: rec.pendingDebitNoteId ?? null,
    pendingDebitNoteNo: rec.pendingDebitNoteNo ?? "",
    activity: rec.activity ?? [],
    workflow:
      rec.workflow ??
      (sourceType === "direct_purchase" ? createInitialWorkflow() : undefined),
  };
}

export function resolvePurchaseSourceType(rec: PurchaseInvoiceRecord): PurchaseSourceType {
  if (rec.sourceType) return rec.sourceType;
  if (rec.grnId?.trim() && rec.grnNo?.trim()) return "from_grn";
  if (rec.source === "manual_entry" || rec.directLines?.length) return "direct_purchase";
  return "from_grn";
}

export function isDirectPurchaseInvoice(rec: PurchaseInvoiceRecord): boolean {
  return resolvePurchaseSourceType(rec) === "direct_purchase";
}

export function isGrnPurchaseInvoice(rec: PurchaseInvoiceRecord): boolean {
  return resolvePurchaseSourceType(rec) === "from_grn";
}

export function getPurchaseInvoiceApprovalStatus(
  rec: Pick<PurchaseInvoiceRecord, "workflow">,
): AccountsVoucherWorkflowStatus {
  return resolveWorkflowStatus(rec.workflow, "draft");
}

export function getPurchaseInvoicePostingStatus(
  rec: Pick<PurchaseInvoiceRecord, "workflow">,
): "draft" | "submitted" | "approved" | "posted" | "rejected" {
  const s = getPurchaseInvoiceApprovalStatus(rec);
  if (s === "posted") return "posted";
  if (s === "rejected" || s === "cancelled") return "rejected";
  if (s === "pending_approval") return "submitted";
  if (s === "sent_back") return "draft";
  const steps = rec.workflow?.steps ?? [];
  const allApproved = steps.length > 1 && steps.slice(1).every((st) => st.state === "approved");
  if (allApproved) return "approved";
  return "draft";
}

function gstinStateCode(gstin?: string): string | null {
  const normalized = gstin?.trim().toUpperCase();
  if (!normalized || normalized.length < 2) return null;
  return normalized.slice(0, 2);
}

export function isPurchaseInvoiceInterstate(
  rec: Pick<PurchaseInvoiceRecord, "vendorGst">,
): boolean {
  const vendorState = gstinStateCode(rec.vendorGst);
  const companyState = gstinStateCode(COMPANY_BILLING.gstNumber);
  if (!vendorState || !companyState) return false;
  return vendorState !== companyState;
}

export function calcPurchaseLineGstSplit(
  line: Pick<PurchaseInvoiceLine, "lineAmount" | "taxAmount">,
  interstate: boolean,
) {
  const { cgst, sgst, igst } = splitInvoiceGst(line.taxAmount, interstate);
  return {
    taxable: line.lineAmount,
    cgst,
    sgst,
    igst,
    lineTotal: Math.round((line.lineAmount + line.taxAmount) * 100) / 100,
  };
}

export function getPurchaseInvoiceGstBreakup(rec: PurchaseInvoiceRecord) {
  const taxableValue = rec.taxableAmount ?? rec.subtotal ?? rec.productAmount ?? 0;
  if (isDirectPurchaseInvoice(rec) && (rec.cgstTotal != null || rec.igstTotal != null)) {
    const cgst = rec.cgstTotal ?? 0;
    const sgst = rec.sgstTotal ?? 0;
    const igst = rec.igstTotal ?? 0;
    const interstate = igst > 0 && cgst === 0 && sgst === 0;
    return {
      taxableValue,
      cgst,
      sgst,
      igst,
      interstate,
      invoiceTotal: rec.grandTotal,
    };
  }
  const interstate = isPurchaseInvoiceInterstate(rec);
  const { cgst, sgst, igst } = splitInvoiceGst(rec.taxAmount ?? 0, interstate);
  return { taxableValue, cgst, sgst, igst, interstate, invoiceTotal: rec.grandTotal };
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
    ensurePurchaseInvoiceStorageMigration();

    const legacy = localStorage.getItem("ds_accounts_purchase_invoices_v1");
    if (legacy && !localStorage.getItem(STORAGE_KEY)) {
      const migrated = dedupeAndSanitizeStoredRecords(
        JSON.parse(legacy) as PurchaseInvoiceRecord[],
      );
      writePurchaseInvoicesToStorage(migrated);
      localStorage.removeItem("ds_accounts_purchase_invoices_v1");
    }

    const list = readPurchaseInvoicesRaw();
    return mergeDirectPurchaseDemoScenarios(
      mergePurchaseInvoiceDemoScenarios(list.map(normalizePI)),
    );
  } catch {
    // Seed/merge must not block Accounts pages or reports.
    try {
      return readPurchaseInvoicesRaw();
    } catch {
      return [];
    }
  }
}

/** Listing scope — all purchase invoices (GRN + direct). */
export function loadAllPurchaseInvoices(): PurchaseInvoiceRecord[] {
  return loadPurchaseInvoices();
}

/** @deprecated Use loadAllPurchaseInvoices — kept for GRN-pending tab compatibility */
export function loadGrnPurchaseInvoices(): PurchaseInvoiceRecord[] {
  return loadPurchaseInvoices().filter(isGrnPurchaseInvoice);
}

function dedupeAndSanitizeStoredRecords(records: PurchaseInvoiceRecord[]): PurchaseInvoiceRecord[] {
  return stripDemoRecordsFromStorage(
    dedupePurchaseInvoices(records.map((r) => sanitizePurchaseInvoiceForStorage(normalizePI(r)))),
  );
}

export function savePurchaseInvoices(records: PurchaseInvoiceRecord[]): void {
  writePurchaseInvoicesToStorage(records.map((r) => normalizePI(r)));
}

/** Read purchase invoices from storage without demo merge (direct purchase writes). */
function readPurchaseInvoicesRaw(): PurchaseInvoiceRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PurchaseInvoiceRecord[]).map(normalizePI) : [];
  } catch {
    return [];
  }
}

function upsertDirectPurchaseInStorage(rec: PurchaseInvoiceRecord): PurchaseInvoiceRecord {
  if (rec.attachment?.dataUrl?.startsWith("data:")) {
    void persistDataUrlAttachment({
      id: rec.attachment.id,
      documentName: rec.attachment.documentName,
      fileName: rec.attachment.fileName,
      dataUrl: rec.attachment.dataUrl,
      uploadedAt: rec.attachment.uploadedAt,
      fileType: rec.attachment.fileType,
      fileSize: rec.attachment.fileSize,
    }).catch(() => {});
  }

  const all = readPurchaseInvoicesRaw();
  const idx = all.findIndex((p) => p.id === rec.id);
  const normalized = normalizePI(rec);
  if (idx >= 0) all[idx] = normalized;
  else all.push(normalized);
  savePurchaseInvoices(all);
  return normalized;
}

function directPurchaseRequiresApproval(workflow: AccountsDocumentWorkflow): boolean {
  const settings = loadAccountingSettings();
  if (!settings.requireVoucherApproval) return false;
  return workflow.steps.some((s) => s.level > 0);
}

function directPurchaseIdPool(): PurchaseInvoiceRecord[] {
  const raw = readPurchaseInvoicesRaw();
  const merged = loadPurchaseInvoices();
  const byId = new Map<number, PurchaseInvoiceRecord>();
  for (const rec of [...merged, ...raw]) byId.set(rec.id, rec);
  return [...byId.values()];
}

export function getPurchaseInvoiceById(id: number): PurchaseInvoiceRecord | undefined {
  const fromMerged = loadPurchaseInvoices().find((p) => p.id === id);
  if (fromMerged) return fromMerged;
  return readPurchaseInvoicesRaw().find((p) => p.id === id);
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
    vendorId: po.supplierId,
    vendorName: po.supplierName,
    vendorGst: po.supplierGstin ?? "",
    poId: po.id,
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
    poId: po?.id ?? null,
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
  if (isDirectPurchaseInvoice(cur)) {
    throw new Error("Direct purchase invoices must be edited from the Direct Purchase form.");
  }
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
    sourceType?: string;
    source?: string;
    purchaseNature?: string;
    vendor?: string;
    dateFrom: string;
    dateTo: string;
    status?: string;
    approvalStatus?: string;
    postingStatus?: string;
    branchGstin?: string;
  },
): PurchaseInvoiceRecord[] {
  let r = [...records];
  if (filters.sourceType && filters.sourceType !== "all") {
    r = r.filter((x) => resolvePurchaseSourceType(x) === filters.sourceType);
  }
  if (filters.source && filters.source !== "all") {
    r = r.filter((x) => x.source === filters.source);
  }
  if (filters.purchaseNature && filters.purchaseNature !== "all") {
    r = r.filter((x) => (x.purchaseNature ?? "expense") === filters.purchaseNature);
  }
  if (filters.vendor && filters.vendor !== "all") {
    r = r.filter((x) => x.vendorName === filters.vendor);
  }
  if (filters.status && filters.status !== "all") {
    r = r.filter((x) => getPurchaseInvoicePaymentStatus(x) === filters.status);
  }
  if (filters.approvalStatus && filters.approvalStatus !== "all") {
    r = r.filter((x) => getPurchaseInvoiceApprovalStatus(x) === filters.approvalStatus);
  }
  if (filters.postingStatus && filters.postingStatus !== "all") {
    r = r.filter((x) => getPurchaseInvoicePostingStatus(x) === filters.postingStatus);
  }
  if (filters.branchGstin && filters.branchGstin !== "all") {
    r = r.filter((x) => (x.branchGstin ?? COMPANY_BILLING.gstNumber) === filters.branchGstin);
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
        x.poNumber.toLowerCase().includes(q) ||
        (x.referenceNumber ?? "").toLowerCase().includes(q),
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

// ── Direct Purchase ───────────────────────────────────────────────────────────

export type DirectPurchaseInput = {
  vendorId: number;
  vendorInvoiceNo: string;
  invoiceDate: string;
  postingDate: string;
  purchaseNature: PurchaseNature;
  placeOfSupply: string;
  branchGstin: string;
  reverseChargeApplicable: boolean;
  defaultItcClassification: ItcClassification;
  paymentTerms: string;
  creditDays: number;
  dueDate: string;
  currency: string;
  referenceNumber: string;
  narration: string;
  gstApplicable: boolean;
  rcmCgst: number;
  rcmSgst: number;
  rcmIgst: number;
  tdsApplicable: boolean;
  tdsSectionMasterId: number | null;
  tdsBaseAmount: number;
  tdsAmount: number;
  tdsLedgerId: number | null;
  tdsLedgerName: string;
  allowMixedGst: boolean;
  roundingAdjustment: number;
  directLines: DirectPurchaseLineItem[];
  attachment: PurchaseAttachment | null;
  workflow?: AccountsDocumentWorkflow;
};

function directLinesToPurchaseLines(lines: DirectPurchaseLineItem[]): PurchaseInvoiceLine[] {
  return lines.map((dl) => ({
    id: dl.id,
    productId: null,
    productName: dl.description,
    description: dl.hsnSac ? `HSN/SAC: ${dl.hsnSac}` : dl.description,
    invoiceQty: dl.quantity,
    unit: dl.uqc,
    unitPrice: dl.rate,
    taxPct: dl.gstRate,
    lineAmount: dl.taxableAmount,
    taxAmount: dl.cgst + dl.sgst + dl.igst,
    debitedQty: 0,
    debitedAmount: 0,
    directLine: dl,
  }));
}

function buildDirectPurchaseRecord(
  all: PurchaseInvoiceRecord[],
  input: DirectPurchaseInput,
  existing?: PurchaseInvoiceRecord,
): PurchaseInvoiceRecord {
  const vendor = getActiveVendors().find((v) => v.id === input.vendorId);
  if (!vendor) throw new Error("Supplier not found.");

  const dupErr = validateDuplicateSupplierInvoice(
    all.map((r) => ({
      id: r.id,
      invoiceNo: r.invoiceNo,
      vendorId: r.vendorId,
      vendorGst: r.vendorGst,
      vendorInvoiceNo: r.vendorInvoiceNo,
      invoiceDate: r.invoiceDate,
      workflow: r.workflow,
    })),
    {
    vendorId: input.vendorId,
    vendorGst: vendor.gstNumber ?? "",
    vendorInvoiceNo: input.vendorInvoiceNo,
    excludeId: existing?.id,
  });
  if (dupErr) throw new Error(dupErr);

  const totals = computeDirectPurchaseInvoiceTotals(input.directLines, {
    roundingAdjustment: input.roundingAdjustment,
    invoiceTdsApplicable: input.tdsApplicable,
    invoiceTdsAmount: input.tdsApplicable ? input.tdsAmount : 0,
  });
  const lineItems = directLinesToPurchaseLines(input.directLines);

  const base: PurchaseInvoiceRecord = {
    id: existing?.id ?? (all.length ? Math.max(...all.map((r) => r.id)) + 1 : 1),
    invoiceNo: existing?.invoiceNo ?? nextPurchaseNo(all),
    invoiceDate: input.invoiceDate,
    vendorInvoiceNo: input.vendorInvoiceNo.trim(),
    vendorId: vendor.id,
    vendorName: vendor.vendorName,
    vendorGst: vendor.gstNumber ?? "",
    poId: null,
    poNumber: "",
    poDate: "",
    grnId: null,
    grnNo: "",
    source: "manual_entry",
    sourceType: "direct_purchase",
    purchaseNature: input.purchaseNature,
    postingDate: input.postingDate,
    placeOfSupply: input.placeOfSupply,
    branchGstin: input.branchGstin,
    reverseChargeApplicable: input.reverseChargeApplicable,
    defaultItcClassification: input.defaultItcClassification,
    paymentTerms: input.paymentTerms,
    creditDays: input.creditDays,
    dueDate: input.dueDate,
    currency: input.currency,
    referenceNumber: input.referenceNumber.trim(),
    narration: input.narration.trim(),
    tdsApplicable: input.tdsApplicable,
    gstApplicable: input.gstApplicable,
    rcmCgst: input.reverseChargeApplicable ? input.rcmCgst : 0,
    rcmSgst: input.reverseChargeApplicable ? input.rcmSgst : 0,
    rcmIgst: input.reverseChargeApplicable ? input.rcmIgst : 0,
    tdsSectionMasterId: input.tdsApplicable ? input.tdsSectionMasterId : null,
    tdsBaseAmount: input.tdsApplicable ? input.tdsBaseAmount : 0,
    tdsLedgerId: input.tdsApplicable ? input.tdsLedgerId : null,
    tdsLedgerName: input.tdsApplicable ? input.tdsLedgerName : "",
    allowMixedGst: input.allowMixedGst,
    directLines: input.directLines,
    lineItems,
    additionalCharges: [],
    productAmount: totals.taxableAmount,
    subtotal: totals.taxableAmount,
    grossAmount: totals.grossAmount,
    discountTotal: totals.discountTotal,
    taxableAmount: totals.taxableAmount,
    taxAmount: totals.totalGst,
    cgstTotal: totals.cgst,
    sgstTotal: totals.sgst,
    igstTotal: totals.igst,
    tdsDeduction: totals.tdsDeduction,
    roundingAdjustment: input.roundingAdjustment,
    grandTotal: totals.invoiceTotal,
    netPayable: totals.netPayable,
    amountPaid: existing?.amountPaid ?? 0,
    amountDebited: existing?.amountDebited ?? 0,
    balanceDebitAllowed: totals.netPayable,
    debitStatus: "no_debit",
    poAdjustmentStatus: "open",
    remarks: input.narration.trim(),
    attachment: input.attachment,
    workflow: input.workflow ?? existing?.workflow ?? createInitialWorkflow(),
    activity: existing?.activity ?? [
      {
        date: input.invoiceDate,
        action: "Direct Purchase Draft Created",
        by: ACCOUNTS_CURRENT_USER,
      },
    ],
    createdBy: existing?.createdBy ?? ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return normalizePI(base);
}

export function createDirectPurchaseInvoice(input: DirectPurchaseInput): PurchaseInvoiceRecord {
  if (!input.vendorInvoiceNo.trim()) throw new Error("Supplier invoice number is required.");
  if (!input.directLines.length) throw new Error("At least one line item is required.");
  if (!input.attachment) throw new Error("Supplier invoice attachment is mandatory for direct purchase.");
  if (input.directLines.some((l) => !l.description.trim())) {
    throw new Error("All line items require a description.");
  }
  if (input.directLines.some((l) => !l.expenseLedgerId)) {
    throw new Error("Select an expense / asset ledger for each line.");
  }

  const idPool = directPurchaseIdPool();
  const rec = buildDirectPurchaseRecord(idPool, input);
  return upsertDirectPurchaseInStorage(rec);
}

export function updateDirectPurchaseInvoice(
  id: number,
  input: DirectPurchaseInput,
): PurchaseInvoiceRecord {
  const idPool = directPurchaseIdPool();
  const raw = readPurchaseInvoicesRaw();
  const cur = raw.find((p) => p.id === id);
  if (cur && !isDirectPurchaseInvoice(cur)) {
    throw new Error("Only direct purchase invoices can be edited.");
  }
  if (cur && getPurchaseInvoicePostingStatus(cur) === "posted") {
    throw new Error("Posted invoices cannot be edited.");
  }

  if (!input.attachment) throw new Error("Supplier invoice attachment is mandatory.");

  const existingStub: PurchaseInvoiceRecord =
    cur ??
    ({
      id,
      invoiceNo: nextPurchaseNo(idPool),
      createdAt: new Date().toISOString(),
      createdBy: ACCOUNTS_CURRENT_USER,
    } as PurchaseInvoiceRecord);

  const updated = buildDirectPurchaseRecord(idPool, input, existingStub);
  return upsertDirectPurchaseInStorage(updated);
}

export function saveDirectPurchaseDraft(
  id: number | null,
  input: DirectPurchaseInput,
): PurchaseInvoiceRecord {
  if (id == null) return createDirectPurchaseInvoice(input);
  return updateDirectPurchaseInvoice(id, input);
}

export function postDirectPurchaseInvoice(
  id: number | null,
  input: DirectPurchaseInput,
): PurchaseInvoiceRecord {
  const saved = saveDirectPurchaseDraft(id, input);
  const workflow = ensureDocumentWorkflow(saved.workflow);
  const needsApproval = directPurchaseRequiresApproval(workflow);

  const nextWorkflow = needsApproval
    ? submitForApproval(workflow, "Submitted for approval")
    : markWorkflowPosted(workflow, "Posted");

  const action = needsApproval ? "Submitted for Approval" : "Posted";

  const rec = upsertDirectPurchaseInStorage(
    normalizePI({
      ...saved,
      workflow: nextWorkflow,
      activity: [
        ...(saved.activity ?? []),
        { date: todayStr(), action, by: ACCOUNTS_CURRENT_USER },
      ],
      updatedAt: new Date().toISOString(),
    }),
  );

  if (!needsApproval) {
    const result = maybePostPurchaseInvoice(rec);
    if (result && !result.success && result.error !== "Already posted.") {
      throw new Error(result.error ?? "Accounting posting failed.");
    }
  }

  return rec;
}

/** @deprecated Use postDirectPurchaseInvoice */
export function submitDirectPurchaseInvoice(
  id: number,
  input: DirectPurchaseInput,
): PurchaseInvoiceRecord {
  return postDirectPurchaseInvoice(id, input);
}

function ensureDocumentWorkflow(wf?: AccountsDocumentWorkflow): AccountsDocumentWorkflow {
  return wf ?? createInitialWorkflow();
}

export function syncPurchaseInvoicePosting(invoiceId: number): void {
  const inv = getPurchaseInvoiceById(invoiceId);
  if (!inv) return;
  if (getPurchaseInvoiceApprovalStatus(inv) === "posted") {
    maybePostPurchaseInvoice(inv);
  }
}

export function canEditPurchaseInvoice(rec: PurchaseInvoiceRecord): boolean {
  if (isGrnPurchaseInvoice(rec)) return false;
  return getPurchaseInvoicePostingStatus(rec) !== "posted";
}

export function checkDuplicateSupplierInvoice(input: DuplicateCheckInput): string | null {
  return validateDuplicateSupplierInvoice(
    loadPurchaseInvoices().map((r) => ({
      id: r.id,
      invoiceNo: r.invoiceNo,
      vendorId: r.vendorId,
      vendorGst: r.vendorGst,
      vendorInvoiceNo: r.vendorInvoiceNo,
      invoiceDate: r.invoiceDate,
      workflow: r.workflow,
    })),
    input,
  );
}

// ── GRN-based creation ──────────────────────────────────────────────────────

export type GrnPurchaseInput = {
  grnId: string;
  grnNo: string;
  warehouse?: string;
  bankAccountId?: number | null;
  vendorId: number;
  vendorInvoiceNo: string;
  invoiceDate: string;
  remarks: string;
  lineItems: PurchaseInvoiceLine[];
  poId?: number | null;
  poNumber?: string;
  poDate?: string;
  qcId?: string | null;
  qcNo?: string;
  supplierInvoiceId?: string | null;
  ocrPayload?: PurchaseInvoiceOcrPayload | null;
  hasQuantityMismatch?: boolean;
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
  const hasMismatch = input.hasQuantityMismatch ?? false;
  const initialMatchStatus = hasMismatch ? "quantity_mismatch" : "matched";

  const rec = normalizePI({
    id: all.length ? Math.max(...all.map((r) => r.id)) + 1 : 1,
    invoiceNo: nextPurchaseNo(all),
    invoiceDate: input.invoiceDate,
    vendorInvoiceNo: input.vendorInvoiceNo.trim(),
    vendorId: input.vendorId,
    vendorName: vendor?.vendorName ?? input.grnNo,
    vendorGst: vendor?.gstNumber ?? "",
    poId: input.poId ?? null,
    poNumber: input.poNumber ?? "",
    poDate: input.poDate ?? "",
    grnId: input.grnId,
    grnNo: input.grnNo,
    qcId: input.qcId ?? null,
    qcNo: input.qcNo ?? "",
    supplierInvoiceId: input.supplierInvoiceId ?? null,
    ocrPayload: input.ocrPayload ?? null,
    warehouse: input.warehouse,
    bankAccountId: input.bankAccountId ?? null,
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
    invoiceMatchStatus: initialMatchStatus,
    hasQuantityMismatch: hasMismatch,
    remarks: input.remarks.trim(),
    attachment: null,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    activity: [
      {
        date: new Date().toISOString().slice(0, 10),
        action: "Invoice Created from GRN",
        by: ACCOUNTS_CURRENT_USER,
        remarks: hasMismatch ? "Supplier invoice retained — quantity mismatch detected" : undefined,
      },
    ],
  });

  savePurchaseInvoices([...all, rec]);
  maybePostPurchaseInvoice(rec);

  if (hasMismatch) {
    const {
      createPendingDebitNoteForMismatch,
    } = require("./purchase-invoice-quantity-match");
    const pending = createPendingDebitNoteForMismatch(rec);
    if (pending) {
      const updatedAll = loadPurchaseInvoices();
      const idx = updatedAll.findIndex((p) => p.id === rec.id);
      if (idx >= 0) {
        updatedAll[idx] = normalizePI({
          ...updatedAll[idx],
          pendingDebitNoteId: pending.id,
          pendingDebitNoteNo: pending.debitNoteNo,
          invoiceMatchStatus: "debit_note_pending",
          activity: [
            ...(updatedAll[idx].activity ?? []),
            {
              date: new Date().toISOString().slice(0, 10),
              action: "Pending Debit Note Created",
              by: ACCOUNTS_CURRENT_USER,
              remarks: `${pending.debitNoteNo} — Pending Confirmation`,
            },
          ],
        });
        savePurchaseInvoices(updatedAll);
        return updatedAll[idx];
      }
    }
  }

  return getPurchaseInvoiceById(rec.id) ?? rec;
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

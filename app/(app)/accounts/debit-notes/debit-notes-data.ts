import {
  ACCOUNTS_CURRENT_USER,
  ACCOUNTS_INVOICE_ADMIN,
  ACCOUNTS_STANDALONE_ADJUSTMENT_ALLOWED,
} from "@/lib/accounts/config";
import type { AccountsDocumentWorkflow } from "@/lib/accounts/accounts-maker-checker";
import { getActiveVendors, type Vendor } from "@/app/(app)/masters/vendors/vendor-data";
import { loadPurchaseOrders } from "@/app/(app)/procurement/purchase-orders/po-data";
import { maybePostDebitNote } from "@/lib/accounts/document-posting-bridge";
import {
  getPurchaseInvoiceById,
  listCreditablePurchaseInvoices,
  loadPurchaseInvoices,
  lookupPurchaseInvoiceForDebit,
  reconcilePurchaseInvoiceDebits,
  type PurchaseInvoiceLine,
  type PurchaseInvoiceRecord,
} from "../purchase-invoices/purchase-invoices-data";
import { getGrnRecords } from "@/app/(app)/warehouse/grn/mock-data";
import { getQcRecords } from "@/app/(app)/warehouse/qc/mock-data";

export type DebitNoteAgainst = "purchase_invoice" | "purchase_order" | "standalone_adjustment";
export type DebitReferenceType = DebitNoteAgainst;
export type NoteWorkflowStatus =
  | "draft"
  | "pending_approval"
  | "sent_back"
  | "approved"
  | "processed"
  | "rejected"
  | "cancelled";

export interface DebitNoteAttachment {
  id: string;
  documentName: string;
  fileName: string;
  dataUrl?: string;
  uploadedAt: string;
}

export interface DebitNoteLine {
  id: string;
  sourceLineId: string;
  productName: string;
  invoiceQty: number;
  uom: string;
  unitPrice: number;
  discountPct: number;
  taxPct: number;
  gstAmount: number;
  lineAmount: number;
  returnQty: number;
  debitAmount: number;
  lineRemarks: string;
}

export interface DebitReferencePreview {
  referenceType: DebitReferenceType;
  documentDate: string;
  sourceInvoiceId: number | null;
  sourceInvoiceNo: string;
  sourcePoId: number | null;
  sourcePoNo: string;
  sourceGrnNo: string;
  sourceQcNo: string;
  vendorId: number | null;
  vendorName: string;
  vendorPhone: string;
  vendorEmail: string;
  vendorGstin: string;
  originalAmount: number;
  taxAmount: number;
  alreadyAdjustedAmount: number;
  lineItems: DebitNoteLine[];
}

export interface NoteActivityEntry {
  at: string;
  action: string;
  by: string;
  detail: string;
}

export interface DebitNoteRecord {
  id: number;
  debitNoteNo: string;
  debitNoteDate: string;
  againstType: DebitNoteAgainst;
  sourceInvoiceId: number | null;
  sourceInvoiceNo: string;
  sourcePoId: number | null;
  sourcePoNo: string;
  sourceGrnNo: string;
  sourceQcNo: string;
  vendorId: number | null;
  vendorName: string;
  originalAmount: number;
  alreadyAdjustedAmount: number;
  taxableAmount: number;
  gstAmount: number;
  currentDebitAmount: number;
  balanceAfterAdjustment: number;
  standaloneDebitAmount: number;
  lineItems: DebitNoteLine[];
  reason: string;
  remarks: string;
  attachments: DebitNoteAttachment[];
  status: NoteWorkflowStatus;
  workflow?: AccountsDocumentWorkflow;
  activity: NoteActivityEntry[];
  createdBy: string;
  updatedBy: string;
  approvedBy?: string;
  approvedAt?: string;
  processedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "ds_accounts_debit_notes_v2";

function warehouseRefsForPo(poNumber: string): { sourceGrnNo: string; sourceQcNo: string } {
  if (!poNumber) return { sourceGrnNo: "", sourceQcNo: "" };
  const grns = getGrnRecords().filter((g) => g.poNumber === poNumber);
  const grnNo = grns[0]?.grnNo ?? "";
  const qc = getQcRecords().find((q) => q.grnNo === grnNo || q.poNumber === poNumber);
  return { sourceGrnNo: grnNo, sourceQcNo: qc?.qcNo ?? "" };
}

export const DEBIT_REASONS = [
  "Purchase Return",
  "Damaged Goods",
  "Short Supply",
  "Rate Difference",
  "Excess Billing",
  "Tax Correction",
  "Other",
];

export const REFERENCE_TYPE_LABELS: Record<DebitNoteAgainst, string> = {
  purchase_invoice: "Purchase Invoice",
  purchase_order: "Purchase Order",
  standalone_adjustment: "Standalone Adjustment",
};

export function canUseStandaloneDebit(): boolean {
  return ACCOUNTS_STANDALONE_ADJUSTMENT_ALLOWED || ACCOUNTS_INVOICE_ADMIN;
}

function nextDebitNoteNo(records: DebitNoteRecord[]): string {
  const max = records.reduce((m, r) => {
    const n = parseInt(r.debitNoteNo.replace(/\D/g, ""), 10);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `DN-${String(max + 1).padStart(4, "0")}`;
}

function appendActivity(
  existing: NoteActivityEntry[],
  action: string,
  detail: string,
  by = ACCOUNTS_CURRENT_USER,
): NoteActivityEntry[] {
  return [...existing, { at: new Date().toISOString(), action, by, detail }];
}

export function createEmptyDebitLine(): DebitNoteLine {
  return {
    id: `dnl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sourceLineId: "",
    productName: "",
    invoiceQty: 0,
    uom: "",
    unitPrice: 0,
    discountPct: 0,
    taxPct: 0,
    gstAmount: 0,
    lineAmount: 0,
    returnQty: 0,
    debitAmount: 0,
    lineRemarks: "",
  };
}

function piLineToDebitLine(l: PurchaseInvoiceLine): DebitNoteLine {
  const lineTotal = Math.round((l.lineAmount + l.taxAmount) * 100) / 100;
  return {
    id: `dnl-${l.id}`,
    sourceLineId: l.id,
    productName: l.productName,
    invoiceQty: l.invoiceQty,
    uom: l.unit,
    unitPrice: l.unitPrice,
    discountPct: 0,
    taxPct: l.taxPct,
    gstAmount: l.taxAmount,
    lineAmount: lineTotal,
    returnQty: 0,
    debitAmount: 0,
    lineRemarks: "",
  };
}

function calcDebitFromQty(line: Pick<DebitNoteLine, "returnQty" | "invoiceQty" | "unitPrice" | "discountPct" | "taxPct" | "lineAmount">): number {
  const returnQty = Math.max(0, line.returnQty);
  if (returnQty <= 0) return 0;
  const invoiceQty = line.invoiceQty;
  const effectiveQty = invoiceQty > 0 ? Math.min(returnQty, invoiceQty) : returnQty;
  if (line.unitPrice > 0) {
    const base = effectiveQty * line.unitPrice;
    const disc = base * ((line.discountPct ?? 0) / 100);
    const taxable = Math.max(0, base - disc);
    const tax = Math.round(taxable * ((line.taxPct ?? 0) / 100) * 100) / 100;
    return Math.round((taxable + tax) * 100) / 100;
  }
  if (invoiceQty > 0 && line.lineAmount > 0) {
    return Math.round((effectiveQty / invoiceQty) * line.lineAmount * 100) / 100;
  }
  return 0;
}

export function computeLineDebitAmount(
  line: DebitNoteLine,
  allLines: DebitNoteLine[],
  alreadyAdjustedAmount: number,
): number {
  const gross = calcDebitFromQty(line);
  if (gross <= 0) return 0;
  const totalLineAmount = allLines.reduce((s, l) => s + Math.max(0, l.lineAmount), 0);
  const lineBase = line.lineAmount > 0 ? line.lineAmount : gross;
  const lineAlreadyAllocated =
    totalLineAmount > 0 && alreadyAdjustedAmount > 0
      ? Math.round((lineBase / totalLineAmount) * alreadyAdjustedAmount * 100) / 100
      : 0;
  const lineRemaining = Math.max(0, Math.round((lineBase - lineAlreadyAllocated) * 100) / 100);
  return Math.round(Math.min(gross, lineRemaining) * 100) / 100;
}

export function applyReturnQtyToDebitLines(
  lines: DebitNoteLine[],
  lineId: string,
  returnQty: number,
  alreadyAdjustedAmount: number,
): DebitNoteLine[] {
  const merged = lines.map((l) => (l.id === lineId ? { ...l, returnQty } : l));
  return merged.map((l) =>
    l.id === lineId
      ? { ...l, debitAmount: computeLineDebitAmount(l, merged, alreadyAdjustedAmount) }
      : l,
  );
}

export function computeDebitTotals(lines: DebitNoteLine[]): { taxableAmount: number; gstAmount: number; total: number } {
  let taxable = 0;
  let gst = 0;
  for (const l of lines) {
    if (l.debitAmount <= 0) continue;
    const ratio = l.lineAmount > 0 ? l.debitAmount / l.lineAmount : 1;
    const lineTaxable = Math.max(0, (l.lineAmount - l.gstAmount) * ratio);
    const lineGst = l.gstAmount * ratio;
    taxable += lineTaxable;
    gst += lineGst;
  }
  const total = lines.reduce((s, l) => s + l.debitAmount, 0);
  return {
    taxableAmount: Math.round(taxable * 100) / 100,
    gstAmount: Math.round(gst * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function normalizeDebitLine(line: Partial<DebitNoteLine> & Pick<DebitNoteLine, "id">): DebitNoteLine {
  const base = createEmptyDebitLine();
  return {
    ...base,
    ...line,
    uom: line.uom ?? base.uom,
    unitPrice: line.unitPrice ?? base.unitPrice,
    discountPct: line.discountPct ?? base.discountPct,
    taxPct: line.taxPct ?? base.taxPct,
    gstAmount: line.gstAmount ?? base.gstAmount,
    lineAmount: line.lineAmount ?? base.lineAmount,
    lineRemarks: line.lineRemarks ?? (line as { reason?: string }).reason ?? base.lineRemarks,
  };
}

export function totalRejectedQtyFromLines(lines: DebitNoteLine[]): number {
  return lines.reduce((s, l) => s + (l.returnQty ?? 0), 0);
}

export function normalizeDebitNote(rec: DebitNoteRecord): DebitNoteRecord {
  const lineItems = rec.lineItems.map((l) => normalizeDebitLine(l));
  const totals =
    rec.againstType === "standalone_adjustment"
      ? {
          taxableAmount: rec.standaloneDebitAmount,
          gstAmount: 0,
          total: rec.standaloneDebitAmount,
        }
      : computeDebitTotals(lineItems);
  const currentDebitAmount =
    rec.againstType === "standalone_adjustment" ? rec.standaloneDebitAmount : totals.total;
  const balanceAfterAdjustment = Math.max(
    0,
    rec.originalAmount - rec.alreadyAdjustedAmount - currentDebitAmount,
  );
  return {
    ...rec,
    sourceGrnNo: rec.sourceGrnNo ?? "",
    sourceQcNo: rec.sourceQcNo ?? "",
    lineItems,
    attachments: rec.attachments ?? [],
    taxableAmount: totals.taxableAmount,
    gstAmount: totals.gstAmount,
    currentDebitAmount: Math.round(currentDebitAmount * 100) / 100,
    balanceAfterAdjustment: Math.round(balanceAfterAdjustment * 100) / 100,
  };
}

const SEED: DebitNoteRecord[] = [
  {
    id: 1,
    debitNoteNo: "DN-0001",
    debitNoteDate: "2026-06-02",
    againstType: "purchase_invoice",
    sourceInvoiceId: 1,
    sourceInvoiceNo: "PI-0001",
    sourcePoId: null,
    sourcePoNo: "",
    sourceGrnNo: "",
    sourceQcNo: "",
    vendorId: null,
    vendorName: "",
    originalAmount: 0,
    alreadyAdjustedAmount: 0,
    taxableAmount: 0,
    gstAmount: 0,
    currentDebitAmount: 0,
    balanceAfterAdjustment: 0,
    standaloneDebitAmount: 0,
    lineItems: [],
    reason: "Purchase Return",
    remarks: "Sample debit note for UI review",
    attachments: [],
    status: "draft",
    activity: [{ at: "2026-06-02T09:00:00.000Z", action: "created", by: "Admin", detail: "Sample debit note" }],
    createdBy: "Admin",
    updatedBy: "Admin",
    createdAt: "2026-06-02T09:00:00.000Z",
    updatedAt: "2026-06-02T09:00:00.000Z",
  },
];

function hydrateSeed(): DebitNoteRecord[] {
  const preview = buildReferenceFromPurchaseInvoice(1);
  if (!preview) return SEED.map(normalizeDebitNote);
  const totals = computeDebitTotals(preview.lineItems);
  return [
    normalizeDebitNote({
      ...SEED[0],
      sourcePoId: preview.sourcePoId,
      sourcePoNo: preview.sourcePoNo,
      sourceGrnNo: preview.sourceGrnNo,
      sourceQcNo: preview.sourceQcNo,
      vendorId: preview.vendorId,
      vendorName: preview.vendorName,
      originalAmount: preview.originalAmount,
      alreadyAdjustedAmount: preview.alreadyAdjustedAmount,
      lineItems: preview.lineItems,
      taxableAmount: totals.taxableAmount,
      gstAmount: totals.gstAmount,
    }),
  ];
}

export function loadDebitNotes(): DebitNoteRecord[] {
  if (typeof window === "undefined") return hydrateSeed().map(normalizeDebitNote);
  try {
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacy = localStorage.getItem("ds_accounts_debit_notes_v1");
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        raw = legacy;
      }
    }
    const list: DebitNoteRecord[] = raw ? JSON.parse(raw) : hydrateSeed();
    const normalized = list.map(normalizeDebitNote);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return hydrateSeed().map(normalizeDebitNote);
  }
}

export function saveDebitNotes(records: DebitNoteRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.map(normalizeDebitNote)));
}

export function getDebitNoteById(id: number): DebitNoteRecord | undefined {
  return loadDebitNotes().find((d) => d.id === id);
}

export function getVendorsForDebitNote(): Vendor[] {
  return getActiveVendors();
}

export function findPurchaseInvoiceForPO(poId: number): PurchaseInvoiceRecord | undefined {
  const po = loadPurchaseOrders().find((p) => p.id === poId);
  if (!po) return undefined;
  return loadPurchaseInvoices().find(
    (pi) => pi.poId === poId || pi.poNumber === po.poNumber || pi.vendorName === po.supplierName,
  );
}

export function buildReferenceFromPurchaseInvoice(invoiceId: number): DebitReferencePreview | null {
  const lookup = lookupPurchaseInvoiceForDebit(invoiceId);
  if (!lookup) return null;
  const inv = lookup.invoice;
  const vendor = getActiveVendors().find((v) => v.id === inv.vendorId || v.vendorName === inv.vendorName);
  const wh = warehouseRefsForPo(inv.poNumber);
  return {
    referenceType: "purchase_invoice",
    documentDate: inv.invoiceDate,
    sourceInvoiceId: inv.id,
    sourceInvoiceNo: inv.invoiceNo,
    sourcePoId: inv.poId,
    sourcePoNo: inv.poNumber,
    sourceGrnNo: wh.sourceGrnNo,
    sourceQcNo: wh.sourceQcNo,
    vendorId: inv.vendorId ?? vendor?.id ?? null,
    vendorName: inv.vendorName,
    vendorPhone: vendor ? `${vendor.mobileCountryCode} ${vendor.mobile}`.trim() : "",
    vendorEmail: vendor?.email ?? "",
    vendorGstin: inv.vendorGst || vendor?.gstNumber || "",
    originalAmount: inv.grandTotal,
    taxAmount: inv.taxAmount,
    alreadyAdjustedAmount: inv.amountDebited,
    lineItems: inv.lineItems.map(piLineToDebitLine),
  };
}

export function buildReferenceFromPurchaseOrder(poId: number): DebitReferencePreview | null {
  const po = loadPurchaseOrders().find((p) => p.id === poId);
  if (!po || po.status === "cancelled") return null;
  const linkedPi = findPurchaseInvoiceForPO(poId);
  const vendor = getActiveVendors().find((v) => v.id === po.supplierId || v.vendorName === po.supplierName);
  const lines = po.lines.map((l) => {
    const taxPct = l.cgstPct + l.sgstPct + l.igstPct;
    const lineTotal = l.netAmount;
    return {
      id: `dnl-${l.uid}`,
      sourceLineId: l.uid,
      productName: l.productName,
      invoiceQty: l.orderedQty,
      uom: l.uom,
      unitPrice: l.unitPrice,
      discountPct: 0,
      taxPct,
      gstAmount: l.taxAmount ?? 0,
      lineAmount: lineTotal,
      returnQty: 0,
      debitAmount: 0,
      lineRemarks: "",
    };
  });
  const wh = warehouseRefsForPo(po.poNumber);
  return {
    referenceType: "purchase_order",
    documentDate: po.poDate,
    sourceInvoiceId: linkedPi?.id ?? null,
    sourceInvoiceNo: linkedPi?.invoiceNo ?? "",
    sourcePoId: po.id,
    sourcePoNo: po.poNumber,
    sourceGrnNo: wh.sourceGrnNo,
    sourceQcNo: wh.sourceQcNo,
    vendorId: po.supplierId ?? vendor?.id ?? null,
    vendorName: po.supplierName,
    vendorPhone: vendor ? `${vendor.mobileCountryCode} ${vendor.mobile}`.trim() : "",
    vendorEmail: vendor?.email ?? "",
    vendorGstin: po.supplierGstin ?? vendor?.gstNumber ?? "",
    originalAmount: po.summary?.grandTotal ?? lines.reduce((s, l) => s + l.lineAmount, 0),
    taxAmount: lines.reduce((s, l) => s + l.gstAmount, 0),
    alreadyAdjustedAmount: 0,
    lineItems: lines.length ? lines : [createEmptyDebitLine()],
  };
}

export function buildReferenceFromQc(qcId: string): DebitReferencePreview | null {
  const qc = getQcRecords().find((q) => q.id === qcId);
  if (!qc || qc.status !== "completed" || qc.totalRejectedQty <= 0) return null;
  const grn = getGrnRecords().find((g) => g.grnNo === qc.grnNo);
  const po = loadPurchaseOrders().find((p) => p.poNumber === (qc.poNumber ?? grn?.poNumber));
  const linkedPi = po ? findPurchaseInvoiceForPO(po.id) : undefined;
  const vendor = getActiveVendors().find((v) => v.vendorName === qc.vendorName);
  const lines = qc.items
    .filter((it) => it.rejectedQty > 0)
    .map((it) => {
      const grnItem = grn?.items.find((gi) => gi.productName === it.productName);
      const poLine = po?.lines.find((l) => l.productName === it.productName);
      const unitPrice = poLine?.unitPrice ?? 0;
      const taxPct = poLine ? poLine.cgstPct + poLine.sgstPct + poLine.igstPct : 0;
      const lineAmount = unitPrice * it.receivedQty;
      const gstAmount = poLine?.taxAmount ?? 0;
      return {
        id: `dnl-qc-${it.productId}`,
        sourceLineId: grnItem?.productCode ?? it.productId,
        productName: it.productName,
        invoiceQty: it.receivedQty,
        uom: grnItem ? "Unit" : "Unit",
        unitPrice,
        discountPct: 0,
        taxPct,
        gstAmount,
        lineAmount,
        returnQty: it.rejectedQty,
        debitAmount: 0,
        lineRemarks: it.rejectionReason ?? "",
      };
    });
  const computed = lines.map((l) => ({
    ...l,
    debitAmount: computeLineDebitAmount(l, lines, 0),
  }));
  return {
    referenceType: "purchase_order",
    documentDate: qc.inspectionDate,
    sourceInvoiceId: linkedPi?.id ?? null,
    sourceInvoiceNo: linkedPi?.invoiceNo ?? "",
    sourcePoId: po?.id ?? null,
    sourcePoNo: qc.poNumber ?? grn?.poNumber ?? "",
    sourceGrnNo: qc.grnNo,
    sourceQcNo: qc.qcNo,
    vendorId: po?.supplierId ?? vendor?.id ?? null,
    vendorName: qc.vendorName,
    vendorPhone: vendor ? `${vendor.mobileCountryCode} ${vendor.mobile}`.trim() : "",
    vendorEmail: vendor?.email ?? "",
    vendorGstin: po?.supplierGstin ?? vendor?.gstNumber ?? "",
    originalAmount: po?.summary?.grandTotal ?? computed.reduce((s, l) => s + l.lineAmount, 0),
    taxAmount: computed.reduce((s, l) => s + l.gstAmount, 0),
    alreadyAdjustedAmount: 0,
    lineItems: computed.length ? computed : [createEmptyDebitLine()],
  };
}

export function listQcsForDebit(): { id: string; qcNo: string; grnNo: string; poNumber: string; rejectedQty: number }[] {
  return getQcRecords()
    .filter((q) => q.status === "completed" && q.totalRejectedQty > 0)
    .map((q) => ({
      id: q.id,
      qcNo: q.qcNo,
      grnNo: q.grnNo,
      poNumber: q.poNumber ?? "",
      rejectedQty: q.totalRejectedQty,
    }));
}

export function previewToDebitForm(preview: DebitReferencePreview): Partial<DebitNoteFormInput> {
  return {
    vendorId: preview.vendorId,
    vendorName: preview.vendorName,
    sourceInvoiceId: preview.sourceInvoiceId,
    sourceInvoiceNo: preview.sourceInvoiceNo,
    sourcePoId: preview.sourcePoId,
    sourcePoNo: preview.sourcePoNo,
    sourceGrnNo: preview.sourceGrnNo,
    sourceQcNo: preview.sourceQcNo,
    originalAmount: preview.originalAmount,
    alreadyAdjustedAmount: preview.alreadyAdjustedAmount,
    lineItems: preview.lineItems,
  };
}

/** @deprecated */
export function buildDebitNoteFromPurchaseInvoice(invoiceId: number): Partial<DebitNoteRecord> | null {
  const p = buildReferenceFromPurchaseInvoice(invoiceId);
  if (!p) return null;
  const f = previewToDebitForm(p);
  return {
    againstType: "purchase_invoice",
    sourceInvoiceId: f.sourceInvoiceId ?? null,
    sourceInvoiceNo: f.sourceInvoiceNo ?? "",
    sourcePoId: f.sourcePoId ?? null,
    sourcePoNo: f.sourcePoNo ?? "",
    vendorId: f.vendorId ?? null,
    vendorName: f.vendorName ?? "",
    originalAmount: f.originalAmount,
    alreadyAdjustedAmount: f.alreadyAdjustedAmount,
    lineItems: f.lineItems,
  };
}

/** @deprecated */
export function lookupPurchaseOrderForDebit(poId: number) {
  const p = buildReferenceFromPurchaseOrder(poId);
  if (!p) return null;
  const po = loadPurchaseOrders().find((x) => x.id === poId)!;
  return {
    po,
    originalAmount: p.originalAmount,
    alreadyAdjusted: p.alreadyAdjustedAmount,
    lines: p.lineItems.map((l) => ({
      lineId: l.sourceLineId,
      productName: l.productName,
      invoiceQty: l.invoiceQty,
      alreadyReturnedQty: 0,
      balanceQty: l.invoiceQty,
      invoiceAmount: l.lineAmount,
      alreadyDebitedAmount: 0,
      balanceDebitAllowed: l.lineAmount,
    })),
  };
}

function validateBasic(input: DebitNoteFormInput): void {
  if (!input.vendorName.trim()) throw new Error("Supplier is required.");
  if (!input.reason.trim()) throw new Error("Reason is required.");
  if (!input.remarks.trim()) throw new Error("Remarks are required.");
  if (input.againstType === "standalone_adjustment") {
    if (input.standaloneDebitAmount <= 0) throw new Error("Enter debit amount for standalone adjustment.");
    return;
  }
  const total = input.lineItems.reduce((s, l) => s + l.debitAmount, 0);
  if (total <= 0) throw new Error("Enter return qty or debit amount on at least one line.");
}

export type DebitNoteFormInput = {
  debitNoteDate: string;
  againstType: DebitNoteAgainst;
  vendorId: number | null;
  vendorName: string;
  sourceInvoiceId: number | null;
  sourceInvoiceNo: string;
  sourcePoId: number | null;
  sourcePoNo: string;
  sourceGrnNo: string;
  sourceQcNo: string;
  originalAmount: number;
  alreadyAdjustedAmount: number;
  standaloneDebitAmount: number;
  lineItems: DebitNoteLine[];
  reason: string;
  remarks: string;
  attachments: DebitNoteAttachment[];
  status: NoteWorkflowStatus;
};

function metaFromInput(input: DebitNoteFormInput) {
  if (input.againstType === "purchase_invoice" && input.sourceInvoiceId) {
    const p = buildReferenceFromPurchaseInvoice(input.sourceInvoiceId);
    if (p) {
      return {
        sourceInvoiceNo: p.sourceInvoiceNo,
        sourcePoNo: p.sourcePoNo,
        sourceGrnNo: p.sourceGrnNo,
        sourceQcNo: p.sourceQcNo,
        originalAmount: p.originalAmount,
        alreadyAdjustedAmount: p.alreadyAdjustedAmount,
      };
    }
  }
  if (input.againstType === "purchase_order" && input.sourcePoId) {
    const p = buildReferenceFromPurchaseOrder(input.sourcePoId);
    if (p) {
      return {
        sourceInvoiceNo: p.sourceInvoiceNo,
        sourcePoNo: p.sourcePoNo,
        sourceGrnNo: p.sourceGrnNo,
        sourceQcNo: p.sourceQcNo,
        originalAmount: p.originalAmount,
        alreadyAdjustedAmount: p.alreadyAdjustedAmount,
      };
    }
  }
  return {
    sourceInvoiceNo: input.sourceInvoiceNo,
    sourcePoNo: input.sourcePoNo,
    sourceGrnNo: input.sourceGrnNo,
    sourceQcNo: input.sourceQcNo,
    originalAmount: input.originalAmount,
    alreadyAdjustedAmount: input.alreadyAdjustedAmount,
  };
}

export function createDebitNote(input: DebitNoteFormInput): DebitNoteRecord {
  validateBasic(input);
  const all = loadDebitNotes();
  const meta = metaFromInput(input);
  const id = all.length ? Math.max(...all.map((r) => r.id)) + 1 : 1;
  const rec = normalizeDebitNote({
    id,
    debitNoteNo: nextDebitNoteNo(all),
    debitNoteDate: input.debitNoteDate,
    againstType: input.againstType,
    sourceInvoiceId: input.sourceInvoiceId,
    sourceInvoiceNo: meta.sourceInvoiceNo,
    sourcePoId: input.sourcePoId,
    sourcePoNo: meta.sourcePoNo,
    sourceGrnNo: meta.sourceGrnNo,
    sourceQcNo: meta.sourceQcNo,
    vendorId: input.vendorId,
    vendorName: input.vendorName.trim(),
    originalAmount: meta.originalAmount,
    alreadyAdjustedAmount: meta.alreadyAdjustedAmount,
    taxableAmount: 0,
    gstAmount: 0,
    currentDebitAmount: 0,
    balanceAfterAdjustment: 0,
    standaloneDebitAmount: input.standaloneDebitAmount,
    lineItems: input.lineItems,
    reason: input.reason,
    remarks: input.remarks,
    attachments: input.attachments,
    status: input.status,
    activity: [{ at: new Date().toISOString(), action: "created", by: ACCOUNTS_CURRENT_USER, detail: "Debit note created" }],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  saveDebitNotes([...all, rec]);
  return rec;
}

export function updateDebitNote(id: number, input: DebitNoteFormInput): DebitNoteRecord {
  const all = loadDebitNotes();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Debit note not found");
  const cur = all[idx];
  if (cur.status === "cancelled") {
    throw new Error("Cannot edit cancelled debit note.");
  }
  validateBasic(input);
  const meta = metaFromInput(input);
  const updated = normalizeDebitNote({
    ...cur,
    debitNoteDate: input.debitNoteDate,
    againstType: input.againstType,
    vendorId: input.vendorId,
    vendorName: input.vendorName.trim(),
    sourceInvoiceId: input.sourceInvoiceId,
    sourceInvoiceNo: meta.sourceInvoiceNo,
    sourcePoId: input.sourcePoId,
    sourcePoNo: meta.sourcePoNo,
    sourceGrnNo: meta.sourceGrnNo,
    sourceQcNo: meta.sourceQcNo,
    originalAmount: meta.originalAmount,
    alreadyAdjustedAmount: meta.alreadyAdjustedAmount,
    standaloneDebitAmount: input.standaloneDebitAmount,
    lineItems: input.lineItems,
    reason: input.reason,
    remarks: input.remarks,
    attachments: input.attachments,
    status: input.status,
    activity: appendActivity(cur.activity, "updated", "Debit note updated"),
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  saveDebitNotes(all);
  return updated;
}

export function approveDebitNote(id: number): DebitNoteRecord {
  const all = loadDebitNotes();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Debit note not found");
  const cur = normalizeDebitNote(all[idx]);
  if (cur.status !== "draft" && cur.status !== "pending_approval") {
    throw new Error("Only draft or pending debit notes can be approved.");
  }

  if (cur.againstType === "purchase_invoice" && cur.sourceInvoiceId) {
    reconcilePurchaseInvoiceDebits(
      cur.sourceInvoiceId,
      cur.lineItems.map((l) => ({
        lineId: l.sourceLineId,
        debitedQty: l.returnQty,
        debitedAmount: l.debitAmount,
      })),
    );
  }

  const updated = normalizeDebitNote({
    ...cur,
    status: "approved",
    approvedBy: ACCOUNTS_CURRENT_USER,
    approvedAt: new Date().toISOString(),
    activity: appendActivity(cur.activity, "approved", `Approved debit ${cur.currentDebitAmount}`),
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  saveDebitNotes(all);
  maybePostDebitNote(updated);
  return updated;
}

export function processDebitNote(id: number): DebitNoteRecord {
  const all = loadDebitNotes();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Debit note not found");
  const cur = all[idx];
  if (cur.status !== "approved") throw new Error("Only approved debit notes can be marked processed.");
  const updated = normalizeDebitNote({
    ...cur,
    status: "processed",
    processedAt: new Date().toISOString(),
    activity: appendActivity(cur.activity, "processed", "Marked as processed"),
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  saveDebitNotes(all);
  return updated;
}

export function cancelDebitNote(id: number, reason: string): DebitNoteRecord {
  const all = loadDebitNotes();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Debit note not found");
  const cur = all[idx];
  if (cur.status === "approved" || cur.status === "processed") {
    throw new Error("Approved or processed debit notes cannot be cancelled.");
  }
  const updated = normalizeDebitNote({
    ...cur,
    status: "cancelled",
    activity: appendActivity(cur.activity, "cancelled", reason.trim() || "Cancelled"),
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  saveDebitNotes(all);
  return updated;
}

export function canEditDebitNote(rec: DebitNoteRecord): boolean {
  return rec.status !== "cancelled";
}

export function getDebitNoteRowActions(
  rec: DebitNoteRecord,
): ("view" | "edit" | "approve" | "process" | "cancel" | "pdf")[] {
  const actions: ("view" | "edit" | "approve" | "process" | "cancel" | "pdf")[] = ["view", "pdf"];
  if (canEditDebitNote(rec)) actions.push("edit");
  if (rec.status === "draft" || rec.status === "pending_approval") actions.push("approve");
  if (rec.status === "approved") actions.push("process");
  if (rec.status !== "approved" && rec.status !== "processed" && rec.status !== "cancelled") {
    actions.push("cancel");
  }
  return actions;
}

export type DebitNoteFilters = {
  tab: string;
  search: string;
  vendor: string;
  referenceType: string;
  referenceNo: string;
  dateFrom: string;
  dateTo: string;
  status: string;
};

export function filterDebitNotes(records: DebitNoteRecord[], filters: DebitNoteFilters): DebitNoteRecord[] {
  let r = records;
  if (filters.tab !== "all") {
    const tabStatus = filters.tab === "pending" ? "pending_approval" : filters.tab;
    r = r.filter((x) => x.status === tabStatus);
  }
  if (filters.status && filters.status !== "all") {
    r = r.filter((x) => x.status === filters.status);
  }
  if (filters.vendor && filters.vendor !== "all") {
    r = r.filter((x) => x.vendorName === filters.vendor);
  }
  if (filters.referenceType && filters.referenceType !== "all") {
    r = r.filter((x) => x.againstType === filters.referenceType);
  }
  if (filters.referenceNo.trim()) {
    const q = filters.referenceNo.toLowerCase();
    r = r.filter(
      (x) => x.sourceInvoiceNo.toLowerCase().includes(q) || x.sourcePoNo.toLowerCase().includes(q),
    );
  }
  if (filters.dateFrom) r = r.filter((x) => x.debitNoteDate >= filters.dateFrom);
  if (filters.dateTo) r = r.filter((x) => x.debitNoteDate <= filters.dateTo);
  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    r = r.filter(
      (x) =>
        x.debitNoteNo.toLowerCase().includes(q) ||
        x.vendorName.toLowerCase().includes(q) ||
        x.sourceInvoiceNo.toLowerCase().includes(q) ||
        x.sourcePoNo.toLowerCase().includes(q),
    );
  }
  return r;
}

export function computeDebitNoteTabCounts(records: DebitNoteRecord[]): Record<string, number> {
  return {
    all: records.length,
    draft: records.filter((r) => r.status === "draft").length,
    pending: records.filter((r) => r.status === "pending_approval").length,
    approved: records.filter((r) => r.status === "approved").length,
    processed: records.filter((r) => r.status === "processed").length,
    cancelled: records.filter((r) => r.status === "cancelled").length,
  };
}

export { listCreditablePurchaseInvoices };

export function listPurchaseOrdersForDebit() {
  return loadPurchaseOrders().filter((p) => p.status !== "cancelled" && p.status !== "draft");
}

export function newDebitAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

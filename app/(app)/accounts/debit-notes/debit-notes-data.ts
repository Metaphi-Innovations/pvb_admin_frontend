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
import { computeNoteTaxBreakup } from "@/lib/accounts/note-tax-breakup";
import { inferInterstateFromPlaceOfSupply, normalizeGstAmounts } from "@/lib/accounts/gst-accounting";
import { invalidateAccountsDataCache } from "@/lib/accounts/accounts-data-service";
import { buildDebitNotesSeed } from "./debit-notes-seed";
import {
  getPurchaseReturnById,
  loadPurchaseReturns,
  type PurchaseReturn,
} from "@/app/(app)/procurement/purchase-returns/purchase-return-data";
import {
  listPendingDebitNoteReturns,
  type PendingDebitNoteRow,
} from "./pending-debit-notes-data";

export type DebitNoteCreationMode = "against_return" | "direct_adjustment";

export type DebitNoteSource = "purchase_return" | "manual";

export const DEBIT_NOTE_SOURCE_LABELS: Record<DebitNoteSource, string> = {
  purchase_return: "Purchase Return",
  manual: "Manual",
};

export const FRESH_DEBIT_REASONS = [
  "Rate Difference",
  "Excess Billing",
  "Purchase Return Adjustment",
  "GST Correction",
  "Discount Recovery",
  "Penalty",
  "Freight Recovery",
  "Other",
] as const;

/** @deprecated Use FRESH_DEBIT_REASONS */
export const MANUAL_DEBIT_REASONS = FRESH_DEBIT_REASONS;

export type DebitNoteAgainst = "purchase_invoice" | "purchase_order" | "standalone_adjustment";
export type DebitReferenceType = DebitNoteAgainst;
export type NoteWorkflowStatus =
  | "draft"
  | "posted"
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
  batchNo?: string;
  hsn?: string;
  invoiceQty: number;
  /** Qty from purchase return document. */
  purchaseReturnQty?: number;
  /** Upper bound for debit qty validation. */
  eligibleReturnQty?: number;
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
  sourcePackingNo?: string;
  sourceDispatchNo?: string;
  dispatchStatus?: string;
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
  source: DebitNoteSource;
  sourceReturnId?: string;
  sourceReturnNo?: string;
  sourcePackingNo?: string;
  sourceDispatchNo?: string;
  referenceNo?: string;
  adjustmentLedgerId?: number | null;
  adjustmentLedgerName?: string;
  freshGstPct?: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

const STORAGE_KEY = "ds_accounts_debit_notes_v3";
const SEED_VERSION_KEY = "ds_accounts_debit_notes_seed_v3";

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
    batchNo: "",
    hsn: "",
    invoiceQty: 0,
    purchaseReturnQty: 0,
    eligibleReturnQty: 0,
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

export function getDebitLineMaxQty(line: DebitNoteLine): number {
  if (line.eligibleReturnQty != null && line.eligibleReturnQty > 0) return line.eligibleReturnQty;
  if (line.purchaseReturnQty != null && line.purchaseReturnQty > 0) return line.purchaseReturnQty;
  return line.invoiceQty > 0 ? line.invoiceQty : Number.POSITIVE_INFINITY;
}

export function validateDebitNoteLines(lines: DebitNoteLine[]): void {
  for (const line of lines) {
    if (line.returnQty <= 0) continue;
    const max = getDebitLineMaxQty(line);
    if (Number.isFinite(max) && line.returnQty > max + 0.0001) {
      throw new Error(
        `Debit qty for "${line.productName || "line"}" cannot exceed eligible return qty (${max}).`,
      );
    }
  }
}

export function listPurchaseReturnsForDebitNote(): PurchaseReturn[] {
  const pendingIds = new Set(listPendingDebitNoteReturns().map((p) => p.returnId));
  return loadPurchaseReturns().filter((r) => pendingIds.has(Number(r.id)));
}

export function getPendingDebitNoteRow(returnId: number): PendingDebitNoteRow | undefined {
  return listPendingDebitNoteReturns().find((p) => p.returnId === returnId);
}

function firstGrnFromReturn(ret: PurchaseReturn): string {
  const item = ret.items.find((it) => it.grnNo);
  return item?.grnNo ?? "";
}

export function buildReferenceFromPurchaseReturn(returnId: number): DebitReferencePreview | null {
  const ret = getPurchaseReturnById(returnId);
  if (!ret) return null;
  const pending = getPendingDebitNoteRow(returnId);
  const pi = findPurchaseInvoiceForPO(Number(ret.poId));
  const basePreview = pi ? buildReferenceFromPurchaseInvoice(pi.id) : null;
  const vendor = getActiveVendors().find(
    (v) => v.id === ret.supplierId || v.vendorName === ret.supplierName,
  );
  const wh = warehouseRefsForPo(ret.poNumber);

  const lineItems = ret.items
    .filter((item) => item.returnQty > 0 || item.balanceRejectedQty > 0)
    .map((item) => {
      const baseLine =
        basePreview?.lineItems.find((l) => l.sourceLineId === item.id) ??
        basePreview?.lineItems.find(
          (l) => l.productName.trim().toLowerCase() === item.productName.trim().toLowerCase(),
        );
      const purchaseReturnQty = item.returnQty > 0 ? item.returnQty : item.balanceRejectedQty;
      const taxPct = item.cgstPct + item.sgstPct + item.igstPct;
      const lineTotal =
        item.netAmount > 0
          ? item.netAmount
          : Math.round((item.taxableValue + item.taxAmount) * 100) / 100;
      return normalizeDebitLine({
        id: baseLine?.id ?? `dnl-pr-${item.id}`,
        sourceLineId: baseLine?.sourceLineId ?? item.id,
        productName: item.productName,
        batchNo: item.batchNumber,
        hsn: baseLine?.hsn ?? "",
        invoiceQty: baseLine?.invoiceQty ?? item.grnReceivedQty,
        purchaseReturnQty,
        eligibleReturnQty: purchaseReturnQty,
        uom: baseLine?.uom ?? "Unit",
        unitPrice: item.unitPrice || baseLine?.unitPrice || 0,
        discountPct: baseLine?.discountPct ?? 0,
        taxPct: taxPct || baseLine?.taxPct || 0,
        gstAmount: item.taxAmount || baseLine?.gstAmount || 0,
        lineAmount: baseLine?.lineAmount ?? lineTotal,
        returnQty: 0,
        debitAmount: 0,
        lineRemarks: item.lineRemark || ret.overallRemarks,
      });
    });

  if (!lineItems.length) return null;

  return {
    referenceType: "purchase_invoice",
    documentDate: ret.returnDate,
    sourceInvoiceId: pi?.id ?? null,
    sourceInvoiceNo: pi?.invoiceNo ?? "",
    sourcePoId: Number(ret.poId),
    sourcePoNo: ret.poNumber,
    sourceGrnNo: wh.sourceGrnNo || pending?.grnNo || firstGrnFromReturn(ret),
    sourceQcNo: wh.sourceQcNo,
    sourcePackingNo: pending?.packingNo ?? "",
    sourceDispatchNo: pending?.dispatchNo ?? "",
    dispatchStatus: pending?.dispatchStatus ?? "",
    vendorId: ret.supplierId ? Number(ret.supplierId) : vendor?.id ?? null,
    vendorName: ret.supplierName,
    vendorPhone: vendor ? `${vendor.mobileCountryCode} ${vendor.mobile}`.trim() : "",
    vendorEmail: vendor?.email ?? "",
    vendorGstin: vendor?.gstNumber ?? "",
    originalAmount: basePreview?.originalAmount ?? ret.summary?.grandTotal ?? 0,
    taxAmount: basePreview?.taxAmount ?? 0,
    alreadyAdjustedAmount: basePreview?.alreadyAdjustedAmount ?? 0,
    lineItems,
  };
}

function piLineToDebitLine(l: PurchaseInvoiceLine): DebitNoteLine {
  const lineTotal = Math.round((l.lineAmount + l.taxAmount) * 100) / 100;
  return {
    id: `dnl-${l.id}`,
    sourceLineId: l.id,
    productName: l.productName,
    batchNo: l.batchNumber ?? "",
    hsn: "",
    invoiceQty: l.invoiceQty,
    purchaseReturnQty: 0,
    eligibleReturnQty: l.invoiceQty,
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

export function calcDebitFromQty(line: Pick<DebitNoteLine, "returnQty" | "invoiceQty" | "unitPrice" | "discountPct" | "taxPct" | "lineAmount">): number {
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

function inferDebitNoteSource(rec: DebitNoteRecord): DebitNoteSource {
  if (rec.source) return rec.source;
  if (rec.sourceReturnNo) return "purchase_return";
  return "manual";
}

export function normalizeDebitNote(rec: DebitNoteRecord): DebitNoteRecord {
  const lineItems = rec.lineItems.map((l) => normalizeDebitLine(l));
  const totals =
    rec.againstType === "standalone_adjustment"
      ? (() => {
          const gst = rec.gstAmount ?? 0;
          const taxable =
            rec.taxableAmount > 0
              ? rec.taxableAmount
              : Math.max(0, rec.standaloneDebitAmount - gst);
          const total = Math.round((taxable + gst) * 100) / 100;
          return { taxableAmount: taxable, gstAmount: gst, total };
        })()
      : computeDebitTotals(lineItems);
  const currentDebitAmount =
    rec.againstType === "standalone_adjustment" ? rec.standaloneDebitAmount : totals.total;
  const balanceAfterAdjustment = Math.max(
    0,
    rec.originalAmount - rec.alreadyAdjustedAmount - currentDebitAmount,
  );
  const interstate = inferInterstateFromPlaceOfSupply(
    (rec as { placeOfSupply?: string }).placeOfSupply,
  );
  const taxBreakup =
    rec.againstType === "standalone_adjustment"
      ? (() => {
          const gst = normalizeGstAmounts(rec.gstAmount ?? 0, interstate);
          return {
            taxableValue: rec.taxableAmount,
            cgstAmount: gst.cgst,
            sgstAmount: gst.sgst,
            igstAmount: gst.igst,
          };
        })()
      : computeNoteTaxBreakup(lineItems, interstate);
  return {
    ...rec,
    source: inferDebitNoteSource(rec),
    sourceGrnNo: rec.sourceGrnNo ?? "",
    sourceQcNo: rec.sourceQcNo ?? "",
    lineItems,
    attachments: rec.attachments ?? [],
    taxableAmount: totals.taxableAmount,
    gstAmount: totals.gstAmount,
    cgstAmount: taxBreakup.cgstAmount,
    sgstAmount: taxBreakup.sgstAmount,
    igstAmount: taxBreakup.igstAmount,
    currentDebitAmount: Math.round(currentDebitAmount * 100) / 100,
    balanceAfterAdjustment: Math.round(balanceAfterAdjustment * 100) / 100,
  };
}

const SEED: DebitNoteRecord[] = buildDebitNotesSeed();

function hydrateSeed(): DebitNoteRecord[] {
  return SEED.map(normalizeDebitNote);
}

export function loadDebitNotes(): DebitNoteRecord[] {
  if (typeof window === "undefined") return hydrateSeed().map(normalizeDebitNote);
  try {
    const seedCurrent = localStorage.getItem(SEED_VERSION_KEY) === SEED_VERSION_KEY;
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const legacyV2 = localStorage.getItem("ds_accounts_debit_notes_v2");
      const legacyV1 = localStorage.getItem("ds_accounts_debit_notes_v1");
      if (legacyV2) {
        localStorage.setItem(STORAGE_KEY, legacyV2);
        raw = legacyV2;
      } else if (legacyV1) {
        localStorage.setItem(STORAGE_KEY, legacyV1);
        raw = legacyV1;
      }
    }
    if (!raw && !seedCurrent) {
      const seeded = hydrateSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      localStorage.setItem(SEED_VERSION_KEY, SEED_VERSION_KEY);
      return seeded;
    }
    const list: DebitNoteRecord[] = raw ? JSON.parse(raw) : hydrateSeed();
    const normalized = list.map((r) =>
      normalizeDebitNote({
        ...r,
        source: r.source ?? inferDebitNoteSource(r as DebitNoteRecord),
        cgstAmount: r.cgstAmount ?? 0,
        sgstAmount: r.sgstAmount ?? 0,
        igstAmount: r.igstAmount ?? 0,
      }),
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return hydrateSeed().map(normalizeDebitNote);
  }
}

export function saveDebitNotes(records: DebitNoteRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records.map(normalizeDebitNote)));
  invalidateAccountsDataCache("debitNotes");
}

export function getDebitNoteById(id: number): DebitNoteRecord | undefined {
  return loadDebitNotes().find((d) => d.id === id);
}

export function getVendorsForDebitNote(): Vendor[] {
  return getActiveVendors();
}

export function findPurchaseInvoiceForPO(poId: number): PurchaseInvoiceRecord | undefined {
  const po = loadPurchaseOrders().find((p) => String(p.id) === String(poId));
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
  const po = loadPurchaseOrders().find((p) => String(p.id) === String(poId));
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
    sourcePoId: Number(po.id) || (po.id as any),
    sourcePoNo: po.poNumber,
    sourceGrnNo: wh.sourceGrnNo,
    sourceQcNo: wh.sourceQcNo,
    vendorId: (Number(po.supplierId) || (po.supplierId as any)) ?? vendor?.id ?? null,
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
  const linkedPi = po ? findPurchaseInvoiceForPO(Number(po.id)) : undefined;
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
    sourcePoId: po?.id ? (Number(po.id) || (po.id as any)) : null,
    sourcePoNo: qc.poNumber ?? grn?.poNumber ?? "",
    sourceGrnNo: qc.grnNo,
    sourceQcNo: qc.qcNo,
    vendorId: (po?.supplierId ? (Number(po.supplierId) || (po.supplierId as any)) : null) ?? vendor?.id ?? null,
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
  const po = loadPurchaseOrders().find((x) => String(x.id) === String(poId))!;
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
  if (!input.reason.trim()) throw new Error("Reason / adjustment type is required.");
  if (input.againstType === "standalone_adjustment") {
    if (!input.adjustmentLedgerId) throw new Error("Select an adjustment ledger.");
    if (input.standaloneDebitAmount <= 0) throw new Error("Enter a valid debit amount.");
    return;
  }
  if (!input.remarks.trim()) throw new Error("Narration is required.");
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
  sourcePackingNo?: string;
  sourceDispatchNo?: string;
  originalAmount: number;
  alreadyAdjustedAmount: number;
  standaloneDebitAmount: number;
  taxableAmount?: number;
  gstAmount?: number;
  freshGstPct?: number;
  lineItems: DebitNoteLine[];
  reason: string;
  remarks: string;
  referenceNo?: string;
  adjustmentLedgerId?: number | null;
  adjustmentLedgerName?: string;
  attachments: DebitNoteAttachment[];
  status: NoteWorkflowStatus;
  source?: DebitNoteSource;
  sourceReturnId?: string;
  sourceReturnNo?: string;
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

function resolveDebitNoteSource(input: DebitNoteFormInput): DebitNoteSource {
  if (input.source) return input.source;
  if (input.sourceReturnNo) return "purchase_return";
  return "manual";
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
    source: resolveDebitNoteSource(input),
    sourceReturnId: input.sourceReturnId,
    sourceReturnNo: input.sourceReturnNo,
    sourceInvoiceId: input.sourceInvoiceId,
    sourceInvoiceNo: meta.sourceInvoiceNo,
    sourcePoId: input.sourcePoId,
    sourcePoNo: meta.sourcePoNo,
    sourceGrnNo: meta.sourceGrnNo,
    sourceQcNo: meta.sourceQcNo,
    sourcePackingNo: input.sourcePackingNo,
    sourceDispatchNo: input.sourceDispatchNo,
    referenceNo: input.referenceNo,
    adjustmentLedgerId: input.adjustmentLedgerId ?? null,
    adjustmentLedgerName: input.adjustmentLedgerName,
    freshGstPct: input.freshGstPct,
    vendorId: input.vendorId,
    vendorName: input.vendorName.trim(),
    originalAmount: meta.originalAmount,
    alreadyAdjustedAmount: meta.alreadyAdjustedAmount,
    taxableAmount: input.taxableAmount ?? 0,
    gstAmount: input.gstAmount ?? 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
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
  if (cur.status === "posted" || cur.status === "approved" || cur.status === "processed") {
    throw new Error("Cannot edit posted debit note.");
  }
  validateBasic(input);
  const meta = metaFromInput(input);
  const updated = normalizeDebitNote({
    ...cur,
    debitNoteDate: input.debitNoteDate,
    againstType: input.againstType,
    source: resolveDebitNoteSource(input),
    sourceReturnId: input.sourceReturnId ?? cur.sourceReturnId,
    sourceReturnNo: input.sourceReturnNo ?? cur.sourceReturnNo,
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
    sourcePackingNo: input.sourcePackingNo ?? cur.sourcePackingNo,
    sourceDispatchNo: input.sourceDispatchNo ?? cur.sourceDispatchNo,
    referenceNo: input.referenceNo ?? cur.referenceNo,
    adjustmentLedgerId: input.adjustmentLedgerId ?? cur.adjustmentLedgerId ?? null,
    adjustmentLedgerName: input.adjustmentLedgerName ?? cur.adjustmentLedgerName,
    freshGstPct: input.freshGstPct ?? cur.freshGstPct,
    taxableAmount: input.taxableAmount ?? cur.taxableAmount,
    gstAmount: input.gstAmount ?? cur.gstAmount,
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

export function postDebitNoteRecord(id: number): DebitNoteRecord {
  const all = loadDebitNotes();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) throw new Error("Debit note not found");
  const cur = normalizeDebitNote(all[idx]);
  if (cur.status !== "draft") {
    throw new Error("Only draft debit notes can be posted.");
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
    status: "posted",
    approvedBy: ACCOUNTS_CURRENT_USER,
    approvedAt: new Date().toISOString(),
    activity: appendActivity(cur.activity, "posted", `Posted debit ${cur.currentDebitAmount}`),
    updatedBy: ACCOUNTS_CURRENT_USER,
    updatedAt: new Date().toISOString(),
  });
  all[idx] = updated;
  saveDebitNotes(all);
  maybePostDebitNote(updated);
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
  if (cur.status === "posted" || cur.status === "approved" || cur.status === "processed") {
    throw new Error("Posted debit notes cannot be cancelled.");
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
  return rec.status === "draft";
}

export function getDebitNoteRowActions(
  rec: DebitNoteRecord,
): ("view" | "edit" | "post" | "approve" | "process" | "cancel" | "pdf")[] {
  const actions: ("view" | "edit" | "post" | "approve" | "process" | "cancel" | "pdf")[] = ["view", "pdf"];
  if (canEditDebitNote(rec)) actions.push("edit");
  if (rec.status === "draft") actions.push("post");
  if (rec.status === "pending_approval") actions.push("approve");
  if (rec.status === "approved") actions.push("process");
  if (rec.status !== "posted" && rec.status !== "approved" && rec.status !== "processed" && rec.status !== "cancelled") {
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
    if (filters.tab === "posted") {
      r = r.filter((x) => x.status === "posted" || x.status === "approved" || x.status === "processed");
    } else {
      const tabStatus = filters.tab === "pending" ? "pending_approval" : filters.tab;
      r = r.filter((x) => x.status === tabStatus);
    }
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
        x.sourcePoNo.toLowerCase().includes(q) ||
        x.sourceReturnNo?.toLowerCase().includes(q) ||
        DEBIT_NOTE_SOURCE_LABELS[x.source].toLowerCase().includes(q),
    );
  }
  return r.sort((a, b) => b.debitNoteDate.localeCompare(a.debitNoteDate));
}

export function computeDebitNoteTabCounts(records: DebitNoteRecord[]): Record<string, number> {
  const isPosted = (s: string) => s === "posted" || s === "approved" || s === "processed";
  return {
    all: records.length,
    draft: records.filter((r) => r.status === "draft").length,
    posted: records.filter((r) => isPosted(r.status)).length,
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

/**
 * Purchase Invoice quantity comparison & mismatch handling.
 * Supplier invoice values always come from GRN OCR — never from GRN/QC received qty.
 */
import type { GrnRecord, GrnOcrExtractedInvoice, GrnOcrLineItem } from "@/app/(app)/warehouse/grn/types";
import type { QcRecord } from "@/app/(app)/warehouse/qc/types";
import type {
  PurchaseInvoiceLine,
  PurchaseInvoiceLineQtyComparison,
  PurchaseInvoiceMatchStatus,
  PurchaseInvoiceOcrPayload,
  PurchaseInvoiceRecord,
} from "./purchase-invoices-data";
import { findProductByName, getProductsForPurchaseTransaction } from "@/lib/accounts/transaction-master-fetch";
import { getPOById, loadPurchaseOrders } from "@/app/(app)/procurement/purchase-orders/po-data";
import { todayStr } from "@/lib/procurement/utils";

export const PURCHASE_INVOICE_MATCH_STATUS_LABELS: Record<PurchaseInvoiceMatchStatus, string> = {
  matched: "Matched",
  quantity_mismatch: "Quantity Mismatch",
  debit_note_pending: "Debit Note Pending",
  debit_note_posted: "Debit Note Posted",
};

export interface SupplierInvoiceFromGrn {
  vendorInvoiceNo: string;
  invoiceDate: string;
  supplierInvoiceId: string | null;
  ocrPayload: PurchaseInvoiceOcrPayload;
  lines: PurchaseInvoiceLine[];
  comparisons: Array<PurchaseInvoiceLineQtyComparison & { lineId: string }>;
  hasQuantityMismatch: boolean;
  poId: number | null;
  poNumber: string;
  poDate: string;
  qcId: string | null;
  qcNo: string;
}

function getQcForGrn(grn: GrnRecord): QcRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const { getQcRecords } = require("@/app/(app)/warehouse/qc/mock-data");
    const qcs = getQcRecords() as QcRecord[];
    return (
      qcs.find((q) => q.grnId === grn.id || q.grnNo === grn.grnNo) ?? null
    );
  } catch {
    return null;
  }
}

function resolvePoFromGrn(grn: GrnRecord): { poId: number | null; poNumber: string; poDate: string } {
  if (grn.poId) {
    const po = getPOById(grn.poId);
    return { poId: grn.poId, poNumber: grn.poNumber ?? po?.poNumber ?? "", poDate: po?.poDate ?? "" };
  }
  if (grn.poNumber) {
    const po = loadPurchaseOrders().find((p) => p.poNumber === grn.poNumber);
    return { poId: po?.id ?? null, poNumber: grn.poNumber, poDate: po?.poDate ?? "" };
  }
  return { poId: null, poNumber: "", poDate: "" };
}

function primaryOcrInvoice(grn: GrnRecord): GrnOcrExtractedInvoice | null {
  return grn.ocrExtractedInvoices?.[0] ?? null;
}

function grnReceivedQty(grn: GrnRecord, productName: string, batchNumber?: string): number {
  if (batchNumber) {
    const batch = grn.batches.find((b) => b.batchNumber === batchNumber);
    if (batch) return batch.quantity;
  }
  return grn.items
    .filter((i) => i.productName.trim().toLowerCase() === productName.trim().toLowerCase())
    .reduce((s, i) => s + (i.receivedQty ?? 0), 0);
}

function qcQtyForLine(
  qc: QcRecord | null,
  productName: string,
  batchNumber: string | undefined,
  field: "acceptedQty" | "rejectedQty",
): number {
  if (!qc) return 0;
  const items = qc.items.filter((it) => {
    const nameMatch = it.productName.trim().toLowerCase() === productName.trim().toLowerCase();
    if (batchNumber) return nameMatch && it.batchNumber === batchNumber;
    return nameMatch;
  });
  return items.reduce((s, it) => s + (it[field] ?? 0), 0);
}

function buildComparison(
  lineId: string,
  supplierInvoiceQty: number,
  grn: GrnRecord,
  productName: string,
  batchNumber?: string,
): PurchaseInvoiceLineQtyComparison & { lineId: string } {
  const qc = getQcForGrn(grn);
  const grnReceived = grnReceivedQty(grn, productName, batchNumber);
  const qcAccepted = qcQtyForLine(qc, productName, batchNumber, "acceptedQty");
  const qcRejected = qcQtyForLine(qc, productName, batchNumber, "rejectedQty");
  const shortQty = Math.max(0, Math.round((supplierInvoiceQty - grnReceived) * 100) / 100);
  return {
    lineId,
    supplierInvoiceQty,
    grnReceivedQty: grnReceived,
    qcAcceptedQty: qcAccepted,
    qcRejectedQty: qcRejected,
    shortQty,
  };
}

function lineFromOcrItem(
  ocrLine: GrnOcrLineItem,
  idx: number,
  grn: GrnRecord,
  vendorId?: number,
): { line: PurchaseInvoiceLine; comparison: PurchaseInvoiceLineQtyComparison & { lineId: string } } {
  const lineId = `ocr-line-${idx}`;
  const matched = findProductByName(ocrLine.productName);
  const priced =
    matched && vendorId
      ? getProductsForPurchaseTransaction(vendorId).find((p) => p.id === matched.id) ?? matched
      : matched;
  const qty = ocrLine.invoiceQty;
  const rate = ocrLine.unitPrice;
  const gstPct = ocrLine.gst ?? priced?.taxPct ?? 18;
  const taxableAmt = Math.round(qty * rate * 100) / 100;
  const gstAmt = ocrLine.gstAmount ?? Math.round(taxableAmt * gstPct) / 100;
  const line: PurchaseInvoiceLine = {
    id: lineId,
    productId: priced?.id ?? null,
    productName: ocrLine.productName,
    description: priced?.hsn ? `HSN: ${priced.hsn}` : ocrLine.sku ? `SKU: ${ocrLine.sku}` : "",
    batchNumber: ocrLine.batchNumber,
    mfgDate: ocrLine.mfgDate,
    expDate: ocrLine.expDate,
    invoiceQty: qty,
    unit: priced?.unit ?? "PCS",
    unitPrice: rate,
    taxPct: gstPct,
    lineAmount: taxableAmt,
    taxAmount: gstAmt,
    debitedQty: 0,
    debitedAmount: 0,
  };
  const comparison = buildComparison(lineId, qty, grn, ocrLine.productName, ocrLine.batchNumber);
  return { line, comparison };
}

function lineFromBatch(
  batch: GrnRecord["batches"][number],
  idx: number,
  grn: GrnRecord,
  vendorId?: number,
): { line: PurchaseInvoiceLine; comparison: PurchaseInvoiceLineQtyComparison & { lineId: string } } {
  const lineId = `batch-line-${idx}`;
  const matched = findProductByName(batch.productName);
  const priced =
    matched && vendorId
      ? getProductsForPurchaseTransaction(vendorId).find((p) => p.id === matched.id) ?? matched
      : matched;
  const qty = batch.invoiceQty ?? batch.quantity;
  const rate = batch.unitPrice ?? priced?.unitPrice ?? 0;
  const gstPct = batch.gstPct ?? priced?.taxPct ?? 18;
  const taxableAmt = Math.round(qty * rate * 100) / 100;
  const gstAmt =
    batch.gstAmount ?? Math.round(taxableAmt * gstPct) / 100;
  const line: PurchaseInvoiceLine = {
    id: lineId,
    productId: matched?.id ?? null,
    productName: batch.productName,
    description: priced?.hsn ? `HSN: ${priced.hsn}` : "",
    batchNumber: batch.batchNumber,
    mfgDate: batch.mfgDate,
    expDate: batch.expDate,
    invoiceQty: qty,
    unit: priced?.unit ?? "PCS",
    unitPrice: rate,
    taxPct: gstPct,
    lineAmount: taxableAmt,
    taxAmount: gstAmt,
    debitedQty: 0,
    debitedAmount: 0,
  };
  const comparison = buildComparison(lineId, qty, grn, batch.productName, batch.batchNumber);
  return { line, comparison };
}

/** Extract supplier invoice lines from GRN OCR (primary) or batch OCR fields (fallback). */
export function extractSupplierInvoiceFromGrn(grn: GrnRecord, vendorId?: number): SupplierInvoiceFromGrn {
  const ocr = primaryOcrInvoice(grn);
  const po = resolvePoFromGrn(grn);
  const qc = getQcForGrn(grn);

  let lines: PurchaseInvoiceLine[] = [];
  let comparisons: Array<PurchaseInvoiceLineQtyComparison & { lineId: string }> = [];
  let ocrPayload: PurchaseInvoiceOcrPayload;

  if (ocr?.lineItems?.length) {
    const built = ocr.lineItems.map((item, i) => lineFromOcrItem(item, i, grn, vendorId));
    lines = built.map((b) => b.line);
    comparisons = built.map((b) => b.comparison);
    ocrPayload = {
      source: "ocr",
      confidence: ocr.confidenceScore,
      extractedAt: ocr.extractedAt,
      lineItems: ocr.lineItems.map((l) => ({
        description: l.productName,
        qty: l.invoiceQty,
        rate: l.unitPrice,
        amount: l.totalAmount,
        hsn: l.sku,
      })),
    };
  } else if (grn.batches.length > 0) {
    const built = grn.batches.map((b, i) => lineFromBatch(b, i, grn, vendorId));
    lines = built.map((b) => b.line);
    comparisons = built.map((b) => b.comparison);
    ocrPayload = {
      source: "ocr",
      extractedAt: grn.grnDate,
      lineItems: lines.map((l) => ({
        description: l.productName,
        qty: l.invoiceQty,
        rate: l.unitPrice,
        amount: l.lineAmount + l.taxAmount,
      })),
    };
  } else {
    const built = grn.items.map((item, i) => {
      const lineId = `grn-item-${i}`;
      const matched = findProductByName(item.productName);
      const priced =
        matched && vendorId
          ? getProductsForPurchaseTransaction(vendorId).find((p) => p.id === matched.id) ?? matched
          : matched;
      const qty = item.receivedQty;
      const rate = priced?.unitPrice ?? 0;
      const gstPct = priced?.taxPct ?? 18;
      const taxableAmt = Math.round(qty * rate * 100) / 100;
      const gstAmt = Math.round(taxableAmt * gstPct) / 100;
      const line: PurchaseInvoiceLine = {
        id: lineId,
        productId: priced?.id ?? null,
        productName: item.productName,
        description: priced?.hsn ? `HSN: ${priced.hsn}` : "",
        batchNumber: item.batchNumber,
        mfgDate: item.mfgDate,
        expDate: item.expDate,
        invoiceQty: qty,
        unit: item.unit ?? priced?.unit ?? "PCS",
        unitPrice: rate,
        taxPct: gstPct,
        lineAmount: taxableAmt,
        taxAmount: gstAmt,
        debitedQty: 0,
        debitedAmount: 0,
      };
      const comparison = buildComparison(lineId, qty, grn, item.productName, item.batchNumber);
      return { line, comparison };
    });
    lines = built.map((b) => b.line);
    comparisons = built.map((b) => b.comparison);
    ocrPayload = { source: "manual", extractedAt: grn.grnDate };
  }

  const vendorInvoiceNo =
    ocr?.invoiceNumber ?? grn.invoiceNumber ?? "";
  const invoiceDate =
    ocr?.invoiceDate ?? grn.invoiceDate ?? new Date().toISOString().slice(0, 10);

  const hasQuantityMismatch = detectQuantityMismatch(comparisons);

  return {
    vendorInvoiceNo,
    invoiceDate,
    supplierInvoiceId: ocr?.invoiceId ?? null,
    ocrPayload,
    lines: lines.map((l) => {
      const comp = comparisons.find((c) => c.lineId === l.id);
      return comp ? { ...l, qtyComparison: comp } : l;
    }),
    comparisons,
    hasQuantityMismatch,
    poId: po.poId,
    poNumber: po.poNumber,
    poDate: po.poDate,
    qcId: qc?.id ?? null,
    qcNo: qc?.qcNo ?? "",
  };
}

export function detectQuantityMismatch(
  comparisons: PurchaseInvoiceLineQtyComparison[],
): boolean {
  return comparisons.some(
    (c) =>
      Math.abs(c.supplierInvoiceQty - c.grnReceivedQty) > 0.001 ||
      c.qcRejectedQty > 0,
  );
}

export function computeMatchStatusFromComparisons(
  comparisons: PurchaseInvoiceLineQtyComparison[],
): PurchaseInvoiceMatchStatus {
  return detectQuantityMismatch(comparisons) ? "quantity_mismatch" : "matched";
}

/** Resolve live status — checks linked debit note post state. */
export function resolvePurchaseInvoiceMatchStatus(
  rec: PurchaseInvoiceRecord,
): PurchaseInvoiceMatchStatus {
  if (rec.pendingDebitNoteId) {
    try {
      const { loadDebitNotes } = require("@/app/(app)/accounts/debit-notes/debit-notes-data");
      const dn = (loadDebitNotes() as Array<{ id: number; status: string }>).find(
        (d) => d.id === rec.pendingDebitNoteId,
      );
      if (dn && ["posted", "approved", "processed"].includes(dn.status)) {
        return "debit_note_posted";
      }
      return "debit_note_pending";
    } catch {
      return rec.invoiceMatchStatus ?? "debit_note_pending";
    }
  }
  if (rec.hasQuantityMismatch) return "quantity_mismatch";
  return rec.invoiceMatchStatus ?? "matched";
}

export function buildQuantityComparisonsForInvoice(
  rec: PurchaseInvoiceRecord,
): PurchaseInvoiceLineQtyComparison[] {
  if (rec.lineItems.some((l) => l.qtyComparison)) {
    return rec.lineItems.map(
      (l) =>
        l.qtyComparison ?? {
          supplierInvoiceQty: l.invoiceQty,
          grnReceivedQty: 0,
          qcAcceptedQty: 0,
          qcRejectedQty: 0,
          shortQty: 0,
        },
    );
  }
  if (!rec.grnId) {
    return rec.lineItems.map((l) => ({
      supplierInvoiceQty: l.invoiceQty,
      grnReceivedQty: l.invoiceQty,
      qcAcceptedQty: l.invoiceQty,
      qcRejectedQty: 0,
      shortQty: 0,
    }));
  }
  try {
    const { getGrnRecords } = require("@/app/(app)/warehouse/grn/mock-data");
    const grn = (getGrnRecords() as GrnRecord[]).find((g) => g.id === rec.grnId);
    if (!grn) {
      return rec.lineItems.map((l) => ({
        supplierInvoiceQty: l.invoiceQty,
        grnReceivedQty: 0,
        qcAcceptedQty: 0,
        qcRejectedQty: 0,
        shortQty: 0,
      }));
    }
    return rec.lineItems.map((l) =>
      buildComparison(l.id, l.invoiceQty, grn, l.productName, l.batchNumber),
    );
  } catch {
    return [];
  }
}

/** Create a draft debit note (no posting) when quantity mismatch is detected. */
export function createPendingDebitNoteForMismatch(
  invoice: PurchaseInvoiceRecord,
): { id: number; debitNoteNo: string } | null {
  const comparisons = buildQuantityComparisonsForInvoice(invoice);
  if (!detectQuantityMismatch(comparisons)) return null;

  const {
    createDebitNote,
    normalizeDebitLine,
    calcDebitFromQty,
  } = require("@/app/(app)/accounts/debit-notes/debit-notes-data");

  const debitLines = invoice.lineItems
    .map((line, idx) => {
      const comp = line.qtyComparison ?? comparisons[idx];
      if (!comp || (comp.shortQty <= 0 && comp.qcRejectedQty <= 0)) return null;
      const returnQty = comp.shortQty + comp.qcRejectedQty;
      const lineTotal = line.lineAmount + line.taxAmount;
      const debitAmount = calcDebitFromQty({
        returnQty,
        invoiceQty: line.invoiceQty,
        unitPrice: line.unitPrice,
        discountPct: 0,
        taxPct: line.taxPct,
        lineAmount: lineTotal,
      });
      if (returnQty <= 0) return null;
      return normalizeDebitLine({
        id: `dnl-pending-${line.id}`,
        sourceLineId: line.id,
        productName: line.productName,
        batchNo: line.batchNumber ?? "",
        invoiceQty: line.invoiceQty,
        eligibleReturnQty: returnQty,
        uom: line.unit,
        unitPrice: line.unitPrice,
        taxPct: line.taxPct,
        gstAmount: line.taxAmount,
        lineAmount: lineTotal,
        returnQty,
        debitAmount,
        lineRemarks: `Short: ${comp.shortQty}, QC Rejected: ${comp.qcRejectedQty}`,
      });
    })
    .filter(Boolean);

  if (!debitLines.length) return null;

  const rec = createDebitNote({
    debitNoteDate: todayStr(),
    againstType: "purchase_invoice",
    vendorId: invoice.vendorId,
    vendorName: invoice.vendorName,
    sourceInvoiceId: invoice.id,
    sourceInvoiceNo: invoice.invoiceNo,
    sourcePoId: invoice.poId,
    sourcePoNo: invoice.poNumber,
    sourceGrnNo: invoice.grnNo,
    sourceQcNo: invoice.qcNo ?? "",
    originalAmount: invoice.grandTotal,
    alreadyAdjustedAmount: 0,
    standaloneDebitAmount: 0,
    lineItems: debitLines,
    reason: "Purchase Return Adjustment",
    remarks:
      "Pending Confirmation — auto-created from quantity mismatch on purchase invoice. No accounting entry posted. Review and Post or Cancel in Debit Note module.",
    attachments: [],
    status: "draft",
    warehouse: invoice.warehouse,
    bankAccountId: invoice.bankAccountId ?? null,
  });

  return { id: rec.id, debitNoteNo: rec.debitNoteNo };
}

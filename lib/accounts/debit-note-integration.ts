/**
 * Auto-generate debit notes from purchase returns.
 */

import { invalidateAccountsDataCache } from "@/lib/accounts/accounts-data-service";
import type { PurchaseReturn } from "@/app/(app)/procurement/purchase-returns/purchase-return-data";
import {
  approveDebitNote,
  buildReferenceFromPurchaseInvoice,
  createDebitNote,
  findPurchaseInvoiceForPO,
  getDebitNoteById,
  loadDebitNotes,
  normalizeDebitLine,
  type DebitNoteRecord,
  type DebitNoteSource,
} from "@/app/(app)/accounts/debit-notes/debit-notes-data";

export function buildDebitNoteInputFromPurchaseReturn(
  ret: PurchaseReturn,
  sourceInvoiceId: number,
): Parameters<typeof createDebitNote>[0] | null {
  const preview = buildReferenceFromPurchaseInvoice(sourceInvoiceId);
  if (!preview) return null;

  const lines = ret.items
    .filter((item) => item.returnQty > 0)
    .map((item) => {
      const baseLine =
        preview.lineItems.find((l) => l.sourceLineId === item.id) ??
        preview.lineItems.find(
          (l) => l.productName.trim().toLowerCase() === item.productName.trim().toLowerCase(),
        );
      const taxPct = item.cgstPct + item.sgstPct + item.igstPct;
      const debitAmount =
        item.netAmount > 0
          ? item.netAmount
          : Math.round(item.taxableValue + item.taxAmount);
      return normalizeDebitLine({
        id: baseLine?.id ?? `dnl-pr-${item.id}`,
        sourceLineId: baseLine?.sourceLineId ?? item.id,
        productName: item.productName,
        invoiceQty: baseLine?.invoiceQty ?? item.grnReceivedQty,
        uom: baseLine?.uom ?? "Unit",
        unitPrice: item.unitPrice || baseLine?.unitPrice || 0,
        discountPct: baseLine?.discountPct ?? 0,
        taxPct: taxPct || baseLine?.taxPct || 0,
        gstAmount: item.taxAmount || baseLine?.gstAmount || 0,
        lineAmount: baseLine?.lineAmount ?? debitAmount,
        returnQty: item.returnQty,
        debitAmount: debitAmount > 0 ? debitAmount : 0,
        lineRemarks: item.lineRemark || ret.overallRemarks,
      });
    })
    .filter((l) => l.debitAmount > 0);

  if (!lines.length) return null;

  return {
    debitNoteDate: ret.returnDate,
    againstType: "purchase_invoice",
    vendorId: Number(ret.supplierId),
    vendorName: ret.supplierName,
    sourceInvoiceId,
    sourceInvoiceNo: preview.sourceInvoiceNo,
    sourcePoId: Number(ret.poId),
    sourcePoNo: ret.poNumber,
    sourceGrnNo: preview.sourceGrnNo,
    sourceQcNo: preview.sourceQcNo,
    originalAmount: preview.originalAmount,
    alreadyAdjustedAmount: preview.alreadyAdjustedAmount,
    standaloneDebitAmount: 0,
    lineItems: lines,
    reason: ret.overallRemarks || "Purchase Return",
    remarks: `Auto-generated from Purchase Return ${ret.returnNumber}`,
    attachments: [],
    status: "draft",
    source: "purchase_return",
    sourceReturnId: String(ret.id),
    sourceReturnNo: ret.returnNumber,
  };
}

export function createDebitNoteFromPurchaseReturn(
  ret: PurchaseReturn,
  autoApprove = true,
): DebitNoteRecord | null {
  if (ret.debitNoteId) {
    const existing = getDebitNoteById(Number(ret.debitNoteId));
    if (existing) return existing;
  }

  const existingByReturn = loadDebitNotes().find((dn) => dn.sourceReturnNo === ret.returnNumber);
  if (existingByReturn) return existingByReturn;

  const pi = findPurchaseInvoiceForPO(Number(ret.poId));
  if (!pi) return null;

  const input = buildDebitNoteInputFromPurchaseReturn(ret, pi.id);
  if (!input) return null;

  const dn = createDebitNote(input);
  if (autoApprove) {
    const approved = approveDebitNote(dn.id);
    invalidateAccountsDataCache("debitNotes");
    invalidateAccountsDataCache("purchaseInvoices");
    return approved;
  }
  invalidateAccountsDataCache("debitNotes");
  return dn;
}

export function inferDebitNoteSource(rec: Partial<DebitNoteRecord>): DebitNoteSource {
  if (rec.source) return rec.source;
  if (rec.sourceReturnNo) return "purchase_return";
  return "manual";
}

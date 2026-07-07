/**
 * Pending debit notes — purchase returns ready/dispatched without a debit note.
 * Reads procurement + warehouse data (read-only); does not modify those modules.
 */

import { loadPurchaseReturns, type PurchaseReturn } from "@/app/(app)/procurement/purchase-returns/purchase-return-data";
import { getPackingRecords } from "@/app/(app)/warehouse/packing/mock-data";
import { getDispatchRecords } from "@/app/(app)/warehouse/dispatch/mock-data";

const DEBIT_NOTES_STORAGE_KEY = "ds_accounts_debit_notes_v3";

type DebitNoteLink = {
  sourceReturnId?: string;
  sourceReturnNo?: string;
  status: string;
  source?: string;
};

function loadDebitNoteLinks(): DebitNoteLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DEBIT_NOTES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DebitNoteLink[]) : [];
  } catch {
    return [];
  }
}

export type PendingDispatchStatus = "Ready for Dispatch" | "Dispatched";

export interface PendingDebitNoteRow {
  returnId: number;
  returnNumber: string;
  returnDate: string;
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  poId: number;
  poNumber: string;
  grnNo: string;
  packingNo: string;
  dispatchNo: string;
  dispatchStatus: PendingDispatchStatus;
  totalReturnQty: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
  totalAmount: number;
}

function firstGrnNo(ret: PurchaseReturn): string {
  const item = ret.items.find((it) => it.grnNo);
  return item?.grnNo ?? "";
}

function computeReturnAmounts(ret: PurchaseReturn): {
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
  totalAmount: number;
} {
  const summary = ret.summary;
  if (summary?.grandTotal > 0) {
    const cgst = summary.totalCgst;
    const sgst = summary.totalSgst;
    const igst = summary.totalIgst;
    const gst = cgst + sgst + igst;
    const taxable = Math.max(0, summary.grandTotal - gst);
    return {
      taxableAmount: Math.round(taxable * 100) / 100,
      cgstAmount: Math.round(cgst * 100) / 100,
      sgstAmount: Math.round(sgst * 100) / 100,
      igstAmount: Math.round(igst * 100) / 100,
      gstAmount: Math.round(gst * 100) / 100,
      totalAmount: Math.round(summary.grandTotal * 100) / 100,
    };
  }
  let taxable = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  for (const it of ret.items.filter((i) => i.returnQty > 0)) {
    taxable += it.taxableValue > 0 ? it.taxableValue : Math.max(0, it.netAmount - it.taxAmount);
    cgst += it.cgstAmount;
    sgst += it.sgstAmount;
    igst += it.igstAmount;
  }
  const gst = cgst + sgst + igst;
  return {
    taxableAmount: Math.round(taxable * 100) / 100,
    cgstAmount: Math.round(cgst * 100) / 100,
    sgstAmount: Math.round(sgst * 100) / 100,
    igstAmount: Math.round(igst * 100) / 100,
    gstAmount: Math.round(gst * 100) / 100,
    totalAmount: Math.round((taxable + gst) * 100) / 100,
  };
}

function resolveDispatchContext(returnNumber: string, returnId: number): {
  dispatchStatus: PendingDispatchStatus | null;
  packingNo: string;
  dispatchNo: string;
} {
  const packingId = `pret-pkg-${returnId}`;
  const packing = getPackingRecords().find(
    (p) =>
      p.id === packingId ||
      p.sourceDocumentNo === returnNumber ||
      p.salesOrderNo === returnNumber,
  );

  const dispatch = getDispatchRecords().find((d) => {
    if (d.source_type !== "purchase_return" && d.sourceDocumentType !== "Purchase Return") {
      return false;
    }
    const docNos = (d.source_document_no || d.salesOrderNumber || "")
      .split(",")
      .map((s) => s.trim());
    return docNos.includes(returnNumber);
  });

  if (packing?.status === "Dispatched" || dispatch) {
    return {
      dispatchStatus: "Dispatched",
      packingNo: packing?.packingNo ?? "",
      dispatchNo: dispatch?.dispatchNumber ?? dispatch?.dispatch_no ?? "",
    };
  }
  if (packing?.status === "Packed") {
    return {
      dispatchStatus: "Ready for Dispatch",
      packingNo: packing.packingNo ?? "",
      dispatchNo: "",
    };
  }
  return { dispatchStatus: null, packingNo: "", dispatchNo: "" };
}

function inferDispatchStatusFromReturn(
  ret: PurchaseReturn,
  packingStatus: PendingDispatchStatus | null,
): PendingDispatchStatus | null {
  if (packingStatus) return packingStatus;
  if (ret.status === "returned") return "Dispatched";
  if (ret.status === "issued_for_packing") return "Ready for Dispatch";
  return null;
}

export function hasDebitNoteForReturn(ret: PurchaseReturn): boolean {
  if (ret.debitNoteId) return true;
  const notes = loadDebitNoteLinks();
  return notes.some(
    (dn) =>
      dn.status !== "cancelled" &&
      (dn.sourceReturnId === String(ret.id) ||
        dn.sourceReturnNo === ret.returnNumber ||
        (dn.source === "purchase_return" && dn.sourceReturnNo === ret.returnNumber)),
  );
}

export function listPendingDebitNoteReturns(): PendingDebitNoteRow[] {
  const returns = loadPurchaseReturns().filter((r) => {
    if (r.status === "draft" || r.status === "submitted") return false;
    if (hasDebitNoteForReturn(r)) return false;
    if (r.totalReturnQty <= 0 && !r.items.some((it) => it.returnQty > 0)) return false;
    return true;
  });

  const rows: PendingDebitNoteRow[] = [];

  for (const ret of returns) {
    const ctx = resolveDispatchContext(ret.returnNumber, ret.id);
    const dispatchStatus = inferDispatchStatusFromReturn(ret, ctx.dispatchStatus);
    if (!dispatchStatus) continue;

    const amounts = computeReturnAmounts(ret);
    rows.push({
      returnId: ret.id,
      returnNumber: ret.returnNumber,
      returnDate: ret.returnDate,
      supplierId: ret.supplierId,
      supplierName: ret.supplierName,
      supplierCode: ret.supplierCode,
      poId: ret.poId,
      poNumber: ret.poNumber,
      grnNo: firstGrnNo(ret),
      packingNo: ctx.packingNo,
      dispatchNo: ctx.dispatchNo,
      dispatchStatus,
      totalReturnQty: ret.totalReturnQty,
      ...amounts,
    });
  }

  return rows.sort((a, b) => b.returnDate.localeCompare(a.returnDate));
}

export function filterPendingDebitNotes(
  rows: PendingDebitNoteRow[],
  search: string,
  dispatchStatus: string,
): PendingDebitNoteRow[] {
  let r = rows;
  if (dispatchStatus && dispatchStatus !== "all") {
    r = r.filter((x) => x.dispatchStatus === dispatchStatus);
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    r = r.filter(
      (x) =>
        x.returnNumber.toLowerCase().includes(q) ||
        x.supplierName.toLowerCase().includes(q) ||
        x.poNumber.toLowerCase().includes(q) ||
        x.grnNo.toLowerCase().includes(q) ||
        x.dispatchNo.toLowerCase().includes(q),
    );
  }
  return r;
}

import { listPurchaseInvoicesByPO } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import {
  computeThreeWayMatch,
  THREE_WAY_MATCH_LABELS,
  type ThreeWayMatchResult,
  type ThreeWayMatchStatus,
} from "@/lib/erp/three-way-match";
import type { PurchaseOrder } from "./purchase-orders/po-data";

export type { ThreeWayMatchResult, ThreeWayMatchStatus };
export { computeThreeWayMatch, THREE_WAY_MATCH_LABELS, getThreeWayMatchForPOId, getThreeWayMatchForPurchase } from "@/lib/erp/three-way-match";

export type POInvoiceDisplayStatus = "pending" | "uploaded";
export type POGrnDisplayStatus = "grn_pending" | "grn_created" | "qc_pending" | "qc_completed";
/** @deprecated Use ThreeWayMatchStatus */
export type POThreeWayMatchStatus = ThreeWayMatchStatus;

export interface PODebitNoteRef {
  debitNoteNo: string;
  debitAmount: number;
  reason: string;
  status: string;
}

export interface POWorkflowSummary {
  invoiceStatus: POInvoiceDisplayStatus;
  invoiceCount: number;
  totalInvoiceAmount: number;
  grnStatus: POGrnDisplayStatus;
  grnReceivedQty: number;
  poOrderedQty: number;
  matchStatus: ThreeWayMatchStatus;
  threeWayMatch: ThreeWayMatchResult;
  poAmount: number;
  grnRecordNos: string[];
  qcRecordNos: string[];
  debitNotes: PODebitNoteRef[];
}

export const INVOICE_STATUS_CFG: Record<POInvoiceDisplayStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  uploaded: { label: "Invoice Uploaded", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

export const GRN_STATUS_CFG: Record<POGrnDisplayStatus, { label: string; bg: string; text: string; dot: string }> = {
  grn_pending: { label: "GRN Pending", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  grn_created: { label: "GRN Created", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  qc_pending: { label: "QC Pending", bg: "bg-violet-50", text: "text-violet-700", dot: "bg-violet-500" },
  qc_completed: { label: "QC Completed", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
};

export const MATCH_STATUS_CFG: Record<ThreeWayMatchStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  matched: { label: "Matched", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  partial_match: { label: "Partial Match", bg: "bg-amber-50", text: "text-amber-800", dot: "bg-amber-500" },
  mismatch: { label: "Mismatch", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
};

export function getPOWorkflowSummary(po: PurchaseOrder): POWorkflowSummary {
  const threeWayMatch = computeThreeWayMatch(po);
  const invoices = listPurchaseInvoicesByPO(Number(po.id));
  const invoiceStatus: POInvoiceDisplayStatus = invoices.length > 0 ? "uploaded" : "pending";
  const totalInvoiceAmount = invoices.reduce((s, i) => s + i.grandTotal, 0);

  const grnReceivedQty = po.lines.reduce((s, l) => s + (l.receivedQty ?? 0), 0);
  const grnStatus: POGrnDisplayStatus =
    threeWayMatch.grnNos.length > 0
      ? threeWayMatch.qcNos.length > 0
        ? "qc_completed"
        : "grn_created"
      : grnReceivedQty > 0
        ? "grn_created"
        : "grn_pending";

  const debitNotes: PODebitNoteRef[] = loadDebitNotes()
    .filter((d) => d.sourcePoId === Number(po.id) || d.sourcePoNo === po.poNumber)
    .map((d) => ({
      debitNoteNo: d.debitNoteNo,
      debitAmount: d.currentDebitAmount,
      reason: d.reason || d.remarks || "—",
      status: d.status,
    }));

  return {
    invoiceStatus,
    invoiceCount: invoices.length,
    totalInvoiceAmount,
    grnStatus,
    grnReceivedQty,
    poOrderedQty: po.lines.reduce((s, l) => s + l.orderedQty, 0),
    matchStatus: threeWayMatch.status,
    threeWayMatch,
    poAmount: po.summary.grandTotal,
    grnRecordNos: threeWayMatch.grnNos,
    qcRecordNos: threeWayMatch.qcNos,
    debitNotes,
  };
}

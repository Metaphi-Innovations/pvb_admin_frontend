/**
 * Shared ERP integration: PO ↔ GRN ↔ QC ↔ Supplier Invoice (Accounts Purchase).
 * Used by Procurement, Warehouse (reference), and Accounts modules.
 */
import { listPurchaseInvoicesByPO, type PurchaseInvoiceRecord } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { getPOById, type PurchaseOrder, type POLineItem } from "@/app/(app)/procurement/purchase-orders/po-data";
import { getGrnRecords } from "@/app/(app)/warehouse/grn/mock-data";
import type { GrnRecord } from "@/app/(app)/warehouse/grn/types";
import { getQcRecords } from "@/app/(app)/warehouse/qc/mock-data";
import type { QcRecord } from "@/app/(app)/warehouse/qc/types";

export type ThreeWayMatchStatus = "pending" | "matched" | "partial_match" | "mismatch";

export type ThreeWayMismatchReason =
  | "QUANTITY MISMATCH"
  | "RATE MISMATCH"
  | "AMOUNT MISMATCH"
  | "GST MISMATCH"
  | null;

export interface ThreeWayMatchLine {
  productCode: string;
  productName: string;
  poQty: number;
  grnQty: number;
  qcAcceptedQty: number;
  qcRejectedQty: number;
  invoiceQty: number;
  poRate: number;
  invoiceRate: number;
  poAmount: number;
  invoiceAmount: number;
  lineStatus: ThreeWayMatchStatus;
  mismatchReason: ThreeWayMismatchReason;
}

export interface ThreeWayMatchResult {
  status: ThreeWayMatchStatus;
  /** PO approved + invoice uploaded + GRN created + QC completed */
  matchReady: boolean;
  poApproved: boolean;
  invoiceUploaded: boolean;
  grnCreated: boolean;
  grnCompleted: boolean;
  qcCompleted: boolean;
  lines: ThreeWayMatchLine[];
  poTotalQty: number;
  grnTotalQty: number;
  qcAcceptedTotalQty: number;
  qcRejectedTotalQty: number;
  invoiceTotalQty: number;
  poTotalAmount: number;
  invoiceTotalAmount: number;
  grnNos: string[];
  qcNos: string[];
  vendorInvoiceNo: string | null;
}

export const THREE_WAY_MATCH_LABELS: Record<ThreeWayMatchStatus, string> = {
  pending: "Pending",
  matched: "Matched",
  partial_match: "Partial Match",
  mismatch: "Mismatch",
};

export const THREE_WAY_MISMATCH_LABELS: Record<Exclude<ThreeWayMismatchReason, null>, string> = {
  "QUANTITY MISMATCH": "Quantity Mismatch",
  "RATE MISMATCH": "Rate Mismatch",
  "AMOUNT MISMATCH": "Amount Mismatch",
  "GST MISMATCH": "GST Mismatch",
};

const AMOUNT_TOLERANCE = 1;
const QTY_TOLERANCE = 0.01;

const PO_APPROVED_STATUSES: PurchaseOrder["status"][] = [
  "approved",
  "invoice_uploaded",
  "closed",
  "short_closed",
];

function sumGrnReceived(grns: GrnRecord[], productCode: string): number {
  let total = 0;
  for (const g of grns) {
    for (const it of g.items) {
      if (it.productCode === productCode) total += it.receivedQty ?? 0;
    }
  }
  return total;
}

function sumQcForProduct(
  qcs: QcRecord[],
  productCode: string,
  field: "acceptedQty" | "rejectedQty",
): number {
  let total = 0;
  for (const qc of qcs) {
    for (const it of qc.items) {
      const grn = getGrnRecords().find((g) => g.grnNo === qc.grnNo);
      const grnItem = grn?.items.find((gi) => gi.productName === it.productName);
      if (grnItem?.productCode === productCode) {
        total += it[field] ?? 0;
      }
    }
  }
  return total;
}

function invoiceLineForProduct(inv: PurchaseInvoiceRecord | null, line: POLineItem) {
  if (!inv) return { qty: 0, rate: 0, amount: 0 };
  const match = inv.lineItems.find(
    (l) => l.productName === line.productName || String(l.productId) === String(line.productId),
  );
  if (!match) {
    return {
      qty: 0,
      rate: line.unitPrice,
      amount: 0,
    };
  }
  return {
    qty: match.invoiceQty,
    rate: match.unitPrice,
    amount: match.lineAmount + match.taxAmount,
  };
}

function grnCompletedForPO(grns: GrnRecord[]): boolean {
  return grns.length > 0 && grns.every((g) => g.status === "qc_completed");
}

function qcCompletedForGrns(grns: GrnRecord[], qcs: QcRecord[]): boolean {
  if (grns.length === 0) return false;
  return grns.every((g) => {
    const qc = qcs.find((q) => q.grnNo === g.grnNo);
    return qc?.status === "completed";
  });
}

export function deriveMismatchReason(
  line: Pick<
    ThreeWayMatchLine,
    "poQty" | "grnQty" | "invoiceQty" | "poRate" | "invoiceRate" | "poAmount" | "invoiceAmount"
  >,
): ThreeWayMismatchReason {
  const qtyMismatch =
    Math.abs(line.poQty - line.grnQty) > QTY_TOLERANCE ||
    Math.abs(line.grnQty - line.invoiceQty) > QTY_TOLERANCE ||
    Math.abs(line.poQty - line.invoiceQty) > QTY_TOLERANCE;
  const rateMismatch = Math.abs(line.poRate - line.invoiceRate) >= 0.01;
  const amountMismatch = Math.abs(line.poAmount - line.invoiceAmount) > AMOUNT_TOLERANCE;

  if (qtyMismatch) return "QUANTITY MISMATCH";
  if (rateMismatch) return "RATE MISMATCH";
  if (amountMismatch) return "AMOUNT MISMATCH";
  return null;
}

export function computeLineMatchStatus(
  line: Pick<
    ThreeWayMatchLine,
    "poQty" | "grnQty" | "qcAcceptedQty" | "invoiceQty" | "poRate" | "invoiceRate" | "poAmount" | "invoiceAmount"
  >,
  matchReady: boolean,
): ThreeWayMatchStatus {
  if (!matchReady) return "pending";

  const qtyMatch =
    Math.abs(line.poQty - line.grnQty) <= QTY_TOLERANCE &&
    Math.abs(line.grnQty - line.qcAcceptedQty) <= QTY_TOLERANCE &&
    Math.abs(line.poQty - line.invoiceQty) <= QTY_TOLERANCE;
  const rateMatch = Math.abs(line.poRate - line.invoiceRate) < 0.01;
  const amountMatch = Math.abs(line.poAmount - line.invoiceAmount) <= AMOUNT_TOLERANCE;

  if (qtyMatch && rateMatch && amountMatch) return "matched";

  const partialQty =
    line.poQty > 0 &&
    (Math.abs(line.poQty - line.grnQty) <= QTY_TOLERANCE ||
      Math.abs(line.poQty - line.invoiceQty) <= QTY_TOLERANCE);
  const partialRate = line.poRate > 0 && rateMatch;

  if ((partialQty || partialRate) && !(qtyMatch && rateMatch && amountMatch)) {
    return "partial_match";
  }

  return "mismatch";
}

export function computeThreeWayMatch(po: PurchaseOrder): ThreeWayMatchResult {
  const invoices = listPurchaseInvoicesByPO(po.id);
  const invoice = invoices.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  const grns = getGrnRecords().filter((g) => g.poNumber === po.poNumber);
  const grnNos = grns.map((g) => g.grnNo);
  const qcs = getQcRecords().filter((q) => grnNos.includes(q.grnNo));
  const qcNos = qcs.map((q) => q.qcNo);

  const poApproved = PO_APPROVED_STATUSES.includes(po.status);
  const invoiceUploaded = !!invoice;
  const grnCreated = grns.length > 0;
  const grnCompleted = grnCompletedForPO(grns);
  const qcCompleted = qcCompletedForGrns(grns, qcs);
  const matchReady = poApproved && invoiceUploaded && grnCreated && qcCompleted;

  const rawLines = po.lines.map((line) => {
    const grnQty = sumGrnReceived(grns, line.productCode);
    const qcAcceptedQty = sumQcForProduct(qcs, line.productCode, "acceptedQty");
    const qcRejectedQty = sumQcForProduct(qcs, line.productCode, "rejectedQty");
    const invLine = invoiceLineForProduct(invoice, line);
    return {
      productCode: line.productCode,
      productName: line.productName,
      poQty: line.orderedQty,
      grnQty,
      qcAcceptedQty,
      qcRejectedQty,
      invoiceQty: invLine.qty,
      poRate: line.unitPrice,
      invoiceRate: invLine.rate,
      poAmount: line.netAmount,
      invoiceAmount: invLine.amount,
    };
  });

  const lines: ThreeWayMatchLine[] = rawLines.map((l) => {
    const lineStatus = computeLineMatchStatus(l, matchReady);
    return {
      ...l,
      lineStatus,
      mismatchReason:
        lineStatus === "mismatch" || lineStatus === "partial_match"
          ? deriveMismatchReason(l)
          : null,
    };
  });

  const poTotalQty = lines.reduce((s, l) => s + l.poQty, 0);
  const grnTotalQty = lines.reduce((s, l) => s + l.grnQty, 0);
  const qcAcceptedTotalQty = lines.reduce((s, l) => s + l.qcAcceptedQty, 0);
  const qcRejectedTotalQty = lines.reduce((s, l) => s + l.qcRejectedQty, 0);
  const invoiceTotalQty = lines.reduce((s, l) => s + l.invoiceQty, 0);
  const poTotalAmount = po.summary.grandTotal;
  const invoiceTotalAmount = invoice?.grandTotal ?? 0;

  let status: ThreeWayMatchStatus = "pending";
  if (matchReady) {
    const lineStatuses = lines.map((l) => l.lineStatus);
    const amountOk = Math.abs(poTotalAmount - invoiceTotalAmount) <= AMOUNT_TOLERANCE;
    const allMatched = lineStatuses.every((s) => s === "matched") && amountOk;
    const allMismatch = lineStatuses.every((s) => s === "mismatch") && !amountOk;

    if (allMatched) {
      status = "matched";
    } else if (allMismatch) {
      status = "mismatch";
    } else if (lineStatuses.some((s) => s === "matched" || s === "partial_match")) {
      status = "partial_match";
    } else {
      status = "mismatch";
    }
  }

  return {
    status,
    matchReady,
    poApproved,
    invoiceUploaded,
    grnCreated,
    grnCompleted,
    qcCompleted,
    lines,
    poTotalQty,
    grnTotalQty,
    qcAcceptedTotalQty,
    qcRejectedTotalQty,
    invoiceTotalQty,
    poTotalAmount,
    invoiceTotalAmount,
    grnNos,
    qcNos,
    vendorInvoiceNo: invoice?.vendorInvoiceNo ?? null,
  };
}

export function getThreeWayMatchForPOId(poId: number): ThreeWayMatchResult | null {
  const po = getPOById(poId);
  if (!po) return null;
  return computeThreeWayMatch(po);
}

export function getThreeWayMatchForPurchase(purchase: PurchaseInvoiceRecord): ThreeWayMatchResult | null {
  if (!purchase.poId) return null;
  return getThreeWayMatchForPOId(purchase.poId);
}

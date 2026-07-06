import { getGrnRecords } from "@/app/(app)/warehouse/grn/mock-data";
import type { PurchaseOrder, POLineItem, POStatus } from "./po-data";

export type ShortCloseReason =
  | "vendor_unable_to_supply"
  | "requirement_reduced"
  | "alternate_vendor_used"
  | "product_discontinued"
  | "management_decision"
  | "other";

export const SHORT_CLOSE_REASONS: { value: ShortCloseReason; label: string }[] = [
  { value: "vendor_unable_to_supply", label: "Supplier Unable to Supply" },
  { value: "requirement_reduced", label: "Requirement Reduced" },
  { value: "alternate_vendor_used", label: "Alternate Supplier Used" },
  { value: "product_discontinued", label: "Product Discontinued" },
  { value: "management_decision", label: "Management Decision" },
  { value: "other", label: "Other" },
];

export function shortCloseReasonLabel(reason: ShortCloseReason): string {
  return SHORT_CLOSE_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

export interface POShortCloseInfo {
  closeType: "short_close";
  quantity: number;
  reason: ShortCloseReason;
  remarks: string;
  shortClosedBy: string;
  shortClosedDate: string;
  shortClosedTime: string;
}

export interface POQtySummary {
  orderedQty: number;
  receivedQty: number;
  shortClosedQty: number;
  pendingQty: number;
}

export function getLineReceivedQty(po: PurchaseOrder, line: POLineItem): number {
  // API-backed lines carry received_qty on the product row.
  if (line.purchaseOrderProductId && line.receivedQty != null) {
    return line.receivedQty;
  }
  const grns = getGrnRecords().filter((g) => g.poNumber === po.poNumber);
  let fromGrn = 0;
  for (const g of grns) {
    for (const it of g.items) {
      if (it.productCode === line.productCode) {
        fromGrn += it.receivedQty ?? 0;
      }
    }
  }
  if (fromGrn > 0) return fromGrn;
  return line.receivedQty ?? 0;
}

export function getLinePendingQty(po: PurchaseOrder, line: POLineItem): number {
  const received = getLineReceivedQty(po, line);
  const shortClosed = line.shortClosedQty ?? 0;
  return Math.max(0, line.orderedQty - received - shortClosed);
}

export function getPOQtySummary(po: PurchaseOrder): POQtySummary {
  const orderedQty = po.lines.reduce((s, l) => s + l.orderedQty, 0);
  const receivedQty = po.lines.reduce((s, l) => s + getLineReceivedQty(po, l), 0);
  const shortClosedQty = po.lines.reduce((s, l) => s + (l.shortClosedQty ?? 0), 0);
  const pendingQty = Math.max(0, orderedQty - receivedQty - shortClosedQty);
  return { orderedQty, receivedQty, shortClosedQty, pendingQty };
}

export function canShortClosePO(po: PurchaseOrder): boolean {
  if (!["approved", "invoice_uploaded", "partially_received", "received"].includes(po.status)) {
    return false;
  }
  return getPOQtySummary(po).pendingQty > 0;
}

function allocateShortCloseQty(
  po: PurchaseOrder,
  lines: POLineItem[],
  quantity: number,
): POLineItem[] {
  let remaining = quantity;
  return lines.map((line) => {
    const linePending = getLinePendingQty(po, line);
    const add = Math.min(linePending, remaining);
    remaining -= add;
    if (add <= 0) return line;
    return { ...line, shortClosedQty: (line.shortClosedQty ?? 0) + add };
  });
}

export function shortClosePO(
  po: PurchaseOrder,
  input: { quantity: number; reason: ShortCloseReason; remarks: string; by: string },
): PurchaseOrder {
  const summary = getPOQtySummary(po);
  const qty = Math.floor(input.quantity);
  if (qty < 1 || qty > summary.pendingQty) {
    throw new Error("Invalid short close quantity");
  }
  if (!input.remarks.trim()) {
    throw new Error("Remarks are required");
  }

  const now = new Date();
  const shortClosedDate = now.toISOString().slice(0, 10);
  const shortClosedTime = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const lines = allocateShortCloseQty(po, po.lines, qty);
  const after = getPOQtySummary({ ...po, lines });
  const status: POStatus = after.pendingQty === 0 ? "short_closed" : po.status;
  const reasonLabel = shortCloseReasonLabel(input.reason);

  const shortClose: POShortCloseInfo = {
    closeType: "short_close",
    quantity: qty,
    reason: input.reason,
    remarks: input.remarks.trim(),
    shortClosedBy: input.by,
    shortClosedDate,
    shortClosedTime,
  };

  return {
    ...po,
    lines,
    status,
    shortClose,
    updatedBy: input.by,
    updatedDate: shortClosedDate,
    activity: [
      ...po.activity,
      {
        date: shortClosedDate,
        action: "PO Short Closed",
        by: input.by,
        note: `Short Closed Qty: ${qty}. Reason: ${reasonLabel}. ${input.remarks.trim()}`,
      },
    ],
  };
}

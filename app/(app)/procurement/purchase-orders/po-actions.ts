import type { PurchaseOrder, POStatus } from "./po-data";
import { getPOQtySummary } from "./po-qty";
import type { POListStatus } from "@/lib/procurement/po-status";

/** Statuses where Short Close may still be offered (pending qty must also be > 0). */
export const SHORT_CLOSE_ELIGIBLE_STATUSES: POListStatus[] = [
  "approved",
  "invoice_uploaded",
  "partially_received",
];

/** Post-approval statuses that can be Closed (not Cancelled). */
export const CLOSE_ELIGIBLE_STATUSES: POListStatus[] = [
  "approved",
  "invoice_uploaded",
  "partially_received",
  "received",
];

/** Pre-fulfillment statuses that can be Cancelled (not Closed). */
export const CANCEL_ELIGIBLE_STATUSES: POListStatus[] = [
  "draft",
  "pending_approval",
  "rejected",
];

/**
 * Statuses where Purchase Return may be offered (remaining returnable qty must also be > 0).
 * Excludes draft / terminal statuses — returns require QC-rejected stock against the PO.
 */
export const PURCHASE_RETURN_ELIGIBLE_STATUSES: POListStatus[] = [
  "approved",
  "invoice_uploaded",
  "partially_received",
  "received",
];

export function canShortClosePOStatus(status: POListStatus | POStatus): boolean {
  return SHORT_CLOSE_ELIGIBLE_STATUSES.includes(status as POListStatus);
}

export function canClosePOStatus(status: POListStatus | POStatus): boolean {
  return CLOSE_ELIGIBLE_STATUSES.includes(status as POListStatus);
}

export function canCancelPOStatus(status: POListStatus | POStatus): boolean {
  return CANCEL_ELIGIBLE_STATUSES.includes(status as POListStatus);
}

export function canCreatePurchaseReturnPOStatus(
  status: POListStatus | POStatus,
): boolean {
  return PURCHASE_RETURN_ELIGIBLE_STATUSES.includes(status as POListStatus);
}

/**
 * Short Close when the PO still has unreceived qty and is not terminal / fully received.
 * Uses ordered vs received/GRN qty (via line received fields), not status alone.
 */
export function canShortClosePO(po: PurchaseOrder): boolean {
  if (!canShortClosePOStatus(po.status)) return false;
  if (po.status === "short_closed" || po.status === "closed" || po.status === "cancelled") {
    return false;
  }
  return getPOQtySummary(po).pendingQty > 0;
}

export function canClosePO(po: PurchaseOrder): boolean {
  return canClosePOStatus(po.status);
}

export function canCancelPO(po: PurchaseOrder): boolean {
  return canCancelPOStatus(po.status);
}

/**
 * Purchase Return when status allows it and rejected stock still remains returnable.
 * `hasReturnableQty` comes from BE (eligible-items pool); missing flag = not eligible.
 */
export function canCreatePurchaseReturnPO(
  po: Pick<PurchaseOrder, "status"> & { hasReturnableQty?: boolean },
): boolean {
  if (!canCreatePurchaseReturnPOStatus(po.status)) return false;
  return po.hasReturnableQty === true;
}

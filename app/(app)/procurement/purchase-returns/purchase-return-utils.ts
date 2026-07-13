import type { PurchaseReturn, PurchaseReturnItem } from "./purchase-return-data";

export const PURCHASE_RETURN_LIST_HREF = "/procurement/purchase-orders?tab=po_return";

export function purchaseReturnListHref(): string {
  return PURCHASE_RETURN_LIST_HREF;
}

/** Statuses that allow modifying lines / quantities on the Edit page. */
const EDITABLE_RETURN_STATUSES = new Set([
  "Draft",
  "draft",
  "PO_return",
  "issued_for_packing", // Ready for Packing (legacy / packing-queue status)
]);

/** Packed / completed — show read-only on Edit; no quantity/product changes. */
const LOCKED_RETURN_STATUSES = new Set([
  "Dispatched",
  "Received_By_Supplier",
  "Cancelled",
  "returned",
]);

export function canEditPurchaseReturn(record: PurchaseReturn): boolean {
  return EDITABLE_RETURN_STATUSES.has(record.status);
}

export function isPurchaseReturnLocked(record: PurchaseReturn): boolean {
  return LOCKED_RETURN_STATUSES.has(record.status) || !canEditPurchaseReturn(record);
}

export function canIssuePurchaseReturnForPacking(_record: PurchaseReturn): boolean {
  return false;
}

/**
 * Merge existing return lines (first) with remaining eligible GRN/rejected batches
 * so Edit can keep current products and allow adding more to the same record.
 * Marks lines that were already on the return so the UI can keep them in the
 * "Existing" section even if the user temporarily deselects them.
 */
export function mergeReturnItemsForEdit(
  existing: PurchaseReturnItem[],
  eligible: PurchaseReturnItem[],
): PurchaseReturnItem[] {
  const keyOf = (it: PurchaseReturnItem) =>
    it.inventoryRejectedItemId || `${it.grnId}:${it.productId}:${it.batchNumber}` || it.id;

  const existingByKey = new Map(existing.map((it) => [keyOf(it), it]));
  const eligibleByKey = new Map(eligible.map((it) => [keyOf(it), it]));
  const merged: PurchaseReturnItem[] = [];

  for (const item of existing) {
    const key = keyOf(item);
    const avail = eligibleByKey.get(key);
    merged.push({
      ...item,
      selected: true,
      isExistingOnReturn: true,
      // With exclude_return_id, eligible balance already includes this return's qty.
      balanceRejectedQty: avail
        ? Math.max(avail.balanceRejectedQty, item.returnQty)
        : Math.max(item.balanceRejectedQty, item.returnQty),
      alreadyReturnedQty: avail ? avail.alreadyReturnedQty : item.alreadyReturnedQty,
      lineStatus:
        (avail?.balanceRejectedQty ?? item.balanceRejectedQty) <= 0 && item.returnQty <= 0
          ? "fully_returned"
          : "available",
    });
  }

  for (const item of eligible) {
    const key = keyOf(item);
    if (existingByKey.has(key)) continue;
    merged.push({
      ...item,
      selected: false,
      returnQty: 0,
      lineRemark: "",
      isExistingOnReturn: false,
    });
  }

  return merged;
}

export const purchaseReturnRoutes = {
  list: PURCHASE_RETURN_LIST_HREF,
  new: (poId: number | string) => `/procurement/purchase-orders/returns/new?poId=${poId}`,
  detail: (id: number | string) => `/procurement/purchase-orders/returns/${id}`,
  edit: (id: number | string) => `/procurement/purchase-orders/returns/${id}/edit`,
};

export function getReturnQtyError(item: PurchaseReturnItem): string | undefined {
  if (!item.selected || item.lineStatus === "fully_returned") return undefined;
  if (item.returnQty <= 0) return "Enter return quantity for selected batch.";
  if (item.returnQty > item.balanceRejectedQty) {
    return "Return quantity cannot exceed balance rejected quantity.";
  }
  return undefined;
}

export function clampReturnQty(qty: number, balanceRejectedQty: number): number {
  if (!Number.isFinite(qty) || qty < 0) return 0;
  return Math.min(qty, Math.max(0, balanceRejectedQty));
}

export function validateReturnBalance(items: PurchaseReturnItem[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const it of items) {
    if (it.selected && it.returnQty > it.balanceRejectedQty) {
      errors[it.id] = "Return quantity cannot exceed balance rejected quantity.";
    }
  }
  return errors;
}

export function validateReturnItems(items: PurchaseReturnItem[]): Record<string, string> {
  const errors: Record<string, string> = {};
  let hasPositive = false;

  for (const it of items) {
    const rowError = getReturnQtyError(it);
    if (rowError) {
      errors[it.id] = rowError;
    }
    if (it.selected && it.lineStatus !== "fully_returned" && it.returnQty > 0) {
      hasPositive = true;
    }
  }

  if (!hasPositive) {
    errors._form = "Select at least one batch and enter a return quantity greater than zero.";
  }

  return errors;
}

export function getPurchaseReturnBillShipAddresses(_record: PurchaseReturn): {
  billAddress: null;
  shipAddress: null;
  billToAddressId: string;
  shipToAddressId: string;
} {
  return { billAddress: null, shipAddress: null, billToAddressId: "", shipToAddressId: "" };
}


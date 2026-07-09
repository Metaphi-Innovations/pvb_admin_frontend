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
  "issued_for_packing",
]);

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

export function batchItemKey(it: PurchaseReturnItem): string {
  return (
    it.grnBatchId ||
    it.batchGroupKey ||
    `${it.grnId}:${it.productId}:${it.batchNumber}` ||
    it.id
  );
}

export function resolveReturnBaseQty(item: PurchaseReturnItem): number {
  if (item.returnBaseQty > 0) return item.returnBaseQty;
  if (item.returnUnit === "CASE" && item.returnValue > 0 && item.caseSize > 0) {
    return item.returnValue * item.caseSize;
  }
  if (item.returnUnit === "PIECE" && item.returnValue > 0) {
    return item.returnValue;
  }
  if (item.returnCases > 0 && item.caseSize > 0) {
    return item.returnCases * item.caseSize;
  }
  return item.returnQty;
}

export function getEditableMaxQty(item: PurchaseReturnItem): number {
  if (item.maxEditableQty != null && item.maxEditableQty > 0) {
    return item.maxEditableQty;
  }
  return item.balanceRejectedQty;
}

export function mergeReturnItemsForEdit(
  existing: PurchaseReturnItem[],
  eligible: PurchaseReturnItem[],
): PurchaseReturnItem[] {
  const existingByKey = new Map(existing.map((it) => [batchItemKey(it), it]));
  const eligibleByKey = new Map(eligible.map((it) => [batchItemKey(it), it]));
  const merged: PurchaseReturnItem[] = [];

  for (const item of existing) {
    const key = batchItemKey(item);
    const avail = eligibleByKey.get(key);
    const currentRemaining = avail?.balanceRejectedQty ?? item.currentRemainingQty ?? 0;
    const docReturned = item.documentReturnedQty ?? resolveReturnBaseQty(item);

    merged.push({
      ...item,
      selected: true,
      isExistingOnReturn: true,
      currentRemainingQty: currentRemaining,
      documentReturnedQty: docReturned,
      maxEditableQty: currentRemaining + docReturned,
      balanceRejectedQty: currentRemaining,
      alreadyReturnedQty: avail?.alreadyReturnedQty ?? item.alreadyReturnedQty,
      alreadyReturnedCases: avail?.alreadyReturnedCases ?? item.alreadyReturnedCases,
      lineStatus: currentRemaining <= 0 && docReturned <= 0 ? "fully_returned" : "available",
    });
  }

  for (const item of eligible) {
    const key = batchItemKey(item);
    if (existingByKey.has(key)) continue;
    merged.push({
      ...item,
      selected: false,
      returnUnit: "PIECE",
      returnValue: 0,
      returnBaseQty: 0,
      returnCases: 0,
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

  const baseQty = resolveReturnBaseQty(item);
  if (baseQty <= 0) return "Enter return value for selected batch.";

  const maxQty = getEditableMaxQty(item);
  if (baseQty > maxQty) {
    return `Return quantity (${baseQty} pieces) exceeds available stock (${maxQty} pieces).`;
  }

  if (item.returnUnit === "CASE" && item.caseSize <= 0) {
    return "Case size is missing for this batch.";
  }

  return undefined;
}

export function clampReturnValue(value: number, maxPieces: number, caseSize: number, unit: PurchaseReturnItem["returnUnit"]): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (unit === "CASE") {
    const maxCases = caseSize > 0 ? Math.floor(maxPieces / caseSize) : 0;
    return Math.min(Math.floor(value), maxCases);
  }
  return Math.min(value, Math.max(0, maxPieces));
}

export function validateReturnBalance(items: PurchaseReturnItem[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const it of items) {
    const rowError = getReturnQtyError(it);
    if (rowError) errors[it.id] = rowError;
  }
  return errors;
}

export function validateReturnItems(items: PurchaseReturnItem[]): Record<string, string> {
  const errors: Record<string, string> = {};
  let hasPositive = false;

  for (const it of items) {
    const rowError = getReturnQtyError(it);
    if (rowError) errors[it.id] = rowError;
    if (it.selected && it.lineStatus !== "fully_returned" && resolveReturnBaseQty(it) > 0) {
      hasPositive = true;
    }
  }

  if (!hasPositive) {
    errors._form = "Select at least one batch and enter a return value greater than zero.";
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

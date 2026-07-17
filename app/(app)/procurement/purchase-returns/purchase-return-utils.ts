import type { PurchaseReturn, PurchaseReturnItem, PurchaseReturnUnit } from "./purchase-return-data";

export const PURCHASE_RETURN_LIST_HREF = "/procurement/purchase-orders?tab=po_return";

export function purchaseReturnListHref(): string {
  return PURCHASE_RETURN_LIST_HREF;
}

/** Statuses that allow modifying lines / quantities on the Edit page. */
const EDITABLE_RETURN_STATUSES = new Set([
  "Draft",
  "draft",
  "PO_return",
  "Ready For Packing",
]);

/** Packed / completed — show read-only on Edit; no quantity/product changes. */
const LOCKED_RETURN_STATUSES = new Set([
  "Partially Packed",
  "Fully Packed",
  "Dispatched",
  "Received_By_Supplier",
  "Cancelled",
  "returned",
]);

const PACKING_STATUSES_ALLOWING_EDIT = new Set([
  "Ready For Packing",
  "Cancelled",
  "CANCELLED",
  "",
]);

export function isPurchaseReturnPackingLocked(record: PurchaseReturn): boolean {
  if (record.packingDone) return true;
  const packingStatus = String(record.packingListStatus ?? "").trim();
  if (!packingStatus) return false;
  return !PACKING_STATUSES_ALLOWING_EDIT.has(packingStatus);
}

export function canEditPurchaseReturn(record: PurchaseReturn): boolean {
  if (isPurchaseReturnPackingLocked(record)) return false;
  return EDITABLE_RETURN_STATUSES.has(record.status);
}

export function isPurchaseReturnLocked(record: PurchaseReturn): boolean {
  return (
    LOCKED_RETURN_STATUSES.has(record.status) ||
    isPurchaseReturnPackingLocked(record) ||
    !canEditPurchaseReturn(record)
  );
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
export function normalizeQuantityType(value?: string | null): PurchaseReturnUnit {
  return String(value ?? "").trim().toUpperCase() === "CASE" ? "CASE" : "PIECE";
}

export function returnItemLineKey(it: PurchaseReturnItem): string {
  return (
    asString(it.batchGroupKey) ||
    `${it.inventoryDetailId}:${it.productId}:${it.batchNumber}:${normalizeQuantityType(it.quantityType)}`
  );
}

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

export function resolveReturnBaseQtyFromItem(item: PurchaseReturnItem): number {
  const unit = normalizeQuantityType(item.returnUnit ?? item.quantityType);
  const value = Number(item.returnValue) || 0;
  if (unit === "CASE" && item.caseSize > 0) {
    return value * item.caseSize;
  }
  return value;
}

export function resolveDisplayQtyFromBase(
  baseQty: number,
  quantityType: PurchaseReturnUnit,
  caseSize: number,
): number {
  if (quantityType === "CASE" && caseSize > 0) {
    return Math.floor(baseQty / caseSize);
  }
  return baseQty;
}

export function resolveMaxReturnBaseQty(item: PurchaseReturnItem): number {
  if (item.editableMaxReturnBaseQty != null && item.editableMaxReturnBaseQty >= 0) {
    return item.editableMaxReturnBaseQty;
  }
  return Math.max(0, item.balanceRejectedQty);
}

/** Remaining qty user can still allocate on this line (updates as return qty changes). */
export function resolveAvailableReturnBaseQty(item: PurchaseReturnItem): number {
  const maxBase = resolveMaxReturnBaseQty(item);
  return Math.max(0, maxBase - (item.returnQty || 0));
}

export function mergeReturnItemsForEdit(
  existing: PurchaseReturnItem[],
  eligible: PurchaseReturnItem[],
): PurchaseReturnItem[] {
  const keyOf = (it: PurchaseReturnItem) => returnItemLineKey(it);

  const existingByKey = new Map(existing.map((it) => [keyOf(it), it]));
  const eligibleByKey = new Map(eligible.map((it) => [keyOf(it), it]));
  const merged: PurchaseReturnItem[] = [];

  for (const item of existing) {
    const key = keyOf(item);
    const avail = eligibleByKey.get(key);
    const eligibleBalanceBase = avail?.balanceRejectedQty ?? 0;
    const editableMaxReturnBaseQty =
      item.editableMaxReturnBaseQty ??
      avail?.editableMaxReturnBaseQty ??
      eligibleBalanceBase + item.returnQty;

    merged.push({
      ...item,
      selected: true,
      isExistingOnReturn: true,
      batchGroupKey: item.batchGroupKey || avail?.batchGroupKey,
      balanceRejectedQty: eligibleBalanceBase,
      balanceDisplayQty:
        avail?.balanceDisplayQty ??
        resolveDisplayQtyFromBase(eligibleBalanceBase, item.quantityType, item.caseSize),
      qcRejectedQty: avail?.qcRejectedQty ?? item.qcRejectedQty,
      alreadyReturnedQty: avail?.alreadyReturnedQty ?? item.alreadyReturnedQty,
      editableMaxReturnBaseQty,
      lineStatus:
        editableMaxReturnBaseQty <= 0 && item.returnQty <= 0
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
      returnValue: 0,
      returnQty: 0,
      lineRemark: "",
      isExistingOnReturn: false,
      editableMaxReturnBaseQty: item.balanceRejectedQty,
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
  if (item.returnValue <= 0) return "Enter return quantity for selected batch.";
  if (item.returnQty > resolveMaxReturnBaseQty(item)) {
    return "Return quantity cannot exceed balance rejected quantity.";
  }
  return undefined;
}

export function clampReturnQty(qty: number, balanceRejectedQty: number): number {
  if (!Number.isFinite(qty) || qty < 0) return 0;
  return Math.min(qty, Math.max(0, balanceRejectedQty));
}

export function clampReturnDisplayValue(
  value: number,
  balanceDisplayQty: number,
  quantityType: PurchaseReturnUnit,
  caseSize: number,
): number {
  const maxBase = clampReturnQty(
    quantityType === "CASE" && caseSize > 0 ? value * caseSize : value,
    quantityType === "CASE" && caseSize > 0 ? balanceDisplayQty * caseSize : balanceDisplayQty,
  );
  return resolveDisplayQtyFromBase(maxBase, quantityType, caseSize);
}

export function validateReturnBalance(items: PurchaseReturnItem[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const it of items) {
    if (it.selected && it.returnQty > resolveMaxReturnBaseQty(it)) {
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


import { masterToday } from "@/lib/masters/common";
import { getStockStatus } from "@/lib/accounts/inventory-accounting-data";
import { daysUntilExpiry } from "@/app/(app)/masters/scheme/product-near-expiry-scheme";
import {
  batchSelectionsToAllocations,
  type BatchAllocation,
} from "../../dispatch/near-expiry-dispatch";
import type { SalesOrderProduct } from "../types";

export type PackingBatchStatus = "Available" | "Near Expiry" | "Expired";

export interface PackingBatchInventoryRow {
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  availableQty: number;
  remainingDays: number;
  status: PackingBatchStatus;
  isSelectable: boolean;
}

export interface PackingSummaryLine {
  sku: string;
  product: string;
  packingQty: number;
  allocations: BatchAllocation[];
}


export function buildFefoRecommendedSelections(
  rows: PackingBatchInventoryRow[],
  requiredQty: number,
): Record<string, number> {
  const selections: Record<string, number> = {};
  if (requiredQty <= 0) return selections;

  let remaining = requiredQty;
  for (const row of rows) {
    if (!row.isSelectable) continue;
    if (remaining > 0) {
      const take = Math.min(remaining, row.availableQty);
      selections[row.batchNumber] = Math.max(0, take);
      remaining -= take;
    } else {
      selections[row.batchNumber] = 0;
    }
  }
  return selections;
}

/** Pre-select the batch fixed on the purchase return line item. */
export function buildPurchaseReturnBatchSelections(
  product: SalesOrderProduct,
  qty: number,
): Record<string, number> {
  if (!product.batchNumber || qty <= 0) return {};
  return { [product.batchNumber]: qty };
}

export function buildPurchaseReturnBatchAllocations(
  product: SalesOrderProduct,
  selections: Record<string, number>,
): BatchAllocation[] {
  return Object.entries(selections)
    .filter(([, allocatedQty]) => allocatedQty > 0)
    .map(([batchNumber, allocatedQty]) => ({
      batchNumber,
      expiryDate: product.expDate ?? "",
      allocatedQty,
    }));
}

export function validatePurchaseReturnBatchSelections(
  products: SalesOrderProduct[],
  selectedSkus: Record<string, boolean>,
  packingQty: Record<string, number>,
  batchSelections: Record<string, Record<string, number>>,
): { valid: boolean; message?: string; batchErrors: Record<string, string> } {
  const batchErrors: Record<string, string> = {};

  for (const p of products) {
    if (!selectedSkus[p.sku]) continue;
    const qty = packingQty[p.sku] ?? 0;
    if (qty <= 0) continue;

    const selections = batchSelections[p.sku] ?? {};
    const selectedTotal = getBatchSelectionTotal(selections);

    if (selectedTotal !== qty) {
      batchErrors[p.sku] = `Batch qty (${selectedTotal}) must match packing qty (${qty}).`;
      continue;
    }

    if (p.batchNumber && (selections[p.batchNumber] ?? 0) <= 0) {
      batchErrors[p.sku] = `Return batch ${p.batchNumber} must be packed.`;
    }
  }

  if (Object.keys(batchErrors).length > 0) {
    return {
      valid: false,
      batchErrors,
      message: "Complete batch allocation for all return lines.",
    };
  }

  return { valid: true, batchErrors };
}

export function getFefoRecommendedBatchNumbers(
  rows: PackingBatchInventoryRow[],
  requiredQty: number,
): Set<string> {
  const selections = buildFefoRecommendedSelections(rows, requiredQty);
  return new Set(Object.keys(selections).filter((b) => (selections[b] ?? 0) > 0));
}

export function detectFefoViolation(
  rows: PackingBatchInventoryRow[],
  selections: Record<string, number>,
): boolean {
  const active = rows.filter((r) => r.isSelectable && r.availableQty > 0);
  const sorted = [...active].sort(
    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
  );

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i];
    const selectedQty = selections[row.batchNumber] ?? 0;
    if (selectedQty <= 0) continue;

    for (let j = 0; j < i; j++) {
      const older = sorted[j];
      const olderSelected = selections[older.batchNumber] ?? 0;
      if (olderSelected < older.availableQty) {
        return true;
      }
    }
  }

  return false;
}

export function getSelectedPackingQty(
  products: SalesOrderProduct[],
  selectedSkus: Record<string, boolean>,
  packingQty: Record<string, number>,
): number {
  return products.reduce((sum, p) => {
    if (!selectedSkus[p.sku]) return sum;
    return sum + (packingQty[p.sku] ?? 0);
  }, 0);
}

export function getBatchSelectionTotal(selections: Record<string, number>): number {
  return Object.values(selections).reduce((sum, n) => sum + (n || 0), 0);
}

export function getRemainingRequiredQty(
  selections: Record<string, number>,
  requiredQty: number,
  excludeBatch?: string,
): number {
  const allocated = Object.entries(selections).reduce((sum, [batch, qty]) => {
    if (excludeBatch && batch === excludeBatch) return sum;
    return sum + (qty || 0);
  }, 0);
  return Math.max(0, requiredQty - allocated);
}

export function getMaxBatchPackingQty(
  batchNumber: string,
  selections: Record<string, number>,
  requiredQty: number,
  availableQty: number,
): number {
  const remaining = getRemainingRequiredQty(selections, requiredQty, batchNumber);
  return Math.min(availableQty, remaining);
}

export function isBatchAllocationComplete(
  selections: Record<string, number>,
  requiredQty: number,
): boolean {
  if (requiredQty <= 0) return true;
  return getBatchSelectionTotal(selections) === requiredQty;
}

export function validateSelectedPackingLines(
  products: SalesOrderProduct[],
  selectedSkus: Record<string, boolean>,
  packingQty: Record<string, number>,
  availableStock: Record<string, number>,
): { valid: boolean; errors: Record<string, string>; message?: string } {
  const errors: Record<string, string> = {};
  let selectedCount = 0;
  let packedTotal = 0;

  for (const p of products) {
    if (!selectedSkus[p.sku]) continue;
    selectedCount += 1;
    const qty = packingQty[p.sku] ?? 0;
    packedTotal += qty;
    const maxAvailable = availableStock[p.sku] ?? 0;

    if (qty <= 0) {
      errors[p.sku] = "Enter packing quantity";
    } else if (qty > p.pending_cases) {
      errors[p.sku] = `Cannot exceed pending quantity of ${p.pending_cases}`;
    } else if (qty > maxAvailable) {
      errors[p.sku] = `Cannot exceed available warehouse stock of ${maxAvailable}`;
    }
  }

  if (selectedCount === 0) {
    return { valid: false, errors, message: "Select at least one product to pack." };
  }
  if (packedTotal <= 0) {
    return { valid: false, errors, message: "Enter packing quantity for selected products." };
  }
  if (Object.keys(errors).length > 0) {
    return { valid: false, errors, message: "Fix packing quantity errors before continuing." };
  }

  return { valid: true, errors };
}

export function validateBatchSelectionsForPacking(
  products: SalesOrderProduct[],
  selectedSkus: Record<string, boolean>,
  packingQty: Record<string, number>,
  batchSelections: Record<string, Record<string, number>>,
  warehouse: string,
  sourceDocumentType?: string,
  inventoryBatchesMap?: Record<string, PackingBatchInventoryRow[]>
): { valid: boolean; message?: string; batchErrors: Record<string, string> } {
  if (sourceDocumentType === "Purchase Return") {
    return validatePurchaseReturnBatchSelections(
      products,
      selectedSkus,
      packingQty,
      batchSelections,
    );
  }

  const batchErrors: Record<string, string> = {};

  for (const p of products) {
    if (!selectedSkus[p.sku]) continue;
    const qty = packingQty[p.sku] ?? 0;
    if (qty <= 0) continue;

    const rows = inventoryBatchesMap?.[p.sku] || [];
    const selections = batchSelections[p.sku] ?? {};
    const selectedTotal = getBatchSelectionTotal(selections);

    if (selectedTotal !== qty) {
      batchErrors[p.sku] = `Batch qty (${selectedTotal}) must match packing qty (${qty}).`;
      continue;
    }

    for (const [batchNo, allocQty] of Object.entries(selections)) {
      if (allocQty <= 0) continue;
      const row = rows.find((r) => r.batchNumber === batchNo);
      
      if (!row) {
        // If the batch was explicitly requested on the sales order, allow it even if stock is missing in mock data
        if (p.batchNumber === batchNo) continue;
        
        batchErrors[p.sku] = `Invalid batch ${batchNo}.`;
        break;
      }
      if (!row.isSelectable) {
        batchErrors[p.sku] = `Batch ${batchNo} is expired and cannot be used.`;
        break;
      }
      if (allocQty > row.availableQty && p.batchNumber !== batchNo) {
        batchErrors[p.sku] = `Batch ${batchNo} exceeds available qty (${row.availableQty}).`;
        break;
      }
    }
  }

  if (Object.keys(batchErrors).length > 0) {
    return {
      valid: false,
      batchErrors,
      message: "Complete batch selection for all packed products.",
    };
  }

  return { valid: true, batchErrors };
}

export function buildBatchAllocationMap(
  products: SalesOrderProduct[],
  selectedSkus: Record<string, boolean>,
  batchSelections: Record<string, Record<string, number>>,
  warehouse: string,
  sourceDocumentType?: string,
  inventoryBatchesMap?: Record<string, PackingBatchInventoryRow[]>
): Record<string, BatchAllocation[]> {
  const map: Record<string, BatchAllocation[]> = {};

  for (const p of products) {
    if (!selectedSkus[p.sku]) continue;
    const selections = batchSelections[p.sku];
    if (!selections) continue;

    if (sourceDocumentType === "Purchase Return" && p.batchNumber) {
      const allocations = buildPurchaseReturnBatchAllocations(p, selections);
      if (allocations.length) {
        map[p.sku] = allocations;
      }
      continue;
    }

    const allocations = Object.entries(selections)
      .map(([batchNumber, allocatedQty]) => {
        if (allocatedQty <= 0) return null;
        const row = inventoryBatchesMap?.[p.sku]?.find((r) => r.batchNumber === batchNumber);
        return {
          batchNumber,
          expiryDate: row?.expiryDate ?? "—",
          allocatedQty,
        };
      })
      .filter((row): row is BatchAllocation => Boolean(row));
      
    if (allocations.length) {
      map[p.sku] = allocations;
    }
  }

  return map;
}

export function buildPackingSummaryLines(
  products: SalesOrderProduct[],
  selectedSkus: Record<string, boolean>,
  packingQty: Record<string, number>,
  batchAllocationMap: Record<string, BatchAllocation[]>,
): PackingSummaryLine[] {
  return products
    .filter((p) => selectedSkus[p.sku] && (packingQty[p.sku] ?? 0) > 0)
    .map((p) => ({
      sku: p.sku,
      product: p.product,
      packingQty: packingQty[p.sku] ?? 0,
      allocations: batchAllocationMap[p.sku] ?? [],
    }));
}


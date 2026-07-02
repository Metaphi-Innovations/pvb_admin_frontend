// ── Packing List — warehouse-scoped FEFO carton/box allocation ───────────────

import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";
import {
  type SalesOrder,
  type SalesOrderLineItem,
  hydrateOrderLineItems,
  todayStr,
} from "./orders-data";

export type PackingListStatus =
  | "draft"
  | "generated"
  | "partially_packed"
  | "packed"
  | "cancelled";

export const PACKING_LIST_STATUS_LABELS: Record<PackingListStatus, string> = {
  draft: "Draft",
  generated: "Generated",
  partially_packed: "Partially Packed",
  packed: "Packed",
  cancelled: "Cancelled",
};

export interface ProductPackingConfig {
  productId: number;
  packingUnit: string;
  baseUnit: string;
  unitsPerPackingUnit: number;
}

export type InventoryType = "original" | "sales_return" | "sample_return";

export interface InventoryCarton {
  id: string;
  productId: number;
  batchNumber: string;
  expiryDate: string;
  warehouseCode: string;
  warehouseName: string;
  cartonNumber: string;
  packingUnit: string;
  baseUnit: string;
  unitsPerPackingUnit: number;
  availablePackingQty: number;
  availableBaseQty: number;
  inventoryType: InventoryType;
}

export interface CartonAllocation {
  cartonId: string;
  batchNumber: string;
  expiryDate: string;
  cartonNumber: string;
  packingUnit: string;
  baseUnit: string;
  unitsPerPackingUnit: number;
  availablePackingQty: number;
  availableBaseQty: number;
  inventoryType: InventoryType;
  suggestedPackingQty: number;
  suggestedBaseQty: number;
  allocatedPackingQty: number;
  allocatedBaseQty: number;
}

export interface PackingListLine {
  lineItemId: string;
  productId: number;
  productCode: string;
  productName: string;
  packingUnit: string;
  baseUnit: string;
  unitsPerPackingUnit: number;
  orderedBaseQty: number;
  hasPackingConfig: boolean;
  allocations: CartonAllocation[];
}

export interface PackingList {
  id: number;
  packingListNumber: string;
  salesOrderId: number;
  salesOrderNumber: string;
  customerName: string;
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  status: PackingListStatus;
  lines: PackingListLine[];
  totalAllocatedBaseQty: number;
  hasInsufficientStock: boolean;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

const PRODUCT_PACKING_CONFIG: ProductPackingConfig[] = [
  { productId: 1, packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 50 },
  { productId: 2, packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 50 },
  { productId: 3, packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 50 },
  { productId: 4, packingUnit: "Box", baseUnit: "LTR", unitsPerPackingUnit: 20 },
  { productId: 5, packingUnit: "Box", baseUnit: "LTR", unitsPerPackingUnit: 20 },
  { productId: 6, packingUnit: "Carton", baseUnit: "PKT", unitsPerPackingUnit: 50 },
  { productId: 7, packingUnit: "Carton", baseUnit: "PKT", unitsPerPackingUnit: 50 },
  { productId: 8, packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 25 },
  { productId: 11, packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 50 },
  { productId: 12, packingUnit: "Box", baseUnit: "KG", unitsPerPackingUnit: 10 },
];

const INVENTORY_CARTONS: InventoryCarton[] = [
  { id: "c1", productId: 1, batchNumber: "NPK-2401-A", expiryDate: "2025-06-30", warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub", cartonNumber: "BX-NPK-001", packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 50, availablePackingQty: 1, availableBaseQty: 50, inventoryType: "original" },
  { id: "c2", productId: 1, batchNumber: "NPK-2401-A", expiryDate: "2025-06-30", warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub", cartonNumber: "BX-NPK-002", packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 50, availablePackingQty: 1, availableBaseQty: 50, inventoryType: "original" },
  { id: "c3", productId: 1, batchNumber: "NPK-2402-B", expiryDate: "2025-09-15", warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub", cartonNumber: "BX-NPK-003", packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 50, availablePackingQty: 1, availableBaseQty: 50, inventoryType: "original" },
  { id: "c4", productId: 2, batchNumber: "DAP-2310-C", expiryDate: "2025-04-20", warehouseCode: "WH-0002", warehouseName: "Western Regional Depot", cartonNumber: "BX-DAP-001", packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 50, availablePackingQty: 1, availableBaseQty: 50, inventoryType: "original" },
  { id: "c5", productId: 2, batchNumber: "DAP-2401-D", expiryDate: "2025-11-01", warehouseCode: "WH-0002", warehouseName: "Western Regional Depot", cartonNumber: "BX-DAP-002", packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 50, availablePackingQty: 1, availableBaseQty: 50, inventoryType: "original" },
  { id: "c6", productId: 3, batchNumber: "URE-2403-E", expiryDate: "2025-08-10", warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub", cartonNumber: "BX-URE-001", packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 50, availablePackingQty: 1, availableBaseQty: 50, inventoryType: "original" },
  { id: "c7", productId: 3, batchNumber: "URE-2403-E", expiryDate: "2025-08-10", warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub", cartonNumber: "BX-URE-002", packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 50, availablePackingQty: 1, availableBaseQty: 50, inventoryType: "original" },
  { id: "c8", productId: 4, batchNumber: "CHL-2308-F", expiryDate: "2025-03-15", warehouseCode: "WH-0003", warehouseName: "South Zone Warehouse", cartonNumber: "CT-CHL-001", packingUnit: "Box", baseUnit: "LTR", unitsPerPackingUnit: 20, availablePackingQty: 1, availableBaseQty: 20, inventoryType: "sales_return" },
  { id: "c9", productId: 4, batchNumber: "CHL-2308-F", expiryDate: "2025-03-15", warehouseCode: "WH-0003", warehouseName: "South Zone Warehouse", cartonNumber: "CT-CHL-002", packingUnit: "Box", baseUnit: "LTR", unitsPerPackingUnit: 20, availablePackingQty: 1, availableBaseQty: 20, inventoryType: "sample_return" },
  { id: "c10", productId: 4, batchNumber: "CHL-2401-G", expiryDate: "2026-01-20", warehouseCode: "WH-0003", warehouseName: "South Zone Warehouse", cartonNumber: "CT-CHL-003", packingUnit: "Box", baseUnit: "LTR", unitsPerPackingUnit: 20, availablePackingQty: 1, availableBaseQty: 20, inventoryType: "original" },
  { id: "c11", productId: 6, batchNumber: "TOM-2401-H", expiryDate: "2025-12-31", warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub", cartonNumber: "CT-TOM-001", packingUnit: "Carton", baseUnit: "PKT", unitsPerPackingUnit: 50, availablePackingQty: 1, availableBaseQty: 50, inventoryType: "original" },
  { id: "c12", productId: 6, batchNumber: "TOM-2401-H", expiryDate: "2025-12-31", warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub", cartonNumber: "CT-TOM-002", packingUnit: "Carton", baseUnit: "PKT", unitsPerPackingUnit: 50, availablePackingQty: 1, availableBaseQty: 50, inventoryType: "original" },
  { id: "c13", productId: 8, batchNumber: "VER-2402-I", expiryDate: "2025-07-01", warehouseCode: "WH-0002", warehouseName: "Western Regional Depot", cartonNumber: "BG-VER-001", packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 25, availablePackingQty: 1, availableBaseQty: 25, inventoryType: "original" },
  { id: "c14", productId: 11, batchNumber: "MOP-2401-J", expiryDate: "2025-05-25", warehouseCode: "WH-0001", warehouseName: "Central Distribution Hub", cartonNumber: "BG-MOP-001", packingUnit: "Bag", baseUnit: "KG", unitsPerPackingUnit: 50, availablePackingQty: 1, availableBaseQty: 50, inventoryType: "original" },
];

const STORAGE_KEY = "ds_sales_packing_lists";
const ID_KEY = "ds_sales_packing_lists_next_id";

export function getActiveWarehousesForPacking() {
  return loadWarehouses().filter(w => w.status === "active");
}

export function getProductPackingConfig(productId: number): ProductPackingConfig | undefined {
  return PRODUCT_PACKING_CONFIG.find(c => c.productId === productId);
}

export function getCartonsForProductInWarehouse(
  productId: number,
  warehouseCode: string,
): InventoryCarton[] {
  return INVENTORY_CARTONS.filter(
    c => c.productId === productId && c.warehouseCode === warehouseCode,
  );
}

function cartonToAllocation(carton: InventoryCarton, suggestedPacking: number, suggestedBase: number): CartonAllocation {
  return {
    cartonId: carton.id,
    batchNumber: carton.batchNumber,
    expiryDate: carton.expiryDate,
    cartonNumber: carton.cartonNumber,
    packingUnit: carton.packingUnit,
    baseUnit: carton.baseUnit,
    unitsPerPackingUnit: carton.unitsPerPackingUnit,
    availablePackingQty: carton.availablePackingQty,
    availableBaseQty: carton.availableBaseQty,
    inventoryType: carton.inventoryType,
    suggestedPackingQty: suggestedPacking,
    suggestedBaseQty: suggestedBase,
    allocatedPackingQty: suggestedPacking,
    allocatedBaseQty: suggestedBase,
  };
}

/** FEFO carton suggestions scoped to a single warehouse. */
export function suggestFefoCartonAllocations(
  productId: number,
  orderedBaseQty: number,
  warehouseCode: string,
): { allocations: CartonAllocation[]; hasPackingConfig: boolean; packingUnit: string; baseUnit: string; unitsPerPackingUnit: number } {
  const config = getProductPackingConfig(productId);
  const hasPackingConfig = !!config;
  const packingUnit = config?.packingUnit ?? "Unit";
  const baseUnit = config?.baseUnit ?? "Unit";
  const unitsPerPackingUnit = config?.unitsPerPackingUnit ?? 1;

  const cartons = getCartonsForProductInWarehouse(productId, warehouseCode)
    .sort((a, b) => {
      const exp = a.expiryDate.localeCompare(b.expiryDate);
      if (exp !== 0) return exp;
      return a.batchNumber.localeCompare(b.batchNumber);
    });

  let remaining = orderedBaseQty;
  const allocations: CartonAllocation[] = [];

  for (const carton of cartons) {
    if (remaining <= 0) break;
    const takeBase = Math.min(remaining, carton.availableBaseQty);
    const takePacking = takeBase / carton.unitsPerPackingUnit;
    allocations.push(cartonToAllocation(carton, takePacking, takeBase));
    remaining -= takeBase;
  }

  return { allocations, hasPackingConfig, packingUnit, baseUnit, unitsPerPackingUnit };
}

export function buildPackingListLines(order: SalesOrder, warehouseCode: string): PackingListLine[] {
  const hydrated = hydrateOrderLineItems(order);
  return hydrated.lineItems
    .filter((l): l is SalesOrderLineItem & { productId: number } => l.productId != null && l.quantity > 0)
    .map(line => {
      const suggestion = suggestFefoCartonAllocations(line.productId, line.quantity, warehouseCode);
      return {
        lineItemId: line.id,
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        packingUnit: suggestion.packingUnit,
        baseUnit: suggestion.baseUnit,
        unitsPerPackingUnit: suggestion.unitsPerPackingUnit,
        orderedBaseQty: line.quantity,
        hasPackingConfig: suggestion.hasPackingConfig,
        allocations: suggestion.allocations,
      };
    });
}

export function getTotalAllocatedBaseForLine(line: PackingListLine): number {
  return line.allocations.reduce((sum, a) => sum + a.allocatedBaseQty, 0);
}

export function lineHasInsufficientStock(line: PackingListLine): boolean {
  return getTotalAllocatedBaseForLine(line) < line.orderedBaseQty;
}

export function validatePackingListLines(lines: PackingListLine[], warehouseCode: string): string | null {
  if (!warehouseCode) return "Warehouse is required";

  for (const line of lines) {
    for (const alloc of line.allocations) {
      if (alloc.allocatedPackingQty < 0 || alloc.allocatedBaseQty < 0) {
        return `Allocated quantity cannot be negative for ${line.productName}`;
      }
      if (alloc.allocatedPackingQty > alloc.availablePackingQty) {
        return `Packing quantity exceeds available for carton ${alloc.cartonNumber}`;
      }
      if (alloc.allocatedBaseQty > alloc.availableBaseQty) {
        return `Base quantity exceeds available for carton ${alloc.cartonNumber}`;
      }
    }
    const total = getTotalAllocatedBaseForLine(line);
    if (total > line.orderedBaseQty) {
      return `Total allocation exceeds ordered quantity for ${line.productName}`;
    }
  }
  return null;
}

export function loadPackingLists(): PackingList[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PackingList[]) : [];
  } catch {
    return [];
  }
}

export function savePackingLists(lists: PackingList[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  const maxId = Math.max(0, ...lists.map(l => l.id));
  localStorage.setItem(ID_KEY, String(maxId));
}

export function nextPackingListId(lists: PackingList[]): number {
  if (typeof window === "undefined") return 1;
  const stored = parseInt(localStorage.getItem(ID_KEY) ?? "0", 10);
  const maxFromList = Math.max(0, ...lists.map(l => l.id));
  return Math.max(stored, maxFromList) + 1;
}

export function generatePackingListNumber(lists: PackingList[]): string {
  const year = new Date().getFullYear();
  const maxNum = lists.reduce((max, l) => {
    const m = l.packingListNumber.match(/PL-\d{4}-(\d+)/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return `PL-${year}-${String(maxNum + 1).padStart(3, "0")}`;
}

export function createPackingList(
  order: SalesOrder,
  lines: PackingListLine[],
  warehouseId: number,
  warehouseCode: string,
  warehouseName: string,
): PackingList {
  const lists = loadPackingLists();
  const today = todayStr();
  const hasInsufficientStock = lines.some(lineHasInsufficientStock);
  const totalAllocatedBaseQty = lines.reduce((sum, l) => sum + getTotalAllocatedBaseForLine(l), 0);
  const totalOrdered = lines.reduce((sum, l) => sum + l.orderedBaseQty, 0);

  let status: PackingListStatus = "generated";
  if (hasInsufficientStock && totalAllocatedBaseQty > 0) status = "partially_packed";
  else if (!hasInsufficientStock && totalAllocatedBaseQty >= totalOrdered && totalOrdered > 0) status = "generated";

  return {
    id: nextPackingListId(lists),
    packingListNumber: generatePackingListNumber(lists),
    salesOrderId: order.id,
    salesOrderNumber: order.soNumber,
    customerName: order.customerName,
    warehouseId,
    warehouseCode,
    warehouseName,
    status,
    lines,
    totalAllocatedBaseQty,
    hasInsufficientStock,
    createdBy: "Admin",
    createdDate: today,
    updatedBy: "Admin",
    updatedDate: today,
  };
}

export function savePackingList(list: PackingList): void {
  const lists = loadPackingLists();
  const existing = lists.findIndex(l => l.id === list.id);
  if (existing >= 0) lists[existing] = list;
  else lists.push(list);
  savePackingLists(lists);
}

export function getPackingListById(id: number): PackingList | undefined {
  return loadPackingLists().find(l => l.id === id);
}

export function buildAllCartonAllocationsForProduct(
  productId: number,
  orderedBaseQty: number,
  warehouseCode: string
): { allocations: CartonAllocation[]; hasPackingConfig: boolean; packingUnit: string; baseUnit: string; unitsPerPackingUnit: number } {
  const suggestion = suggestFefoCartonAllocations(productId, orderedBaseQty, warehouseCode);
  const allCartons = getCartonsForProductInWarehouse(productId, warehouseCode)
    .sort((a, b) => {
      const exp = a.expiryDate.localeCompare(b.expiryDate);
      if (exp !== 0) return exp;
      return a.batchNumber.localeCompare(b.batchNumber);
    });

  const config = getProductPackingConfig(productId);
  const unitsPerPackingUnit = config?.unitsPerPackingUnit ?? 1;

  const allocations = allCartons.map(carton => {
    const suggested = suggestion.allocations.find(a => a.cartonId === carton.id);
    return {
      cartonId: carton.id,
      batchNumber: carton.batchNumber,
      expiryDate: carton.expiryDate,
      cartonNumber: carton.cartonNumber,
      packingUnit: carton.packingUnit,
      baseUnit: carton.baseUnit,
      unitsPerPackingUnit: carton.unitsPerPackingUnit,
      availablePackingQty: carton.availablePackingQty,
      availableBaseQty: carton.availableBaseQty,
      inventoryType: carton.inventoryType,
      suggestedPackingQty: suggested ? suggested.suggestedPackingQty : 0,
      suggestedBaseQty: suggested ? suggested.suggestedBaseQty : 0,
      allocatedPackingQty: suggested ? suggested.allocatedPackingQty : 0,
      allocatedBaseQty: suggested ? suggested.allocatedBaseQty : 0,
    };
  });

  return {
    allocations,
    hasPackingConfig: suggestion.hasPackingConfig,
    packingUnit: suggestion.packingUnit,
    baseUnit: suggestion.baseUnit,
    unitsPerPackingUnit
  };
}

export function buildAllPackingListLines(order: SalesOrder, warehouseCode: string): PackingListLine[] {
  const hydrated = hydrateOrderLineItems(order);
  return hydrated.lineItems
    .filter((l): l is SalesOrderLineItem & { productId: number } => l.productId != null && l.quantity > 0)
    .map(line => {
      const allAllocations = buildAllCartonAllocationsForProduct(line.productId, line.quantity, warehouseCode);
      return {
        lineItemId: line.id,
        productId: line.productId,
        productCode: line.productCode,
        productName: line.productName,
        packingUnit: allAllocations.packingUnit,
        baseUnit: allAllocations.baseUnit,
        unitsPerPackingUnit: allAllocations.unitsPerPackingUnit,
        orderedBaseQty: line.quantity,
        hasPackingConfig: allAllocations.hasPackingConfig,
        allocations: allAllocations.allocations,
      };
    });
}




import { loadWarehouses } from "@/app/(app)/masters/warehouse/warehouse-data";
import {
  loadProductCatalog,
  type ProductCatalogItem,
  type SalesOrderLineItem,
  type SalesOrderAdditionalExpense,
  createEmptyLineItem as createEmptySalesLine,
  calculateOrderTotalsSummary,
  recalculateLineItem,
} from "@/app/(app)/sales/orders/orders-data";

export type TransferStatus = "draft" | "pending" | "approved" | "rejected" | "cancelled";

export interface StockTransfer {
  id: number;
  transferNumber: string;
  transferDate: string;
  deliveryDate: string;
  sourceWarehouseId: number;
  sourceWarehouseName: string;
  sourceWarehouseCode: string;
  targetWarehouseId: number;
  targetWarehouseName: string;
  targetWarehouseCode: string;
  status: TransferStatus;
  lineItems: SalesOrderLineItem[];
  additionalExpenses: SalesOrderAdditionalExpense[];
  totalAmount: number;
  totalItems: number;
  totalQuantity: number;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  packingListId?: number;
  packingListNumber?: string;
  packingStatus?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledDate?: string;
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedDate?: string;
}

export interface StockTransferFormValues {
  transferDate: string;
  deliveryDate: string;
  sourceWarehouseId: number | null;
  targetWarehouseId: number | null;
  status: TransferStatus;
  lineItems: SalesOrderLineItem[];
  additionalExpenses: SalesOrderAdditionalExpense[];
}

const STORAGE_KEY = "ds_stock_transfers";
const ID_KEY = "ds_stock_transfers_next_id";
const SEED_VERSION = 1;

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function createEmptyLineItem(): SalesOrderLineItem {
  return createEmptySalesLine();
}

export function formatTransferStatus(status: TransferStatus): string {
  switch (status) {
    case "draft": return "Draft";
    case "pending": return "Pending Approval";
    case "approved": return "Approved";
    case "rejected": return "Rejected";
    case "cancelled": return "Cancelled";
    default: return status;
  }
}

// Generate base seed data if no data exists in store
function buildSeedTransfers(): StockTransfer[] {
  const warehouses = loadWarehouses();
  const wh1 = warehouses[0] || { id: 1, warehouseName: "Main Warehouse", warehouseCode: "WH-0001" };
  const wh2 = warehouses[1] || warehouses[0] || { id: 2, warehouseName: "Mumbai Warehouse", warehouseCode: "WH-0002" };
  const wh3 = warehouses[2] || warehouses[0] || { id: 3, warehouseName: "Pune Warehouse", warehouseCode: "WH-0003" };

  const products = loadProductCatalog();
  const p1 = products[0] || { id: 1, code: "PRD-001", name: "NPK 19:19:19", sellingPrice: 1050, stock: 450, uom: "KG", gstRate: "5%" };
  const p2 = products[1] || { id: 2, code: "PRD-002", name: "DAP Fertilizer", sellingPrice: 1250, stock: 320, uom: "KG", gstRate: "5%" };

  // Helper to build line item
  const buildLine = (productId: number, code: string, name: string, stock: number, qty: number, price: number, gstRate: string): SalesOrderLineItem => {
    const rawLine: SalesOrderLineItem = {
      id: `line-${Math.random()}`,
      productId,
      productCode: code,
      productName: name,
      availableStock: stock,
      quantity: qty,
      dealerPrice: price,
      unitPrice: price,
      discount: 0,
      discountValue: 0,
      schemeDiscountPercent: 0,
      schemeDiscountAmount: 0,
      finalRate: price,
      schemeApplied: "No",
      gstAmount: Math.round(qty * price * 0.05 * 100) / 100,
      lineTotal: 0,
    };
    return recalculateLineItem(rawLine);
  };

  const lines1 = [
    buildLine(p1.id, p1.code, p1.name, p1.stock, 50, p1.sellingPrice, p1.gstRate),
    buildLine(p2.id, p2.code, p2.name, p2.stock, 20, p2.sellingPrice, p2.gstRate),
  ];

  const totals1 = calculateOrderTotalsSummary(lines1, []);

  return [
    {
      id: 1,
      transferNumber: "ST-2024-001",
      transferDate: "2024-01-15",
      deliveryDate: "2024-01-22",
      sourceWarehouseId: wh1.id,
      sourceWarehouseName: wh1.warehouseName,
      sourceWarehouseCode: wh1.warehouseCode,
      targetWarehouseId: wh2.id,
      targetWarehouseName: wh2.warehouseName,
      targetWarehouseCode: wh2.warehouseCode,
      status: "approved",
      lineItems: lines1,
      additionalExpenses: [],
      totalAmount: totals1.grandTotal,
      totalItems: lines1.length,
      totalQuantity: 70,
      createdBy: "Admin",
      createdDate: "2024-01-15",
      updatedBy: "Admin",
      updatedDate: "2024-01-15"
    },
    {
      id: 2,
      transferNumber: "ST-2024-002",
      transferDate: "2024-02-10",
      deliveryDate: "2024-02-17",
      sourceWarehouseId: wh2.id,
      sourceWarehouseName: wh2.warehouseName,
      sourceWarehouseCode: wh2.warehouseCode,
      targetWarehouseId: wh3.id,
      targetWarehouseName: wh3.warehouseName,
      targetWarehouseCode: wh3.warehouseCode,
      status: "pending",
      lineItems: [
        buildLine(p2.id, p2.code, p2.name, p2.stock, 100, p2.sellingPrice, p2.gstRate)
      ],
      additionalExpenses: [],
      totalAmount: p2.sellingPrice * 100 * 1.05,
      totalItems: 1,
      totalQuantity: 100,
      createdBy: "Admin",
      createdDate: "2024-02-10",
      updatedBy: "Admin",
      updatedDate: "2024-02-10"
    }
  ];
}

export function hydrateTransferLineItems(transfer: StockTransfer): StockTransfer {
  const catalog = loadProductCatalog();
  const lineItems = (transfer.lineItems || []).map(line => {
    if (line.unitPrice !== undefined && line.lineTotal !== undefined) {
      return line;
    }
    // Fallback/Hydration for old schema
    const product = catalog.find(p => p.id === line.productId);
    const unitPrice = line.unitPrice ?? product?.sellingPrice ?? 0;
    const discount = line.discount ?? 0;
    const gstRate = product?.gstRate || "5%";
    const gstAmount = line.gstAmount ?? (Math.round(line.quantity * unitPrice * (parseFloat(gstRate) / 100) * 100) / 100);
    const rawLine = {
      ...line,
      unitPrice,
      discount,
      gstAmount,
      lineTotal: 0,
    };
    return recalculateLineItem(rawLine);
  });

  const additionalExpenses = transfer.additionalExpenses || [];
  const totals = calculateOrderTotalsSummary(lineItems, additionalExpenses);

  return {
    ...transfer,
    lineItems,
    additionalExpenses,
    totalAmount: totals.grandTotal,
  };
}

export function loadTransfers(): StockTransfer[] {
  if (typeof window === "undefined") return buildSeedTransfers().map(hydrateTransferLineItems);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeds = buildSeedTransfers();
      persistTransfers(seeds);
      return seeds.map(hydrateTransferLineItems);
    }
    const parsed = JSON.parse(raw);
    const data = parsed.data || buildSeedTransfers();
    return data.map(hydrateTransferLineItems);
  } catch {
    return buildSeedTransfers().map(hydrateTransferLineItems);
  }
}

export function saveTransfers(transfers: StockTransfer[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, data: transfers }));
  const maxId = Math.max(0, ...transfers.map(t => t.id));
  localStorage.setItem(ID_KEY, String(maxId));
}

function persistTransfers(transfers: StockTransfer[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SEED_VERSION, data: transfers }));
    localStorage.setItem(ID_KEY, String(Math.max(0, ...transfers.map(t => t.id))));
  }
}

export function getTransferById(id: number): StockTransfer | undefined {
  const transfers = loadTransfers();
  return transfers.find(t => t.id === id);
}

export function generateTransferNumber(transfers: StockTransfer[]): string {
  const year = new Date().getFullYear();
  const maxNum = transfers.reduce((max, t) => {
    const m = t.transferNumber.match(/ST-\d{4}-(\d+)/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);
  return `ST-${year}-${String(maxNum + 1).padStart(3, "0")}`;
}

export function validateStockTransferForm(form: StockTransferFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.sourceWarehouseId) {
    errors.sourceWarehouseId = "Source Warehouse is required";
  }
  if (!form.targetWarehouseId) {
    errors.targetWarehouseId = "Target Warehouse is required";
  }
  if (form.sourceWarehouseId && form.targetWarehouseId && form.sourceWarehouseId === form.targetWarehouseId) {
    errors.targetWarehouseId = "Source and Target Warehouses cannot be the same";
  }
  if (!form.transferDate) {
    errors.transferDate = "Transfer date is required";
  }
  if (!form.deliveryDate) {
    errors.deliveryDate = "Delivery date is required";
  }
  if (form.lineItems.length === 0) {
    errors.lineItems = "Add at least one product line";
  } else {
    const invalid = form.lineItems.some(l => !l.productId || l.quantity <= 0);
    if (invalid) {
      errors.lineItems = "Each line must have a product and quantity greater than zero";
    }
  }
  return errors;
}

export function buildTransferFromForm(
  form: StockTransferFormValues,
  existing: Partial<StockTransfer> & { transferNumber: string },
  asDraft: boolean
): StockTransfer | null {
  const warehouses = loadWarehouses();
  const sourceWh = warehouses.find(w => w.id === form.sourceWarehouseId);
  const targetWh = warehouses.find(w => w.id === form.targetWarehouseId);
  if (!sourceWh || !targetWh) return null;

  const totalItems = form.lineItems.length;
  const totalQuantity = form.lineItems.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
  const totals = calculateOrderTotalsSummary(form.lineItems, form.additionalExpenses || []);
  const today = todayStr();

  const transfers = loadTransfers();
  const nextId = existing.id ?? (Math.max(0, ...transfers.map(t => t.id)) + 1);
  const finalStatus = asDraft ? "draft" : "approved";

  return {
    id: nextId,
    transferNumber: existing.transferNumber,
    transferDate: form.transferDate,
    deliveryDate: form.deliveryDate,
    sourceWarehouseId: sourceWh.id,
    sourceWarehouseName: sourceWh.warehouseName,
    sourceWarehouseCode: sourceWh.warehouseCode,
    targetWarehouseId: targetWh.id,
    targetWarehouseName: targetWh.warehouseName,
    targetWarehouseCode: targetWh.warehouseCode,
    status: finalStatus,
    lineItems: form.lineItems,
    additionalExpenses: form.additionalExpenses || [],
    totalAmount: totals.grandTotal,
    totalItems,
    totalQuantity,
    createdBy: existing.createdBy ?? "Admin",
    createdDate: existing.createdDate ?? today,
    updatedBy: "Admin",
    updatedDate: today,
    packingListId: existing.packingListId,
    packingListNumber: existing.packingListNumber,
    packingStatus: existing.packingStatus,
    cancellationReason: existing.cancellationReason,
    cancelledBy: existing.cancelledBy,
    cancelledDate: existing.cancelledDate,
    rejectionReason: existing.rejectionReason,
    rejectedBy: existing.rejectedBy,
    rejectedDate: existing.rejectedDate,
  };
}

export function canEditTransfer(transfer: StockTransfer): boolean {
  if (transfer.status === "cancelled") return false;
  return ["draft", "pending", "approved", "rejected"].includes(transfer.status);
}

export function cancelStockTransfer(id: number, reason: string): StockTransfer | { error: string } {
  const transfers = loadTransfers();
  const transfer = transfers.find((t) => t.id === id);
  if (!transfer) return { error: "Transfer not found" };
  if (!reason.trim()) return { error: "Cancellation reason is required" };

  const updated: StockTransfer = {
    ...transfer,
    status: "cancelled",
    cancellationReason: reason.trim(),
    cancelledBy: "Admin",
    cancelledDate: todayStr(),
    updatedBy: "Admin",
    updatedDate: todayStr(),
  };

  saveTransfers(transfers.map((t) => (t.id === id ? updated : t)));
  return updated;
}

export function canCancelTransfer(transfer: StockTransfer): boolean {
  if (transfer.status === "cancelled") return false;
  return ["draft", "pending", "approved", "rejected"].includes(transfer.status);
}

export function canDownloadNote(transfer: StockTransfer): boolean {
  return transfer.status !== "cancelled";
}


export function attachPackingListToTransfer(
  transferId: number,
  packingListId: number,
  packingListNumber: string,
  packingStatus: string = "generated",
): StockTransfer | { error: string } {
  const transfers = loadTransfers();
  const transfer = transfers.find(t => t.id === transferId);
  if (!transfer) return { error: "Transfer not found" };

  const updated: StockTransfer = {
    ...transfer,
    packingListId,
    packingListNumber,
    packingStatus,
    updatedBy: "Admin",
    updatedDate: todayStr(),
  };

  saveTransfers(transfers.map(t => (t.id === transferId ? updated : t)));
  return updated;
}

export function approveStockTransfer(id: number): StockTransfer | { error: string } {
  const transfers = loadTransfers();
  const transfer = transfers.find(t => t.id === id);
  if (!transfer) return { error: "Transfer not found" };

  const updated: StockTransfer = {
    ...transfer,
    status: "approved",
    updatedBy: "Admin",
    updatedDate: todayStr(),
  };

  saveTransfers(transfers.map(t => (t.id === id ? updated : t)));
  return updated;
}

export function rejectStockTransfer(id: number, reason: string = "Stock transfer request rejected by administration."): StockTransfer | { error: string } {
  const transfers = loadTransfers();
  const transfer = transfers.find(t => t.id === id);
  if (!transfer) return { error: "Transfer not found" };

  const updated: StockTransfer = {
    ...transfer,
    status: "rejected",
    rejectionReason: reason,
    rejectedBy: "Admin",
    rejectedDate: todayStr(),
    updatedBy: "Admin",
    updatedDate: todayStr(),
  };

  saveTransfers(transfers.map(t => (t.id === id ? updated : t)));
  return updated;
}

export function canGeneratePackingList(transfer: StockTransfer): boolean {
  if (transfer.status === "cancelled" || transfer.status === "draft" || transfer.status === "rejected" || transfer.status === "pending") return false;
  if (transfer.packingListId) return false;
  if (!transfer.sourceWarehouseId || !transfer.targetWarehouseId) return false;
  return transfer.lineItems.some(l => l.productId && l.quantity > 0);
}

export function generatePackingListForTransfer(id: number): StockTransfer | { error: string } {
  const transfers = loadTransfers();
  const transfer = transfers.find(t => t.id === id);
  if (!transfer) return { error: "Transfer not found" };

  if (transfer.packingListId) {
    return { error: "Packing List already generated for this Stock Transfer" };
  }

  if (transfer.lineItems.length === 0 || !transfer.lineItems.some(l => l.productId && l.quantity > 0)) {
    return { error: "Cannot generate Packing List for transfer with no items" };
  }

  if (!transfer.sourceWarehouseId || !transfer.targetWarehouseId) {
    return { error: "Cannot generate Packing List when Source or Target Warehouse is missing" };
  }

  const updated: StockTransfer = {
    ...transfer,
    packingListId: transfer.id,
    packingListNumber: `PL-ST-${String(transfer.id).padStart(3, "0")}`,
    packingStatus: "Pending",
    lineItems: transfer.lineItems.map(item => ({
      ...item,
      packedQty: 0,
      pendingQty: item.quantity,
    })),
    updatedBy: "Admin",
    updatedDate: todayStr(),
  };

  saveTransfers(transfers.map(t => (t.id === id ? updated : t)));
  return updated;
}

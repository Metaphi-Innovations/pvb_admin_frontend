import type { StockMovementEntry } from "@/app/(app)/warehouse/stockoverview/types/stock-position";
import {
  hydrateOrderLineItems,
  loadOrders,
  saveOrders,
  todayStr,
  type SalesOrder,
} from "./orders-data";

const STORAGE_KEY = "ds_sample_issue_movements";

function loadSampleMovements(): StockMovementEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StockMovementEntry[]) : [];
  } catch {
    return [];
  }
}

function saveSampleMovements(entries: StockMovementEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/** Record inventory out-movements when a sample order is dispatched (not at creation). */
export function recordSampleIssueMovements(order: SalesOrder): void {
  const hydrated = hydrateOrderLineItems(order);
  const existing = loadSampleMovements();
  const now = new Date().toISOString();
  const date = todayStr();

  const newEntries: StockMovementEntry[] = hydrated.lineItems
    .filter((line) => line.productId && line.quantity > 0)
    .map((line, index) => ({
      id: `sm-mv-${order.id}-${line.id}-${Date.now()}-${index}`,
      dateTime: now,
      productCode: line.productCode,
      batchNumber: line.batchNumber || "—",
      warehouse: order.warehouseName || "Central Warehouse",
      transactionType: "Sample Issue" as StockMovementEntry["transactionType"],
      referenceNo: order.soNumber,
      inQty: 0,
      outQty: line.quantity,
    }));

  saveSampleMovements([...existing, ...newEntries]);
}

export function getSampleIssueMovements(): StockMovementEntry[] {
  return loadSampleMovements();
}

export function markSampleOrderDispatched(orderId: number): SalesOrder | { error: string } {
  const orders = loadOrders();
  const order = orders.find((o) => o.id === orderId);
  if (!order) return { error: "Order not found" };
  if (order.status === "dispatched" || order.status === "delivered") return hydrateOrderLineItems(order);

  const updated: SalesOrder = {
    ...order,
    status: "dispatched",
    updatedBy: "Admin",
    updatedDate: todayStr(),
  };

  saveOrders(orders.map((o) => (o.id === orderId ? updated : o)));
  recordSampleIssueMovements(updated);
  return hydrateOrderLineItems(updated);
}

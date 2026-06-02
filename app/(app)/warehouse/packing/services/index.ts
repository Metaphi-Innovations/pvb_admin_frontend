import { SalesOrderRecord, PackingRecord, PackingRecordUnion } from "../types";
import {
  getSalesOrderRecords,
  saveSalesOrderRecords,
  getPackingRecords,
  savePackingRecords
} from "../mock-data";

export function getSalesOrders(warehouse: string = "All"): SalesOrderRecord[] {
  const orders = getSalesOrderRecords();
  if (warehouse === "All") return orders;
  return orders.filter(o => o.warehouse === warehouse);
}

export function getPackingRecordsList(warehouse: string = "All"): PackingRecord[] {
  const packings = getPackingRecords();
  if (warehouse === "All") return packings;
  return packings.filter(p => p.warehouse === warehouse);
}

export function getSalesOrderById(id: string): SalesOrderRecord | undefined {
  return getSalesOrderRecords().find(o => o.id === id);
}

export function getPackingRecordById(id: string): PackingRecord | undefined {
  return getPackingRecords().find(p => p.id === id);
}

export function getPackingUnionById(id: string): PackingRecordUnion | undefined {
  const order = getSalesOrderById(id);
  if (order) {
    return { type: "order", data: order };
  }
  const packing = getPackingRecordById(id);
  if (packing) {
    return { type: "packing", data: packing };
  }
  return undefined;
}

export function createPackingRecord(
  salesOrderId: string,
  packingQtyMap: Record<string, number>, // SKU -> Qty packed in this session
  packedBy: string = "Rahul S.",
  isDraft: boolean = false
): PackingRecord | null {
  const orders = getSalesOrderRecords();
  const orderIndex = orders.findIndex(o => o.id === salesOrderId);
  if (orderIndex === -1) return null;

  const order = orders[orderIndex];

  // Create packing product list
  const packingProducts = order.products.map(p => {
    const sessionQty = packingQtyMap[p.sku] || 0;
    return {
      product: p.product,
      sku: p.sku,
      orderedQty: p.orderedQty,
      packedQty: sessionQty
    };
  }).filter(p => p.packedQty > 0);

  // If draft, we don't commit quantities updates on the Sales Order.
  // If not draft, update the Sales Order packed/pending quantities.
  if (!isDraft) {
    let allCompleted = true;
    order.products = order.products.map(p => {
      const sessionQty = packingQtyMap[p.sku] || 0;
      const newPacked = p.packedQty + sessionQty;
      const newPending = Math.max(0, p.orderedQty - newPacked);
      if (newPending > 0) {
        allCompleted = false;
      }
      return {
        ...p,
        packedQty: newPacked,
        pendingQty: newPending
      };
    });

    if (allCompleted) {
      // It is fully packed! For this mock, we can set its status to a finished state
      // or update it. Let's set status or keep it as Partially Packed if some items are left.
      // But since we want to move it, we can update status.
      order.status = "Partially Packed"; // or remove if fully packed, but let's keep it in system.
    } else {
      order.status = "Packing In Progress";
    }

    orders[orderIndex] = order;
    saveSalesOrderRecords(orders);
  }

  // Create the packing record
  const packings = getPackingRecords();
  const nextNo = `PKG-2026-${String(packings.length + 1).padStart(3, "0")}`;
  const totalItems = packingProducts.length;
  const packedQuantity = packingProducts.reduce((sum, p) => sum + p.packedQty, 0);

  const newPacking: PackingRecord = {
    id: `pk-${Date.now()}`,
    packingNo: nextNo,
    salesOrderNo: order.salesOrderNo,
    customer: order.customer,
    totalItems,
    packedQuantity,
    packingDate: new Date().toISOString().split("T")[0],
    packedBy,
    status: isDraft ? "Cancelled" : "Packed", // Or "Packed" status
    warehouse: order.warehouse,
    products: packingProducts
  };

  packings.push(newPacking);
  savePackingRecords(packings);

  return newPacking;
}

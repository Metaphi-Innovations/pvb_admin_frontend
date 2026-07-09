import type { SalesOrderRecord, PackingRecord } from "@/app/(app)/warehouse/packing/types";
import {
  hydrateOrderLineItems,
  loadOrders,
  saveOrders,
  todayStr,
  type SalesOrder,
} from "./orders-data";

const PACKING_READY_STATUSES = ["approved", "confirmed", "packed"] as const;

export function getSampleOrderBySmId(smPrefixedId: string): SalesOrder | undefined {
  const id = Number(smPrefixedId.replace("sm-", ""));
  if (!Number.isFinite(id)) return undefined;
  const order = loadOrders().find((o) => o.id === id);
  return order ? hydrateOrderLineItems(order) : undefined;
}

export function getSampleOrderIdFromPackingRecord(packing: PackingRecord): number | null {
  if (packing.id.startsWith("sm-pkg-")) {
    return Number(packing.id.replace("sm-pkg-", ""));
  }
  if (packing.sourceDocumentType === "Sample Order") {
    const order = loadOrders().find((o) => o.soNumber === packing.salesOrderNo);
    return order?.id ?? null;
  }
  return null;
}

export function getSampleOrderByDocumentNo(documentNo: string): SalesOrder | undefined {
  const order = loadOrders().find((o) => o.soNumber === documentNo.trim());
  return order ? hydrateOrderLineItems(order) : undefined;
}

export function getSampleOrdersForPacking(): SalesOrder[] {
  return loadOrders().filter((order) => {
    if (!PACKING_READY_STATUSES.includes(order.status as (typeof PACKING_READY_STATUSES)[number])) {
      return false;
    }
    if (order.status === "cancelled") return false;
    if (order.packingStatus === "packed" || order.packingStatus === "partially_packed") {
      return false;
    }
    return hydrateOrderLineItems(order).lineItems.some((l) => l.productId && l.quantity > 0);
  });
}

export function mapSampleOrderToPackingRecord(order: SalesOrder): SalesOrderRecord {
  const hydrated = hydrateOrderLineItems(order);
  const totalQuantity = hydrated.lineItems.reduce((sum, line) => sum + (line.quantity || 0), 0);

  return {
    id: `sm-${order.id}`,
    salesOrderNo: order.soNumber,
    customer: order.issuedToEmployeeName
      ? `${order.issuedToEmployeeName}${order.issuedToEmployeeRole ? ` (${order.issuedToEmployeeRole})` : ""}`
      : order.customerName,
    totalItems: hydrated.lineItems.length,
    totalQuantity,
    orderAmount: 0,
    orderDate: order.orderDate,
    deliveryDate: order.deliveryDate || order.orderDate,
    priority: "Medium",
    status: order.packingStatus === "generated" ? "Packing In Progress" : "Ready For Packing",
    warehouse: order.warehouseName || "Central Warehouse",
    products: hydrated.lineItems
      .filter((l) => l.productId)
      .map((line) => ({
        product: line.productName,
        sku: line.productCode,
        orderedQty: line.quantity,
        packedQty: 0,
        pendingQty: line.quantity,
        ordered_cases: 0,
        pending_cases: 0,
      })),
    sourceDocumentType: "Sample Order",
    sourceDocumentNo: order.soNumber,
    sourceWarehouse: order.warehouseName || "Central Warehouse",
    targetWarehouse: "—",
    createdDate: order.createdDate,
    packingListNo: order.packingListNumber || `PL-${order.soNumber}`,
  };
}

/** Persist warehouse packing completion for a sample order. */
export function updateSampleOrderAfterWarehousePacking(
  orderId: number,
  packingListNumber: string,
  isDraft: boolean,
  packedBy: string = "Admin",
): SalesOrder | null {
  const orders = loadOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) return null;

  if (isDraft) return hydrateOrderLineItems(orders[index]);

  const current = orders[index];
  const updated: SalesOrder = {
    ...current,
    packingListNumber,
    packingStatus: "packed",
    status:
      current.status === "approved" || current.status === "confirmed"
        ? "packed"
        : current.status,
    updatedBy: packedBy,
    updatedDate: todayStr(),
  };

  orders[index] = updated;
  saveOrders(orders);
  return hydrateOrderLineItems(updated);
}

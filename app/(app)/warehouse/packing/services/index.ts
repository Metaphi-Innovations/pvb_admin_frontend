import { SalesOrderRecord, PackingRecord, PackingRecordUnion } from "../types";
import {
  getSalesOrderRecords,
  saveSalesOrderRecords,
  getPackingRecords,
  savePackingRecords
} from "../mock-data";
import { loadTransfers, saveTransfers, type StockTransfer } from "@/app/(app)/sales/stock-transfer/stock-transfer-data";

function mapStockTransferToSalesOrder(st: StockTransfer): SalesOrderRecord {
  return {
    id: `st-${st.id}`,
    salesOrderNo: st.transferNumber,
    customer: `Transfer to ${st.targetWarehouseName}`,
    totalItems: st.totalItems,
    totalQuantity: st.totalQuantity,
    orderAmount: st.totalAmount,
    orderDate: st.transferDate,
    deliveryDate: st.deliveryDate,
    priority: "Medium",
    status: st.packingStatus === "In Progress" ? "Packing In Progress" : "Ready For Packing",
    warehouse: st.sourceWarehouseName,
    products: st.lineItems.map(item => ({
      product: item.productName,
      sku: item.productCode,
      orderedQty: item.quantity,
      packedQty: (item as any).packedQty ?? 0,
      pendingQty: (item as any).pendingQty ?? item.quantity,
    })),
    sourceDocumentType: "Stock Transfer",
    sourceDocumentNo: st.transferNumber,
    sourceWarehouse: st.sourceWarehouseName,
    targetWarehouse: st.targetWarehouseName,
    createdDate: st.createdDate,
    packingListNo: st.packingListNumber,
  };
}

function mapStockTransferToPacking(st: StockTransfer): PackingRecord {
  const totalItems = st.lineItems.length;
  const packedQuantity = st.lineItems.reduce((sum, item) => sum + ((item as any).packedQty ?? 0), 0);
  return {
    id: `st-pkg-${st.id}`,
    packingNo: st.packingListNumber || `PL-ST-${st.id}`,
    salesOrderNo: st.transferNumber,
    customer: `Transfer to ${st.targetWarehouseName}`,
    totalItems,
    packedQuantity,
    packingDate: st.updatedDate || st.transferDate,
    packedBy: st.updatedBy || "Admin",
    status: "Packed",
    warehouse: st.sourceWarehouseName,
    products: st.lineItems.map(item => ({
      product: item.productName,
      sku: item.productCode,
      orderedQty: item.quantity,
      packedQty: (item as any).packedQty ?? item.quantity,
    })),
    sourceDocumentType: "Stock Transfer",
    sourceDocumentNo: st.transferNumber,
    sourceWarehouse: st.sourceWarehouseName,
    targetWarehouse: st.targetWarehouseName,
    createdDate: st.createdDate,
    packingListNo: st.packingListNumber,
  };
}

export function getSalesOrders(warehouse: string = "All"): SalesOrderRecord[] {
  const orders = getSalesOrderRecords().map(o => ({
    ...o,
    sourceDocumentType: "Sales Order" as const,
    sourceDocumentNo: o.salesOrderNo,
    sourceWarehouse: o.warehouse,
    targetWarehouse: "—",
    createdDate: o.orderDate,
    packingListNo: `PL-${o.salesOrderNo}`,
  }));

  const transfers = loadTransfers()
    .filter(t => t.packingListId && t.packingStatus !== "Completed" && t.status !== "cancelled")
    .map(mapStockTransferToSalesOrder);

  const all = [...orders, ...transfers];
  if (warehouse === "All") return all;
  return all.filter(o => o.warehouse === warehouse || o.sourceWarehouse === warehouse);
}

export function getPackingRecordsList(warehouse: string = "All"): PackingRecord[] {
  const packings = getPackingRecords().map(p => ({
    ...p,
    sourceDocumentType: "Sales Order" as const,
    sourceDocumentNo: p.salesOrderNo,
    sourceWarehouse: p.warehouse,
    targetWarehouse: "—",
    createdDate: p.packingDate,
    packingListNo: p.packingNo,
  }));

  const transfers = loadTransfers()
    .filter(t => t.packingListId && t.packingStatus === "Completed" && t.status !== "cancelled")
    .map(mapStockTransferToPacking);

  const all = [...packings, ...transfers];
  if (warehouse === "All") return all;
  return all.filter(p => p.warehouse === warehouse || p.sourceWarehouse === warehouse);
}

export function getSalesOrderById(id: string): SalesOrderRecord | undefined {
  if (id.startsWith("st-")) {
    const stId = Number(id.replace("st-", ""));
    const transfer = loadTransfers().find(t => t.id === stId);
    return transfer ? mapStockTransferToSalesOrder(transfer) : undefined;
  }
  const order = getSalesOrderRecords().find(o => o.id === id);
  if (order) {
    return {
      ...order,
      sourceDocumentType: "Sales Order",
      sourceDocumentNo: order.salesOrderNo,
      sourceWarehouse: order.warehouse,
      targetWarehouse: "—",
      createdDate: order.orderDate,
      packingListNo: `PL-${order.salesOrderNo}`,
    };
  }
  return undefined;
}

export function getPackingRecordById(id: string): PackingRecord | undefined {
  if (id.startsWith("st-pkg-") || id.startsWith("st-")) {
    const stId = Number(id.replace("st-pkg-", "").replace("st-", ""));
    const transfer = loadTransfers().find(t => t.id === stId);
    return transfer ? mapStockTransferToPacking(transfer) : undefined;
  }
  const packing = getPackingRecords().find(p => p.id === id);
  if (packing) {
    return {
      ...packing,
      sourceDocumentType: "Sales Order",
      sourceDocumentNo: packing.salesOrderNo,
      sourceWarehouse: packing.warehouse,
      targetWarehouse: "—",
      createdDate: packing.packingDate,
      packingListNo: packing.packingNo,
    };
  }
  return undefined;
}

export function getPackingUnionById(id: string): PackingRecordUnion | undefined {
  if (id.startsWith("st-")) {
    const stId = Number(id.replace("st-pkg-", "").replace("st-", ""));
    const transfer = loadTransfers().find(t => t.id === stId);
    if (transfer) {
      if (transfer.packingStatus === "Completed") {
        return { type: "packing", data: mapStockTransferToPacking(transfer) };
      }
      return { type: "order", data: mapStockTransferToSalesOrder(transfer) };
    }
    return undefined;
  }
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
  packingQtyMap: Record<string, number>,
  packedBy: string = "Rahul S.",
  isDraft: boolean = false
): PackingRecord | null {
  if (salesOrderId.startsWith("st-")) {
    const stId = Number(salesOrderId.replace("st-", ""));
    const transfers = loadTransfers();
    const stIndex = transfers.findIndex(t => t.id === stId);
    if (stIndex === -1) return null;
    const transfer = transfers[stIndex];

    const packingProducts = transfer.lineItems.map(item => {
      const sessionQty = packingQtyMap[item.productCode] || 0;
      return {
        product: item.productName,
        sku: item.productCode,
        orderedQty: item.quantity,
        packedQty: sessionQty
      };
    }).filter(p => p.packedQty > 0);

    if (!isDraft) {
      let allCompleted = true;
      transfer.lineItems = transfer.lineItems.map(item => {
        const sessionQty = packingQtyMap[item.productCode] || 0;
        const newPacked = ((item as any).packedQty ?? 0) + sessionQty;
        const newPending = Math.max(0, item.quantity - newPacked);
        if (newPending > 0) {
          allCompleted = false;
        }
        return {
          ...item,
          packedQty: newPacked,
          pendingQty: newPending,
        };
      });

      transfer.packingStatus = allCompleted ? "Completed" : "In Progress";
      transfers[stIndex] = transfer;
      saveTransfers(transfers);
    }

    const nextNo = transfer.packingListNumber || `PL-ST-${transfer.id}`;
    const totalItems = packingProducts.length;
    const packedQuantity = packingProducts.reduce((sum, p) => sum + p.packedQty, 0);

    const newPacking: PackingRecord = {
      id: `st-pkg-${transfer.id}`,
      packingNo: nextNo,
      salesOrderNo: transfer.transferNumber,
      customer: `Transfer to ${transfer.targetWarehouseName}`,
      totalItems,
      packedQuantity,
      packingDate: new Date().toISOString().split("T")[0],
      packedBy,
      status: isDraft ? "Cancelled" : "Packed",
      warehouse: transfer.sourceWarehouseName,
      products: packingProducts,
      sourceDocumentType: "Stock Transfer",
      sourceDocumentNo: transfer.transferNumber,
      sourceWarehouse: transfer.sourceWarehouseName,
      targetWarehouse: transfer.targetWarehouseName,
    };

    return newPacking;
  }

  const orders = getSalesOrderRecords();
  const orderIndex = orders.findIndex(o => o.id === salesOrderId);
  if (orderIndex === -1) return null;

  const order = orders[orderIndex];

  const packingProducts = order.products.map(p => {
    const sessionQty = packingQtyMap[p.sku] || 0;
    return {
      product: p.product,
      sku: p.sku,
      orderedQty: p.orderedQty,
      packedQty: sessionQty
    };
  }).filter(p => p.packedQty > 0);

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
      order.status = "Partially Packed";
    } else {
      order.status = "Packing In Progress";
    }

    orders[orderIndex] = order;
    saveSalesOrderRecords(orders);
  }

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
    status: isDraft ? "Cancelled" : "Packed",
    warehouse: order.warehouse,
    products: packingProducts
  };

  packings.push(newPacking);
  savePackingRecords(packings);

  return newPacking;
}

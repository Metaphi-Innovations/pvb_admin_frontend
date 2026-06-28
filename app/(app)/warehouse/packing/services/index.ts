import { SalesOrderRecord, PackingRecord, PackingRecordUnion, PackedBatchAllocation, PackingNearExpirySchemeEntry } from "../types";
import {
  getSalesOrderRecords,
  saveSalesOrderRecords,
  getPackingRecords,
  savePackingRecords
} from "../mock-data";
import { loadTransfers, saveTransfers, type StockTransfer } from "@/app/(app)/sales/stock-transfer/stock-transfer-data";
import {
  getStockTransfersForPacking,
  mapStockTransferToPackingRecord,
  mapStockTransferToPackingDoneRecord,
  getStockTransferByStId,
  updateStockTransferAfterWarehousePacking,
} from "@/app/(app)/sales/stock-transfer/packing-sync";
import {
  getSampleOrdersForPacking,
  mapSampleOrderToPackingRecord,
  getSampleOrderBySmId,
  updateSampleOrderAfterWarehousePacking,
} from "@/app/(app)/sales/sample-order/packing-sync";
import {
  hasNearExpiryEligibility,
} from "../../dispatch/near-expiry-dispatch";

function mapStockTransferToSalesOrder(st: StockTransfer): SalesOrderRecord {
  return mapStockTransferToPackingRecord(st);
}

function mapStockTransferToPacking(st: StockTransfer): PackingRecord {
  return mapStockTransferToPackingDoneRecord(st);
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

  const transfers = getStockTransfersForPacking().map(mapStockTransferToPackingRecord);

  const sampleOrders = getSampleOrdersForPacking().map(mapSampleOrderToPackingRecord);

  const all = [...orders, ...transfers, ...sampleOrders];
  if (warehouse === "All") return all;
  return all.filter(o => o.warehouse === warehouse || o.sourceWarehouse === warehouse);
}

export function getPackingRecordsList(warehouse: string = "All"): PackingRecord[] {
  const packings = getPackingRecords().map((p) => {
    const isSample =
      p.sourceDocumentType === "Sample Order" ||
      p.salesOrderNo.startsWith("SM-") ||
      p.salesOrderNo.startsWith("SMP-") ||
      p.id.startsWith("sm-pkg-");
    return {
      ...p,
      sourceDocumentType: isSample ? ("Sample Order" as const) : ("Sales Order" as const),
      sourceDocumentNo: p.salesOrderNo,
      sourceWarehouse: p.sourceWarehouse ?? p.warehouse,
      targetWarehouse: p.targetWarehouse ?? "—",
      createdDate: p.packingDate,
      packingListNo: p.packingNo,
    };
  });

  const transfers = loadTransfers()
    .filter(
      (t) =>
        t.status !== "cancelled" &&
        (t.packingStatus === "Completed" ||
          t.status === "packed" ||
          t.status === "ready_to_dispatch"),
    )
    .map(mapStockTransferToPacking);

  const all = [...packings, ...transfers];
  if (warehouse === "All") return all;
  return all.filter(p => p.warehouse === warehouse || p.sourceWarehouse === warehouse);
}

export function getSalesOrderById(id: string): SalesOrderRecord | undefined {
  if (id.startsWith("sm-")) {
    const smId = Number(id.replace("sm-", ""));
    const sample = getSampleOrdersForPacking().find((o) => o.id === smId);
    return sample ? mapSampleOrderToPackingRecord(sample) : undefined;
  }
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
  if (id.startsWith("sm-pkg-")) {
    const packing = getPackingRecords().find((p) => p.id === id);
    if (!packing) return undefined;
    return {
      ...packing,
      sourceDocumentType: "Sample Order",
      sourceDocumentNo: packing.salesOrderNo,
      sourceWarehouse: packing.sourceWarehouse ?? packing.warehouse,
      targetWarehouse: "—",
      createdDate: packing.packingDate,
      packingListNo: packing.packingNo,
    };
  }
  if (id.startsWith("st-pkg-") || id.startsWith("st-")) {
    const stId = Number(id.replace("st-pkg-", "").replace("st-", ""));
    const transfer = loadTransfers().find(t => t.id === stId);
    return transfer ? mapStockTransferToPacking(transfer) : undefined;
  }
  const packing = getPackingRecords().find(p => p.id === id);
  if (packing) {
    const isSample =
      packing.sourceDocumentType === "Sample Order" ||
      packing.salesOrderNo.startsWith("SM-") ||
      packing.salesOrderNo.startsWith("SMP-");
    return {
      ...packing,
      sourceDocumentType: isSample ? "Sample Order" : "Sales Order",
      sourceDocumentNo: packing.salesOrderNo,
      sourceWarehouse: packing.sourceWarehouse ?? packing.warehouse,
      targetWarehouse: "—",
      createdDate: packing.packingDate,
      packingListNo: packing.packingNo,
    };
  }
  return undefined;
}

export function getPackingUnionById(id: string): PackingRecordUnion | undefined {
  if (id.startsWith("sm-")) {
    const order = getSalesOrderById(id);
    if (order) return { type: "order", data: order };
    const packing = getPackingRecordById(id.startsWith("sm-pkg-") ? id : `sm-pkg-${id.replace("sm-", "")}`);
    if (packing) return { type: "packing", data: packing };
    return undefined;
  }
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
  isDraft: boolean = false,
  batchAllocationMap: Record<string, PackedBatchAllocation[]> = {},
  nearExpirySchemes: PackingNearExpirySchemeEntry[] = [],
): PackingRecord | null {
  if (salesOrderId.startsWith("sm-")) {
    const smId = Number(salesOrderId.replace("sm-", ""));
    const order = getSampleOrderBySmId(salesOrderId);
    if (!order) return null;

    const packingProducts = order.lineItems
      .filter((l) => l.productId)
      .map((line) => {
        const sessionQty = packingQtyMap[line.productCode] || 0;
        const batchAllocations = batchAllocationMap[line.productCode] ?? [];
        return {
          product: line.productName,
          sku: line.productCode,
          orderedQty: line.quantity,
          packedQty: sessionQty,
          batchAllocations: batchAllocations.length ? batchAllocations : undefined,
        };
      })
      .filter((p) => p.packedQty > 0);

    const packings = getPackingRecords();
    const nextNo = `PKG-SM-${String(smId).padStart(4, "0")}`;
    const customer = order.issuedToEmployeeName
      ? `${order.issuedToEmployeeName}${order.issuedToEmployeeRole ? ` (${order.issuedToEmployeeRole})` : ""}`
      : order.salesManName;

    if (!isDraft) {
      updateSampleOrderAfterWarehousePacking(smId, nextNo, false, packedBy);
    }

    const newPacking: PackingRecord = {
      id: `sm-pkg-${smId}`,
      packingNo: nextNo,
      salesOrderNo: order.soNumber,
      customer,
      totalItems: packingProducts.length,
      packedQuantity: packingProducts.reduce((sum, p) => sum + p.packedQty, 0),
      packingDate: new Date().toISOString().split("T")[0],
      packedBy,
      status: isDraft ? "Cancelled" : "Packed",
      warehouse: order.warehouseName || "Central Warehouse",
      products: packingProducts,
      sourceDocumentType: "Sample Order",
      sourceDocumentNo: order.soNumber,
      sourceWarehouse: order.warehouseName || "Central Warehouse",
      targetWarehouse: "—",
      nearExpirySchemes: nearExpirySchemes.length ? nearExpirySchemes : undefined,
    };

    const existingIdx = packings.findIndex((p) => p.id === newPacking.id);
    if (existingIdx === -1) {
      packings.push(newPacking);
    } else {
      packings[existingIdx] = newPacking;
    }
    savePackingRecords(packings);
    return newPacking;
  }

  if (salesOrderId.startsWith("st-")) {
    const stId = Number(salesOrderId.replace("st-", ""));
    const transfer = getStockTransferByStId(salesOrderId);
    if (!transfer) return null;

    const packingProducts = transfer.lineItems
      .map((item) => {
        const sessionQty = packingQtyMap[item.productCode] || 0;
        const batchAllocations = batchAllocationMap[item.productCode] ?? [];
        return {
          product: item.productName,
          sku: item.productCode,
          orderedQty: item.quantity,
          packedQty: sessionQty,
          batchAllocations: batchAllocations.length ? batchAllocations : undefined,
        };
      })
      .filter((p) => p.packedQty > 0);

    const nextNo = `PKG-ST-${String(stId).padStart(4, "0")}`;

    if (!isDraft) {
      updateStockTransferAfterWarehousePacking(
        stId,
        nextNo,
        packingQtyMap,
        batchAllocationMap,
        false,
        packedBy,
      );
    }

    const newPacking: PackingRecord = {
      id: `st-pkg-${stId}`,
      packingNo: nextNo,
      salesOrderNo: transfer.transferNumber,
      customer: `Transfer to ${transfer.targetWarehouseName}`,
      totalItems: packingProducts.length,
      packedQuantity: packingProducts.reduce((sum, p) => sum + p.packedQty, 0),
      packingDate: new Date().toISOString().split("T")[0],
      packedBy,
      status: isDraft ? "Cancelled" : "Packed",
      warehouse: transfer.sourceWarehouseName,
      products: packingProducts,
      sourceDocumentType: "Stock Transfer",
      sourceDocumentNo: transfer.transferNumber,
      sourceWarehouse: transfer.sourceWarehouseName,
      targetWarehouse: transfer.targetWarehouseName,
      nearExpirySchemes: nearExpirySchemes.length ? nearExpirySchemes : undefined,
    };

    if (!isDraft) {
      const packings = getPackingRecords();
      const existingIdx = packings.findIndex((p) => p.id === newPacking.id);
      if (existingIdx === -1) {
        packings.push(newPacking);
      } else {
        packings[existingIdx] = newPacking;
      }
      savePackingRecords(packings);
    }

    return newPacking;
  }

  const orders = getSalesOrderRecords();
  const orderIndex = orders.findIndex(o => o.id === salesOrderId);
  if (orderIndex === -1) return null;

  const order = orders[orderIndex];

  const packingProducts = order.products.map(p => {
    const sessionQty = packingQtyMap[p.sku] || 0;
    const batchAllocations = batchAllocationMap[p.sku] ?? [];
    const nearExpirySchemeEligible =
      sessionQty > 0 &&
      hasNearExpiryEligibility({
        productName: p.product,
        sku: p.sku,
        warehouse: order.warehouse,
        customerName: order.customer,
        quantity: sessionQty,
        batchAllocations,
      });
    return {
      product: p.product,
      sku: p.sku,
      orderedQty: p.orderedQty,
      packedQty: sessionQty,
      batchAllocations: batchAllocations.length ? batchAllocations : undefined,
      nearExpirySchemeEligible: nearExpirySchemeEligible || undefined,
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
    products: packingProducts,
    nearExpirySchemes: nearExpirySchemes.length ? nearExpirySchemes : undefined,
  };

  packings.push(newPacking);
  savePackingRecords(packings);

  return newPacking;
}

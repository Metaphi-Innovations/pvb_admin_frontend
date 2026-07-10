import type { SalesOrderRecord, PackingRecord } from "@/app/(app)/warehouse/packing/types";
import {
  hydrateTransferLineItems,
  loadTransfers,
  saveTransfers,
  todayStr,
  type StockTransfer,
  type TransferStatus,
  normalizeTransferStatus,
} from "./stock-transfer-data";

const PACKING_READY_STATUSES: TransferStatus[] = [
  "confirmed",
  "pending_packing",
  "packing_in_progress",
];

export function getStockTransferByStId(stPrefixedId: string): StockTransfer | undefined {
  const id = Number(stPrefixedId.replace("st-", ""));
  if (!Number.isFinite(id)) return undefined;
  const transfer = loadTransfers().find((t) => t.id === id);
  return transfer ? hydrateTransferLineItems(transfer) : undefined;
}

export function getStockTransferByDocumentNo(documentNo: string): StockTransfer | undefined {
  const transfer = loadTransfers().find((t) => t.transferNumber === documentNo.trim());
  return transfer ? hydrateTransferLineItems(transfer) : undefined;
}

export function getStockTransfersForPacking(): StockTransfer[] {
  return loadTransfers()
    .map(hydrateTransferLineItems)
    .filter((transfer) => {
      const status = normalizeTransferStatus(transfer.status);
      if (transfer.status === "cancelled" || status === "rejected") return false;
      if (!PACKING_READY_STATUSES.includes(status)) return false;
      if (transfer.packingStatus === "Completed" || transfer.packingStatus === "packed") return false;
      if (["ready_to_dispatch", "in_transit", "completed"].includes(normalizeTransferStatus(transfer.status))) {
        return false;
      }
      return transfer.lineItems.some((l) => l.productId && l.quantity > 0);
    });
}

export function mapStockTransferToPackingRecord(transfer: StockTransfer): SalesOrderRecord {
  const hydrated = hydrateTransferLineItems(transfer);
  const status = normalizeTransferStatus(hydrated.status);

  return {
    id: `st-${hydrated.id}`,
    salesOrderNo: hydrated.transferNumber,
    customer: `Transfer to ${hydrated.targetWarehouseName}`,
    totalItems: hydrated.totalItems,
    totalQuantity: hydrated.totalQuantity,
    orderAmount: hydrated.totalAmount,
    orderDate: hydrated.transferDate,
    deliveryDate: hydrated.deliveryDate,
    priority: "Medium",
    status:
      hydrated.packingStatus === "In Progress" || status === "packing_in_progress"
        ? "Packing In Progress"
        : "Ready For Packing",
    warehouse: hydrated.sourceWarehouseName,
    products: hydrated.lineItems
      .filter((l) => l.productId)
      .map((line) => ({
        product: line.productName,
        sku: line.productCode,
        orderedQty: line.quantity,
        packedQty: line.packedQty ?? 0,
        pendingQty: line.pendingQty ?? line.quantity,
        ordered_cases: 0,
        pending_cases: 0,
        ordered_base_qty: line.quantity,
        pending_base_qty: line.pendingQty ?? line.quantity,
        orderBaseQty: line.quantity,
        packedBaseQty: line.packedQty ?? 0,
        pendingBaseQty: line.pendingQty ?? line.quantity,
        packSize: 1, // stock transfer uses units typically
      })),
    sourceDocumentType: "Stock Transfer",
    sourceDocumentNo: hydrated.transferNumber,
    sourceWarehouse: hydrated.sourceWarehouseName,
    targetWarehouse: hydrated.targetWarehouseName,
    createdDate: hydrated.createdDate,
    packingListNo: hydrated.packingListNumber || `PL-${hydrated.transferNumber}`,
  };
}

export function mapStockTransferToPackingDoneRecord(transfer: StockTransfer): PackingRecord {
  const hydrated = hydrateTransferLineItems(transfer);
  const packedQuantity = hydrated.lineItems.reduce(
    (sum, item) => sum + (item.packedQty ?? 0),
    0,
  );

  return {
    id: `st-pkg-${hydrated.id}`,
    packingNo: hydrated.packingListNumber || `PKG-ST-${hydrated.id}`,
    salesOrderNo: hydrated.transferNumber,
    customer: `Transfer to ${hydrated.targetWarehouseName}`,
    totalItems: hydrated.lineItems.length,
    packedQuantity,
    packingDate: hydrated.updatedDate || hydrated.transferDate,
    packedBy: hydrated.updatedBy || "Admin",
    status: "Packed",
    warehouse: hydrated.sourceWarehouseName,
    products: hydrated.lineItems.map((item) => ({
      product: item.productName,
      sku: item.productCode,
      orderedQty: item.quantity,
      ordered_cases: 0,
      packedQty: item.packedQty ?? 0,
      orderBaseQty: item.quantity,
      packedBaseQty: item.packedQty ?? 0,
      packSize: 1,
      batchAllocations: item.batchAllocations,
    })),
    sourceDocumentType: "Stock Transfer",
    sourceDocumentNo: hydrated.transferNumber,
    sourceWarehouse: hydrated.sourceWarehouseName,
    targetWarehouse: hydrated.targetWarehouseName,
    createdDate: hydrated.createdDate,
    packingListNo: hydrated.packingListNumber || `PKG-ST-${hydrated.id}`,
  };
}

export function updateStockTransferAfterWarehousePacking(
  transferId: number,
  packingListNumber: string,
  packingQtyMap: Record<string, number>,
  batchAllocationMap: Record<string, { batchNumber: string; expiryDate: string; allocatedQty: number }[]>,
  isDraft: boolean,
  packedBy: string = "Admin",
): StockTransfer | null {
  const transfers = loadTransfers();
  const index = transfers.findIndex((t) => t.id === transferId);
  if (index === -1) return null;

  const current = hydrateTransferLineItems(transfers[index]);
  if (isDraft) return current;

  let allCompleted = true;
  const lineItems = current.lineItems.map((item) => {
    const sessionQty = packingQtyMap[item.productCode] ?? 0;
    const newPacked = (item.packedQty ?? 0) + sessionQty;
    const newPending = Math.max(0, item.quantity - newPacked);
    if (newPending > 0) allCompleted = false;
    return {
      ...item,
      packedQty: newPacked,
      pendingQty: newPending,
      batchAllocations: batchAllocationMap[item.productCode] ?? item.batchAllocations,
    };
  });

  const updated: StockTransfer = {
    ...current,
    lineItems,
    packingListNumber,
    packingListId: current.packingListId ?? transferId,
    packingStatus: allCompleted ? "Completed" : "In Progress",
    status: allCompleted ? "ready_to_dispatch" : "packing_in_progress",
    updatedBy: packedBy,
    updatedDate: todayStr(),
  };

  transfers[index] = updated;
  saveTransfers(transfers);
  return hydrateTransferLineItems(updated);
}

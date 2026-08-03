import type { SalesOrderRecord } from "@/app/(app)/warehouse/packing/types";
import type { PurchaseReturn } from "@/app/(app)/procurement/purchase-returns/purchase-return-data";

const PACKING_QUEUE_KEY = "ds_pret_packing_queue_v1";

function clearPackingQueueLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PACKING_QUEUE_KEY);
  } catch {
    // ignore quota / private-mode errors
  }
}

export function mapPurchaseReturnToPackingOrder(record: PurchaseReturn): SalesOrderRecord {
  clearPackingQueueLocalStorage();
  const warehouse = record.warehouseName || "Central Warehouse";
  const activeItems = record.items.filter((it) => it.selected && it.returnQty > 0);

  return {
    id: `pret-${record.id}`,
    salesOrderNo: record.returnNumber,
    customer: record.supplierName,
    totalItems: record.totalItems,
    totalQuantity: record.totalReturnQty,
    orderAmount: record.summary?.grandTotal ?? 0,
    orderDate: record.returnDate,
    deliveryDate: record.returnDate,
    priority: "Medium",
    status: "Ready For Packing",
    warehouse,
    products: activeItems.map((it) => ({
      lineId: it.id,
      product: it.productName,
      sku: it.productCode,
      orderedQty: it.returnQty,
      packedQty: 0,
      pendingQty: it.returnQty,
      ordered_base_qty: it.returnQty,
      ordered_cases: 0,
      pending_base_qty: it.returnQty,
      pending_cases: 0,
      orderBaseQty: it.returnQty,
      packedBaseQty: 0,
      pendingBaseQty: it.returnQty,
      packSize: 1,
      batchNumber: it.batchNumber,
      grnNo: it.grnNo,
      mfgDate: it.mfgDate,
      expDate: it.expDate,
    })),
    sourceDocumentType: "Purchase Return",
    sourceDocumentNo: record.returnNumber,
    sourceWarehouse: warehouse,
    targetWarehouse: record.supplierName,
    createdDate: record.returnDate,
    packingListNo: `PL-${record.returnNumber}`,
    poNumber: record.poNumber,
    supplierCode: record.supplierCode,
    initiatedBy: record.initiatedBy,
    returnRemarks: record.overallRemarks,
  };
}

export function removePurchaseReturnFromPackingQueue(_returnId: number): void {
  clearPackingQueueLocalStorage();
}

export function getPurchaseReturnByReturnNumber(_returnNumber: string): PurchaseReturn | undefined {
  clearPackingQueueLocalStorage();
  return undefined;
}

export function getPurchaseReturnsForPacking(): SalesOrderRecord[] {
  clearPackingQueueLocalStorage();
  return [];
}

export function addPurchaseReturnToPackingQueue(_record: PurchaseReturn): void {
  clearPackingQueueLocalStorage();
}

export function isPurchaseReturnInPackingQueue(_returnId: number): boolean {
  clearPackingQueueLocalStorage();
  return false;
}

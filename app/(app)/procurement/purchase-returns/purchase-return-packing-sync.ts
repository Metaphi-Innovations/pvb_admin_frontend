import type { SalesOrderRecord } from "@/app/(app)/warehouse/packing/types";
import { getPackingRecords } from "@/app/(app)/warehouse/packing/mock-data";
import type { PurchaseReturn } from "./purchase-return-data";
import { loadPurchaseReturns } from "./purchase-return-data";
import { getPOById } from "../purchase-orders/po-data";

const PACKING_QUEUE_KEY = "ds_pret_packing_queue_v1";

function loadPackingQueueIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PACKING_QUEUE_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function savePackingQueueIds(ids: number[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PACKING_QUEUE_KEY, JSON.stringify(ids));
}

export function mapPurchaseReturnToPackingOrder(record: PurchaseReturn): SalesOrderRecord {
  const po = getPOById(record.poId);
  const warehouse = po?.warehouseName ?? "Central Warehouse";
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
      ordered_cases: it.returnQty,
      pending_cases: it.returnQty,
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

export function removePurchaseReturnFromPackingQueue(returnId: number): void {
  const ids = loadPackingQueueIds().filter((id) => id !== returnId);
  savePackingQueueIds(ids);
}

export function getPurchaseReturnByReturnNumber(returnNumber: string): PurchaseReturn | undefined {
  return loadPurchaseReturns().find((r) => r.returnNumber === returnNumber);
}

export function getPurchaseReturnsForPacking(): SalesOrderRecord[] {
  const ids = new Set(loadPackingQueueIds());
  const packedIds = new Set(
    getPackingRecords()
      .filter((p) => p.id.startsWith("pret-pkg-") && p.status === "Packed")
      .map((p) => Number(p.id.replace("pret-pkg-", ""))),
  );
  return loadPurchaseReturns()
    .filter(
      (r) =>
        (r.status === "issued_for_packing" || ids.has(r.id)) && !packedIds.has(r.id),
    )
    .map(mapPurchaseReturnToPackingOrder);
}

export function addPurchaseReturnToPackingQueue(record: PurchaseReturn): void {
  const ids = loadPackingQueueIds();
  if (!ids.includes(record.id)) {
    savePackingQueueIds([...ids, record.id]);
  }
}

export function isPurchaseReturnInPackingQueue(returnId: number): boolean {
  return loadPackingQueueIds().includes(returnId);
}

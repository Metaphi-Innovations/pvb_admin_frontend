import type { StockMovementEntry } from "@/app/(app)/warehouse/stockoverview/types/stock-position";
import type { PackedBatchAllocation } from "@/app/(app)/warehouse/packing/types";
import {
  getQcPassedStockRecords,
  saveQcPassedStockRecords,
} from "@/app/(app)/warehouse/stockoverview/mock-data";
import {
  hydrateTransferLineItems,
  loadTransfers,
  saveTransfers,
  todayStr,
  type StockTransfer,
} from "./stock-transfer-data";

const MOVEMENTS_KEY = "ds_stock_transfer_movements";

export function loadStockTransferMovements(): StockMovementEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MOVEMENTS_KEY);
    return raw ? (JSON.parse(raw) as StockMovementEntry[]) : [];
  } catch {
    return [];
  }
}

function saveStockTransferMovements(entries: StockMovementEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(entries));
}

export function getStockTransferMovements(): StockMovementEntry[] {
  return loadStockTransferMovements();
}

/** Reduce source warehouse QC-passed stock on dispatch. */
function deductSourceWarehouseStock(
  warehouse: string,
  productName: string,
  batchNumber: string,
  qty: number,
): void {
  const records = getQcPassedStockRecords();
  const idx = records.findIndex(
    (r) =>
      r.warehouse === warehouse &&
      r.product.trim().toLowerCase() === productName.trim().toLowerCase() &&
      r.batchNumber === batchNumber,
  );
  if (idx === -1) return;

  const next = [...records];
  const row = next[idx];
  next[idx] = {
    ...row,
    availableQuantity: Math.max(0, row.availableQuantity - qty),
  };
  saveQcPassedStockRecords(next.filter((r) => r.availableQuantity > 0));
}

/** Add accepted qty to destination warehouse after QC pass. */
export function addDestinationWarehouseStock(input: {
  warehouse: string;
  productName: string;
  batchNumber: string;
  mfgDate: string;
  expiryDate: string;
  qty: number;
}): void {
  const records = getQcPassedStockRecords();
  const idx = records.findIndex(
    (r) =>
      r.warehouse === input.warehouse &&
      r.product.trim().toLowerCase() === input.productName.trim().toLowerCase() &&
      r.batchNumber === input.batchNumber,
  );

  if (idx >= 0) {
    const next = [...records];
    next[idx] = {
      ...next[idx],
      availableQuantity: next[idx].availableQuantity + input.qty,
    };
    saveQcPassedStockRecords(next);
    return;
  }

  saveQcPassedStockRecords([
    ...records,
    {
      id: `st-in-${Date.now()}-${input.batchNumber}`,
      product: input.productName,
      warehouse: input.warehouse,
      batchNumber: input.batchNumber,
      availableQuantity: input.qty,
      reservedQuantity: 0,
      manufacturingDate: input.mfgDate,
      expiryDate: input.expiryDate,
      status: "Available",
      threshold: 10,
    },
  ]);
}

function collectBatchAllocations(transfer: StockTransfer): Array<{
  productName: string;
  productCode: string;
  batchNumber: string;
  expiryDate: string;
  qty: number;
}> {
  const rows: Array<{
    productName: string;
    productCode: string;
    batchNumber: string;
    expiryDate: string;
    qty: number;
  }> = [];

  for (const line of transfer.lineItems) {
    if (line.batchAllocations?.length) {
      for (const alloc of line.batchAllocations) {
        rows.push({
          productName: line.productName,
          productCode: line.productCode,
          batchNumber: alloc.batchNumber,
          expiryDate: alloc.expiryDate,
          qty: alloc.allocatedQty,
        });
      }
    } else if (line.batchNumber && line.quantity > 0) {
      rows.push({
        productName: line.productName,
        productCode: line.productCode,
        batchNumber: line.batchNumber,
        expiryDate: line.expiryDate ?? "",
        qty: line.packedQty ?? line.quantity,
      });
    }
  }

  return rows;
}

/** Record Stock Transfer Out movements and deduct source warehouse stock on dispatch. */
export function recordStockTransferOutOnDispatch(
  transfer: StockTransfer,
  dispatchNo: string,
): void {
  const hydrated = hydrateTransferLineItems(transfer);
  const existing = loadStockTransferMovements();
  const now = new Date().toISOString();
  const date = todayStr();
  const batches = collectBatchAllocations(hydrated);

  const newEntries: StockMovementEntry[] = batches.map((batch, index) => {
    deductSourceWarehouseStock(
      hydrated.sourceWarehouseName,
      batch.productName,
      batch.batchNumber,
      batch.qty,
    );

    return {
      id: `st-out-${hydrated.id}-${batch.batchNumber}-${Date.now()}-${index}`,
      dateTime: now,
      productCode: batch.productCode,
      batchNumber: batch.batchNumber,
      warehouse: hydrated.sourceWarehouseName,
      transactionType: "Stock Transfer Out",
      referenceNo: dispatchNo || hydrated.transferNumber,
      inQty: 0,
      outQty: batch.qty,
    };
  });

  saveStockTransferMovements([...existing, ...newEntries]);
}

/** Record Stock Transfer In ledger entries after QC pass (inventory added via onQcCompleted). */
export function recordStockTransferInLedgerOnly(
  transfer: StockTransfer,
  grnNo: string,
  acceptedLines: Array<{
    productName: string;
    productCode: string;
    batchNumber: string;
    acceptedQty: number;
  }>,
): void {
  const hydrated = hydrateTransferLineItems(transfer);
  const existing = loadStockTransferMovements();
  const now = new Date().toISOString();

  const newEntries: StockMovementEntry[] = acceptedLines
    .filter((line) => line.acceptedQty > 0)
    .map((line, index) => ({
      id: `st-in-${hydrated.id}-${line.batchNumber}-${Date.now()}-${index}`,
      dateTime: now,
      productCode: line.productCode,
      batchNumber: line.batchNumber,
      warehouse: hydrated.targetWarehouseName,
      transactionType: "Stock Transfer In",
      referenceNo: grnNo || hydrated.transferNumber,
      inQty: line.acceptedQty,
      outQty: 0,
    }));

  saveStockTransferMovements([...existing, ...newEntries]);
}

export function markStockTransferDispatched(
  transferId: number,
  dispatchNo: string,
): StockTransfer | { error: string } {
  const transfers = loadTransfers();
  const transfer = transfers.find((t) => t.id === transferId);
  if (!transfer) return { error: "Transfer not found" };

  const hydrated = hydrateTransferLineItems(transfer);
  recordStockTransferOutOnDispatch(hydrated, dispatchNo);

  const updated: StockTransfer = {
    ...hydrated,
    status: "in_transit",
    packingStatus: "Dispatched",
    dispatchNumber: dispatchNo,
    updatedBy: "Admin",
    updatedDate: todayStr(),
  };

  saveTransfers(transfers.map((t) => (t.id === transferId ? updated : t)));
  return updated;
}

export function updateStockTransferStatus(
  transferId: number,
  status: StockTransfer["status"],
  extra?: Partial<StockTransfer>,
): StockTransfer | { error: string } {
  const transfers = loadTransfers();
  const transfer = transfers.find((t) => t.id === transferId);
  if (!transfer) return { error: "Transfer not found" };

  const updated: StockTransfer = {
    ...hydrateTransferLineItems(transfer),
    ...extra,
    status,
    updatedBy: "Admin",
    updatedDate: todayStr(),
  };

  saveTransfers(transfers.map((t) => (t.id === transferId ? updated : t)));
  return updated;
}

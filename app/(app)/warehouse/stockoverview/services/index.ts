import { QcPassedStockRecord, RejectedStockRecord, GrnPendingStockRecord, StockRecordUnion } from "../types";
import {
  getQcPassedStockRecords,
  getRejectedStockRecords,
  getGrnPendingStockRecords,
} from "../mock-data";
import { getStockStatus, isActiveUsableInventory } from "@/lib/accounts/inventory-accounting-data";
import { masterToday } from "@/lib/masters/common";

export function isSellableStockBatch(
  record: Pick<QcPassedStockRecord, "availableQuantity" | "expiryDate">,
  asOn = masterToday(),
): boolean {
  return isActiveUsableInventory(record.availableQuantity, record.expiryDate, asOn);
}

/** QC-passed stock eligible for sales, packing, and dispatch (excludes expired batches). */
export function getSellableQcPassedStockRecords(asOn = masterToday()): QcPassedStockRecord[] {
  return getQcPassedStockRecords().filter((r) => isSellableStockBatch(r, asOn));
}

export function evaluateStockStatus(record: QcPassedStockRecord, asOn = masterToday()): string {
  return getStockStatus(record.expiryDate, asOn);
}

export function getQcPassedStockList(asOn = masterToday()): QcPassedStockRecord[] {
  const records = getQcPassedStockRecords();
  return records.map((r) => ({
    ...r,
    status: evaluateStockStatus(r, asOn),
  }));
}

/** Operational stock list — expired batches excluded from sales/packing/dispatch flows. */
export function getSellableQcPassedStockList(asOn = masterToday()): QcPassedStockRecord[] {
  return getSellableQcPassedStockRecords(asOn).map((r) => ({
    ...r,
    status: evaluateStockStatus(r, asOn),
  }));
}

export function getRejectedStockList(): RejectedStockRecord[] {
  return getRejectedStockRecords();
}

export function getGrnPendingStockList(): GrnPendingStockRecord[] {
  return getGrnPendingStockRecords();
}

export function getStockList(): QcPassedStockRecord[] {
  return getQcPassedStockList();
}

export function getStockById(id: string): StockRecordUnion | undefined {
  const passed = getQcPassedStockRecords().find((r) => r.id === id);
  if (passed) {
    return {
      type: "qc-passed",
      data: {
        ...passed,
        status: evaluateStockStatus(passed),
      },
    };
  }

  const rejected = getRejectedStockRecords().find((r) => r.id === id);
  if (rejected) {
    return {
      type: "rejected",
      data: rejected,
    };
  }

  const pending = getGrnPendingStockRecords().find((r) => r.id === id);
  if (pending) {
    return {
      type: "grn-pending",
      data: pending,
    };
  }

  return undefined;
}

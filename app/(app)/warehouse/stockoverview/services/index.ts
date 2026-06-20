import { QcPassedStockRecord, RejectedStockRecord, GrnPendingStockRecord, StockRecordUnion } from "../types";
import {
  getQcPassedStockRecords,
  getRejectedStockRecords,
  getGrnPendingStockRecords,
} from "../mock-data";
import { getStockStatus } from "@/lib/accounts/inventory-accounting-data";

const TODAY_STR = "2026-06-02";

export function evaluateStockStatus(record: QcPassedStockRecord): string {
  return getStockStatus(record.expiryDate, TODAY_STR);
}

export function getQcPassedStockList(): QcPassedStockRecord[] {
  const records = getQcPassedStockRecords();
  return records.map((r) => ({
    ...r,
    status: evaluateStockStatus(r),
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

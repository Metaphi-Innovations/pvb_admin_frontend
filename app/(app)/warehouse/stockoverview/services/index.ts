import { QcPassedStockRecord, RejectedStockRecord, GrnPendingStockRecord, StockRecordUnion } from "../types";
import {
  getQcPassedStockRecords,
  getRejectedStockRecords,
  getGrnPendingStockRecords,
  saveQcPassedStockRecords,
  saveRejectedStockRecords,
  saveGrnPendingStockRecords
} from "../mock-data";

const TODAY_STR = "2026-06-02";

export function evaluateStockStatus(record: QcPassedStockRecord): string {
  const today = new Date(TODAY_STR);
  const expDate = new Date(record.expiryDate);
  const diffTime = expDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (record.expiryDate < TODAY_STR) {
    return "Expired";
  }
  
  if (diffDays >= 0 && diffDays <= 30) {
    return "Near Expiry";
  }

  if (record.availableQuantity === 0) {
    return "Out Of Stock";
  }

  if (record.availableQuantity > 0 && record.availableQuantity < record.threshold) {
    return "Low Stock";
  }

  if (record.reservedQuantity > 0) {
    return "Reserved";
  }

  return "Available";
}

export function getQcPassedStockList(): QcPassedStockRecord[] {
  const records = getQcPassedStockRecords();
  return records.map(r => ({
    ...r,
    status: evaluateStockStatus(r)
  }));
}

export function getRejectedStockList(): RejectedStockRecord[] {
  return getRejectedStockRecords();
}

export function getGrnPendingStockList(): GrnPendingStockRecord[] {
  return getGrnPendingStockRecords();
}

// For backward compatibility
export function getStockList(): QcPassedStockRecord[] {
  return getQcPassedStockList();
}

// Get stock item by ID (detecting type)
export function getStockById(id: string): StockRecordUnion | undefined {
  // Search in QC Passed
  const passed = getQcPassedStockRecords().find(r => r.id === id);
  if (passed) {
    return {
      type: "qc-passed",
      data: {
        ...passed,
        status: evaluateStockStatus(passed)
      }
    };
  }

  // Search in Rejected
  const rejected = getRejectedStockRecords().find(r => r.id === id);
  if (rejected) {
    return {
      type: "rejected",
      data: rejected
    };
  }

  // Search in GRN Pending
  const pending = getGrnPendingStockRecords().find(r => r.id === id);
  if (pending) {
    return {
      type: "grn-pending",
      data: pending
    };
  }

  return undefined;
}

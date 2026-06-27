import { QcPassedStockRecord, RejectedStockRecord, GrnPendingStockRecord } from "../types";
import { SEED_QC_PASSED_STOCK } from "./qcPassedStock";
import { SEED_REJECTED_STOCK } from "./rejectedStock";
import { SEED_GRN_PENDING_STOCK } from "./grnPendingStock";

// Storage Keys
const KEY_QC_PASSED = "ds_stock_qc_passed";
const KEY_QC_PASSED_VERSION = "ds_stock_qc_passed_version";
const QC_PASSED_SEED_VERSION = "4";
const KEY_REJECTED = "ds_stock_rejected";
const KEY_GRN_PENDING = "ds_stock_grn_pending";

function mergeQcPassedSeed(stored: QcPassedStockRecord[]): QcPassedStockRecord[] {
  const merged = [...stored];
  const indexById = new Map(merged.map((row, index) => [row.id, index]));
  for (const seedRow of SEED_QC_PASSED_STOCK) {
    const existingIndex = indexById.get(seedRow.id);
    if (existingIndex === undefined) {
      merged.push(seedRow);
      indexById.set(seedRow.id, merged.length - 1);
      continue;
    }
    if (
      seedRow.id === "st-26" ||
      seedRow.id === "st-27" ||
      seedRow.id === "st-7" ||
      seedRow.id === "st-21" ||
      seedRow.id === "st-28"
    ) {
      merged[existingIndex] = seedRow;
    }
  }
  return merged;
}

// QC Passed Stock Accessors
export function getQcPassedStockRecords(): QcPassedStockRecord[] {
  if (typeof window === "undefined") return SEED_QC_PASSED_STOCK;
  const version = localStorage.getItem(KEY_QC_PASSED_VERSION);
  const stored = localStorage.getItem(KEY_QC_PASSED);
  if (!stored || version !== QC_PASSED_SEED_VERSION) {
    const merged = mergeQcPassedSeed(stored ? JSON.parse(stored) : []);
    localStorage.setItem(KEY_QC_PASSED, JSON.stringify(merged));
    localStorage.setItem(KEY_QC_PASSED_VERSION, QC_PASSED_SEED_VERSION);
    return merged;
  }
  return mergeQcPassedSeed(JSON.parse(stored));
}

export function saveQcPassedStockRecords(records: QcPassedStockRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_QC_PASSED, JSON.stringify(records));
}

// Rejected Stock Accessors
export function getRejectedStockRecords(): RejectedStockRecord[] {
  if (typeof window === "undefined") return SEED_REJECTED_STOCK;
  const stored = localStorage.getItem(KEY_REJECTED);
  if (!stored) {
    localStorage.setItem(KEY_REJECTED, JSON.stringify(SEED_REJECTED_STOCK));
    return SEED_REJECTED_STOCK;
  }
  return JSON.parse(stored);
}

export function saveRejectedStockRecords(records: RejectedStockRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_REJECTED, JSON.stringify(records));
}

// GRN Pending Stock Accessors
export function getGrnPendingStockRecords(): GrnPendingStockRecord[] {
  if (typeof window === "undefined") return SEED_GRN_PENDING_STOCK;
  const stored = localStorage.getItem(KEY_GRN_PENDING);
  if (!stored) {
    localStorage.setItem(KEY_GRN_PENDING, JSON.stringify(SEED_GRN_PENDING_STOCK));
    return SEED_GRN_PENDING_STOCK;
  }
  return JSON.parse(stored);
}

export function saveGrnPendingStockRecords(records: GrnPendingStockRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_GRN_PENDING, JSON.stringify(records));
}

// Re-export old seed stock as qc passed for compatibility if imported anywhere else
export const SEED_STOCK = SEED_QC_PASSED_STOCK;
export const getStockRecords = getQcPassedStockRecords;
export const saveStockRecords = saveQcPassedStockRecords;

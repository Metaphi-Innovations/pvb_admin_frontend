import { QcPassedStockRecord, RejectedStockRecord, GrnPendingStockRecord, HoldStockRecord } from "../types";
import { SEED_QC_PASSED_STOCK } from "./qcPassedStock";
import { SEED_REJECTED_STOCK } from "./rejectedStock";
import { SEED_GRN_PENDING_STOCK } from "./grnPendingStock";

// Storage Keys
const KEY_QC_PASSED = "ds_stock_qc_passed";
const KEY_QC_PASSED_VERSION = "ds_stock_qc_passed_version";
/** Bump when demo inventory seed changes — forces refresh in development. */
const QC_PASSED_SEED_VERSION = "5";
const KEY_REJECTED = "ds_stock_rejected";
const KEY_GRN_PENDING = "ds_stock_grn_pending";
const KEY_HOLD = "ds_stock_hold";

/** Merge seed rows into stored data; seed rows always win by id. */
function mergeQcPassedSeed(stored: QcPassedStockRecord[]): QcPassedStockRecord[] {
  const seedById = new Map(SEED_QC_PASSED_STOCK.map((row) => [row.id, row]));
  const userRows = stored.filter((row) => !seedById.has(row.id));
  return [...userRows, ...SEED_QC_PASSED_STOCK];
}

// QC Passed Stock Accessors
export function getQcPassedStockRecords(): QcPassedStockRecord[] {
  if (typeof window === "undefined") return SEED_QC_PASSED_STOCK;
  const version = localStorage.getItem(KEY_QC_PASSED_VERSION);
  const stored = localStorage.getItem(KEY_QC_PASSED);
  if (!stored || version !== QC_PASSED_SEED_VERSION) {
    localStorage.setItem(KEY_QC_PASSED, JSON.stringify(SEED_QC_PASSED_STOCK));
    localStorage.setItem(KEY_QC_PASSED_VERSION, QC_PASSED_SEED_VERSION);
    return [...SEED_QC_PASSED_STOCK];
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

// Hold Stock Accessors
export function getHoldStockRecords(): HoldStockRecord[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(KEY_HOLD);
  if (!stored) {
    localStorage.setItem(KEY_HOLD, JSON.stringify([]));
    return [];
  }
  return JSON.parse(stored);
}

export function saveHoldStockRecords(records: HoldStockRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_HOLD, JSON.stringify(records));
}

// Re-export old seed stock as qc passed for compatibility if imported anywhere else
export const SEED_STOCK = SEED_QC_PASSED_STOCK;
export const getStockRecords = getQcPassedStockRecords;
export const saveStockRecords = saveQcPassedStockRecords;

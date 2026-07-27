import type { GrnRecord } from "./types";

const LOCAL_STORAGE_KEY = "ds_grn_records";

function readStored(): GrnRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as GrnRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStored(records: GrnRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
}

/** Local cache helpers retained for legacy stock-transfer flows still reading localStorage. */
export function getGrnRecords(): GrnRecord[] {
  return readStored();
}

export function saveGrnRecord(record: GrnRecord): void {
  if (typeof window === "undefined") return;
  const records = readStored();
  const index = records.findIndex((r) => r.id === record.id);
  if (index >= 0) {
    records[index] = record;
  } else {
    records.unshift(record);
  }
  writeStored(records);
}

export function getGrnById(id: string): GrnRecord | undefined {
  return getGrnRecords().find((r) => r.id === id);
}

export function getGrnByNo(grnNo: string): GrnRecord | undefined {
  return getGrnRecords().find((r) => r.grnNo === grnNo);
}

export function getAlreadyReceivedQty(_poNumber: string, _productId: string): number {
  return 0;
}

export function getEligiblePosForVendor(_vendorName: string): never[] {
  return [];
}

export function getEffectiveReceiptQty(item: {
  receivedQty: number;
  pendingQty?: number;
  orderedQty: number;
  alreadyReceivedQty?: number;
}): number {
  if (item.receivedQty > 0) return item.receivedQty;
  return item.pendingQty ?? Math.max(0, item.orderedQty - (item.alreadyReceivedQty ?? 0));
}

export function buildGrnBatchesFromOcr(): never[] {
  return [];
}

export function mockExtractInvoiceDataFromFiles(): never[] {
  return [];
}

export const MOCK_PRODUCTS: never[] = [];
export const MOCK_POS: never[] = [];

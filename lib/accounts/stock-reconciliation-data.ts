/**
 * Stock reconciliation — physical vs system qty with accounting impact.
 */

import { getQcPassedStockRecords, saveQcPassedStockRecords } from "@/app/(app)/warehouse/stockoverview/mock-data";
import {
  getCostPriceBySku,
  resolveSku,
  type StockValuationRow,
  enrichStockRecord,
} from "@/lib/accounts/inventory-accounting-data";
import { postStockReconciliation } from "@/lib/accounts/posting-engine";

export type ReconciliationStatus = "draft" | "approved" | "posted";

export interface StockReconciliationRecord {
  id: string;
  date: string;
  warehouse: string;
  product: string;
  sku: string;
  batchNo: string;
  systemQty: number;
  physicalQty: number;
  differenceQty: number;
  costPrice: number;
  differenceValue: number;
  reason: string;
  status: ReconciliationStatus;
}

const STORAGE_KEY = "ds_warehouse_stock_reconciliation_v1";

function buildSeed(): StockReconciliationRecord[] {
  const stock = getQcPassedStockRecords();
  const dap = stock.find((s) => s.product === "DAP 50kg" && s.warehouse === "Central Warehouse");
  if (!dap) return [];
  const sku = resolveSku(dap.product);
  const cp = getCostPriceBySku(sku);
  return [
    {
      id: "REC-2026-001",
      date: "2026-05-15",
      warehouse: dap.warehouse,
      product: dap.product,
      sku,
      batchNo: dap.batchNumber,
      systemQty: dap.availableQuantity,
      physicalQty: dap.availableQuantity - 5,
      differenceQty: -5,
      costPrice: cp,
      differenceValue: -5 * cp,
      reason: "Physical count short — possible pilferage",
      status: "posted",
    },
  ];
}

export function loadStockReconciliations(): StockReconciliationRecord[] {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as StockReconciliationRecord[];
  } catch {
    return buildSeed();
  }
}

export function saveStockReconciliations(rows: StockReconciliationRecord[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function stockRowToReconciliationDraft(row: StockValuationRow): Omit<StockReconciliationRecord, "id" | "status"> {
  return {
    date: new Date().toISOString().slice(0, 10),
    warehouse: row.warehouse,
    product: row.product,
    sku: row.sku,
    batchNo: row.batchNo,
    systemQty: row.availableQty,
    physicalQty: row.availableQty,
    differenceQty: 0,
    costPrice: row.costPrice,
    differenceValue: 0,
    reason: "",
  };
}

export function createStockReconciliation(
  input: Omit<StockReconciliationRecord, "id" | "differenceQty" | "differenceValue" | "status">,
): StockReconciliationRecord {
  const diff = input.physicalQty - input.systemQty;
  const record: StockReconciliationRecord = {
    ...input,
    id: `REC-${Date.now()}`,
    differenceQty: diff,
    differenceValue: diff * input.costPrice,
    status: "draft",
  };
  const all = [...loadStockReconciliations(), record];
  saveStockReconciliations(all);
  return record;
}

export function postStockReconciliationRecord(id: string): { ok: boolean; error?: string } {
  const all = loadStockReconciliations();
  const idx = all.findIndex((r) => r.id === id);
  if (idx < 0) return { ok: false, error: "Record not found" };
  const rec = all[idx];
  if (rec.status === "posted") return { ok: false, error: "Already posted" };
  if (rec.differenceQty === 0) return { ok: false, error: "No quantity difference" };

  const result = postStockReconciliation({
    reconciliationId: rec.id,
    reconciliationNo: rec.id,
    date: rec.date,
    amount: Math.abs(rec.differenceValue),
    isIncrease: rec.differenceQty > 0,
    narration: rec.reason,
  });
  if (!result.success) return { ok: false, error: result.error };

  const stock = getQcPassedStockRecords();
  const stockIdx = stock.findIndex(
    (s) =>
      s.product === rec.product &&
      s.warehouse === rec.warehouse &&
      s.batchNumber === rec.batchNo,
  );
  if (stockIdx >= 0) {
    stock[stockIdx] = {
      ...stock[stockIdx],
      availableQuantity: rec.physicalQty,
      status: rec.physicalQty <= stock[stockIdx].threshold ? "Low Stock" : "Available",
    };
    saveQcPassedStockRecords(stock);
  }

  all[idx] = { ...rec, status: "posted" };
  saveStockReconciliations(all);
  return { ok: true };
}

export function getReconciliationStockOptions() {
  return getQcPassedStockRecords().map((s) => enrichStockRecord(s));
}

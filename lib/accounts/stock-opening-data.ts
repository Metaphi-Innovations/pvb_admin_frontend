import { loadAccountItems } from "./account-items-data";

export interface StockOpeningRow {
  id: string;
  financialYear: string;
  date: string;
  warehouse: string;
  itemName: string;
  sku: string;
  openingQty: number;
  rate: number;
  openingValue: number;
  batchNo: string;
  expiryDate: string;
  remarks: string;
}

const STORAGE_KEY = "ds_accounts_stock_opening_v1";

function buildSeed(): StockOpeningRow[] {
  return loadAccountItems().map((item, i) => ({
    id: `so-${item.id}`,
    financialYear: "2026-27",
    date: "2026-04-01",
    warehouse: i % 2 === 0 ? "Central Warehouse" : "North Zone Hub",
    itemName: item.itemName,
    sku: item.sku,
    openingQty: item.openingQty,
    rate: item.openingRate,
    openingValue: item.openingValue,
    batchNo: i === 0 ? "B-UR-99A" : "",
    expiryDate: i === 0 ? "2025-11-01" : "",
    remarks: "Opening stock for FY 2026-27",
  }));
}

export function loadStockOpeningRows(): StockOpeningRow[] {
  if (typeof window === "undefined") return buildSeed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = buildSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as StockOpeningRow[];
  } catch {
    return buildSeed();
  }
}

export function saveStockOpeningRows(rows: StockOpeningRow[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export const WAREHOUSE_OPTIONS = ["Central Warehouse", "North Zone Hub", "South Zone Hub", "East Zone Hub"];

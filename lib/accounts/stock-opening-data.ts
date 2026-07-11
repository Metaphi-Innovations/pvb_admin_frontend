import { loadAccountItems } from "./account-items-data";
import { demoFinancialYearStart } from "@/lib/accounts/demo-date-utils";

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

function defaultSeedFinancialYear(): string {
  const startYear = parseInt(demoFinancialYearStart().slice(0, 4), 10);
  if (!Number.isFinite(startYear)) return "2024-25";
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endShort}`;
}

function buildSeed(): StockOpeningRow[] {
  const fy = defaultSeedFinancialYear();
  const fyStart = demoFinancialYearStart();
  return loadAccountItems().map((item, i) => ({
    id: `so-${item.id}`,
    financialYear: fy,
    date: fyStart,
    warehouse: i % 2 === 0 ? "Central Warehouse" : "North Zone Hub",
    itemName: item.itemName,
    sku: item.sku,
    openingQty: item.openingQty,
    rate: item.openingRate,
    openingValue: item.openingValue,
    batchNo: i === 0 ? "B-UR-99A" : "",
    expiryDate: i === 0 ? "2025-11-01" : "",
    remarks: `Opening stock for FY ${fy}`,
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

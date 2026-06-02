import { ReorderLevel } from "../types";
import { computeStatus } from "../constants";

function make(
  id: string,
  warehouse: string,
  product: string,
  sku: string,
  category: string,
  currentStock: number,
  reservedStock: number,
  reorderLevelQty: number,
  lastUpdated: string
): ReorderLevel {
  return {
    id,
    warehouse,
    product,
    sku,
    category,
    currentStock,
    reservedStock,
    reorderLevelQty,
    status: computeStatus(currentStock, reorderLevelQty),
    lastUpdated,
  };
}

export const SEED_REORDERS: ReorderLevel[] = [
  // Central Warehouse
  make("rl-1",  "Central Warehouse", "Urea 50kg",                "SKU-UR-50",  "Fertilizers",    420,  50,  100, "2026-06-01"),
  make("rl-2",  "Central Warehouse", "DAP 50kg",                 "SKU-DAP-50", "Fertilizers",     80,  20,  100, "2026-06-01"),
  make("rl-3",  "Central Warehouse", "NPK 10:26:26",             "SKU-NPK-26", "Fertilizers",    110,  10,  100, "2026-05-30"),
  make("rl-4",  "Central Warehouse", "Zinc Sulphate 21%",        "SKU-ZN-21",  "Micronutrients",   0,   0,   50, "2026-05-29"),
  make("rl-5",  "Central Warehouse", "Hybrid Maize Seed",        "SKU-MZ-12",  "Seeds",           55,   5,   50, "2026-05-28"),
  make("rl-6",  "Central Warehouse", "Calcium Ammonium Nitrate", "SKU-CAN-01", "Fertilizers",    300,  30,  120, "2026-06-02"),

  // North Zone Hub
  make("rl-7",  "North Zone Hub",    "Urea 50kg",                "SKU-UR-50",  "Fertilizers",    180,  20,  200, "2026-06-01"),
  make("rl-8",  "North Zone Hub",    "DAP 50kg",                 "SKU-DAP-50", "Fertilizers",     30,   5,   80, "2026-05-31"),
  make("rl-9",  "North Zone Hub",    "Potassium Nitrate",        "SKU-KN-01",  "Fertilizers",    250,  10,  100, "2026-06-01"),
  make("rl-10", "North Zone Hub",    "Hybrid Maize Seed",        "SKU-MZ-12",  "Seeds",            0,   0,   60, "2026-05-29"),

  // South Zone Depot
  make("rl-11", "South Zone Depot",  "NPK 10:26:26",             "SKU-NPK-26", "Fertilizers",    200,  15,  150, "2026-05-30"),
  make("rl-12", "South Zone Depot",  "Ammonium Sulphate",        "SKU-AS-01",  "Fertilizers",     70,  10,   80, "2026-06-01"),
  make("rl-13", "South Zone Depot",  "Zinc Sulphate 21%",        "SKU-ZN-21",  "Micronutrients",  40,   0,   50, "2026-05-28"),

  // West Zone Hub
  make("rl-14", "West Zone Hub",     "Urea 50kg",                "SKU-UR-50",  "Fertilizers",    600,  80,  150, "2026-06-02"),
  make("rl-15", "West Zone Hub",     "DAP 50kg",                 "SKU-DAP-50", "Fertilizers",    100,  10,   80, "2026-05-31"),
  make("rl-16", "West Zone Hub",     "Calcium Ammonium Nitrate", "SKU-CAN-01", "Fertilizers",     50,   5,   60, "2026-06-01"),
];

const STORAGE_KEY = "ds_reorder_levels_v2";

export function getReorderRecords(): ReorderLevel[] {
  if (typeof window === "undefined") return SEED_REORDERS;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_REORDERS));
    return SEED_REORDERS;
  }
  return JSON.parse(stored);
}

export function saveReorderRecords(records: ReorderLevel[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

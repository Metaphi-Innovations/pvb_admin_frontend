export const WAREHOUSE_OPTIONS = [
  { label: "Central Warehouse", value: "Central Warehouse" },
  { label: "North Zone Hub", value: "North Zone Hub" },
  { label: "South Zone Depot", value: "South Zone Depot" },
  { label: "West Zone Hub", value: "West Zone Hub" },
];

export const ALL_WAREHOUSE_VALUES = WAREHOUSE_OPTIONS.map(w => w.value);

export const PRODUCT_OPTIONS = [
  { label: "Urea 50kg", value: "Urea 50kg" },
  { label: "DAP 50kg", value: "DAP 50kg" },
  { label: "NPK 10:26:26", value: "NPK 10:26:26" },
  { label: "Zinc Sulphate 21%", value: "Zinc Sulphate 21%" },
  { label: "Hybrid Maize Seed", value: "Hybrid Maize Seed" },
  { label: "Potassium Nitrate", value: "Potassium Nitrate" },
  { label: "Calcium Ammonium Nitrate", value: "Calcium Ammonium Nitrate" },
  { label: "Ammonium Sulphate", value: "Ammonium Sulphate" },
];

export const STATUS_OPTIONS = [
  { label: "In Stock", value: "In Stock" },
  { label: "Low Stock", value: "Low Stock" },
];

export const STATUS_BADGE_CONFIG: Record<string, { bg: string; dot: string }> = {
  "In Stock": {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  "Low Stock": {
    bg: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
};

/**
 * Derive status from current stock vs reorder level qty.
 */
export function computeStatus(currentStock: number, reorderLevelQty: number): import("../types").ReorderStockStatus {
  if (currentStock <= reorderLevelQty) {
    return "Low Stock";
  }
  return "In Stock";
}

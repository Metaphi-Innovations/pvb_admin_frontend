export type ReorderStatus = "In Stock" | "Low Stock";

export interface ReorderLevel {
  id: string;
  warehouse: string;
  product: string;
  sku: string;
  category: string;
  currentStock: number;
  reservedStock: number;
  reorderLevelQty: number;   // Single field: minimum stock before reorder triggers
  status: ReorderStatus;
  lastUpdated: string;
}

export interface ReorderFormData {
  warehouse: string;           // "All" = apply to every warehouse
  product: string;
  sku: string;
  category: string;
  reorderLevelQty: number;
}

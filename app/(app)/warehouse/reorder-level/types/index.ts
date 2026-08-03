export type ReorderStockStatus = "In Stock" | "Low Stock";

export interface ReorderLevel {
  id: string;
  srNo: number;
  productId: string;
  product: string;
  productCode: string;
  sku: string;
  category: string;
  unit: string;
  warehouseId: string | null;
  warehouse: string;
  reorderType: "OVERALL" | "WAREHOUSE";
  reorderLevelQty: number;
  currentStock: number;
  reservedStock: number;
  status: ReorderStockStatus;
  remark: string;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  createdDate: string;
  updatedDate: string;
}

export interface ReorderFormData {
  master_item_id: string;
  reorder_type: "OVERALL" | "WAREHOUSE";
  warehouse_id?: string | null;
  reorder_level: number;
  remark?: string;
}

export interface ReorderSummary {
  total: number;
  inStock: number;
  lowStock: number;
}

export interface ReorderDropdownOption {
  label: string;
  value: string;
}

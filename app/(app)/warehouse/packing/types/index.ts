export interface SalesOrderProduct {
  product: string;
  sku: string;
  orderedQty: number;
  packedQty: number;
  pendingQty: number;
}

export interface SalesOrderRecord {
  id: string;
  salesOrderNo: string;
  customer: string;
  totalItems: number;
  totalQuantity: number;
  orderAmount: number;
  orderDate: string;
  deliveryDate: string;
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Ready For Packing" | "Partially Packed" | "Packing In Progress";
  warehouse: string;
  products: SalesOrderProduct[];
}

export interface PackedProduct {
  product: string;
  sku: string;
  orderedQty: number;
  packedQty: number;
}

export interface PackingRecord {
  id: string;
  packingNo: string;
  salesOrderNo: string;
  customer: string;
  totalItems: number;
  packedQuantity: number;
  packingDate: string;
  packedBy: string;
  status: "Packed" | "Dispatched" | "Cancelled";
  warehouse: string;
  products: PackedProduct[];
}

export type PackingRecordUnion =
  | { type: "order"; data: SalesOrderRecord }
  | { type: "packing"; data: PackingRecord };

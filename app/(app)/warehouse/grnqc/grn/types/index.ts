export interface ProductItem {
  id: string;
  name: string;
  code: string;
  uom: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  productCode: string;
  orderedQty: number;
}

export interface PurchaseOrder {
  poNumber: string;
  vendorName: string;
  items: PurchaseOrderItem[];
}

export interface GrnItem {
  productId: string;
  productName: string;
  productCode: string;
  orderedQty: number;
  receivedQty: number;
  balanceQty?: number;
  unit?: string;
  batchNumber?: string;
  mfgDate?: string;
  expDate?: string;
  remarks?: string;
  poNumber?: string;
  /** Inventory-tracked products require batch + dates */
  inventoryTracked?: boolean;
}

export interface GrnBatch {
  productId: string;
  productName: string;
  batchNumber: string;
  mfgDate: string;
  expDate: string;
  quantity: number;
  poNumber?: string;
}

export type GrnStatus = "draft" | "submitted" | "qc_pending" | "qc_completed";

export interface GrnRecord {
  id: string;
  grnNo: string;
  poNumber: string;
  poId?: number;
  vendorName: string;
  vendorReference?: string;
  warehouse: string;
  warehouseId?: number;
  grnDate: string;
  totalProducts: number;
  totalQty: number;
  status: GrnStatus;
  items: GrnItem[];
  batches: GrnBatch[];
  activity?: Array<{ date: string; time?: string; action: string; by: string; remarks?: string }>;
  createdBy?: string;
  updatedBy?: string;
}

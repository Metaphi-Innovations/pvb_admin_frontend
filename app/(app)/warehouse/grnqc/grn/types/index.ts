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

export type PoStatus = "approved" | "pending" | "cancelled";

export interface PurchaseOrder {
  poNumber: string;
  vendorName: string;
  status: PoStatus;
  items: PurchaseOrderItem[];
}

export interface GrnItem {
  productId: string;
  productName: string;
  productCode: string;
  orderedQty: number;
  /** Quantity already received in prior GRNs */
  alreadyReceivedQty?: number;
  /** Remaining quantity eligible for this GRN */
  pendingQty?: number;
  /** Current received quantity entered on this GRN */
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
  invoiceNumber?: string;
  invoiceDate?: string;
  gstRate?: number;
  invoiceRate?: number;
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
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceFileName?: string;
  invoiceFileNames?: string[];
  activity?: Array<{ date: string; time?: string; action: string; by: string; remarks?: string }>;
  createdBy?: string;
  updatedBy?: string;
}

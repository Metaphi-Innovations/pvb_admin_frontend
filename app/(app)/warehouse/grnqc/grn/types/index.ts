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
  poNumber?: string;
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
  vendorName: string;
  vendorReference?: string;
  warehouse: string;
  grnDate: string;
  totalProducts: number;
  totalQty: number;
  status: GrnStatus;
  items: GrnItem[];
  batches: GrnBatch[];
}

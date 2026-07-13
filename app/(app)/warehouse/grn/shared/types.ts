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
  poLineId?: number;
}

export type PoStatus = "approved" | "pending" | "cancelled";

export interface PurchaseOrder {
  poNumber: string;
  poId?: number;
  vendorName: string;
  status: PoStatus;
  items: PurchaseOrderItem[];
}

/** Warehouse-only GRN lifecycle — no procurement matching states */
export type GrnStatus = "pending_qc" | "qc_in_progress" | "qc_completed";

export interface GrnItem {
  productId: string;
  productName: string;
  productCode: string;
  poLineId?: number;
  /** Purchase order product UUID — used for edit/create submit */
  sourceItemId?: string;
  orderedQty: number;
  /** Quantity already received in prior GRNs */
  alreadyReceivedQty?: number;
  /** Remaining quantity eligible for this GRN: Ordered − Previously Received */
  pendingQty?: number;
  /** Current received quantity entered on this GRN (this is the base_qty) */
  receivedQty: number;
  receivedCases?: number;
  receivedLooseQty?: number;
  unitPerPacking?: number;
  balanceQty?: number;
  unit?: string;
  serialNumber?: string;
  batchNumber?: string;
  mfgDate?: string;
  expDate?: string;
  remarks?: string;
  poNumber?: string;
  inventoryTracked?: boolean;
}

/** Batch receipt row — mandatory batch, MFG, expiry for every received product/batch */
export interface GrnBatch {
  productId: string;
  productName: string;
  /** SKU — required at save; backfilled from order item when missing */
  productCode?: string;
  batchNumber: string;
  mfgDate: string;
  expDate: string;
  /** Physical received batch qty — flows to QC / inventory */
  quantity: number;
  receivedCases?: number;
  receivedLooseQty?: number;
  unitPerPacking?: number;
  poNumber?: string;
  poLineId?: number;
  invoiceNumber?: string;
  serialNumber?: string;
  /** OCR invoice line fields — read-only display */
  invoiceQty?: number;
  unitPrice?: number;
  gstPct?: number;
  gstAmount?: number;
  totalAmount?: number;
}

export interface GrnSupplierInvoice {
  id: string;
  fileName: string;
  uploadedAt: string;
}

/** OCR-extracted invoice line — stored as-is, no matching/validation in Warehouse */
export interface GrnOcrLineItem {
  productName: string;
  sku: string;
  batchNumber: string;
  mfgDate: string;
  expDate: string;
  invoiceQty: number;
  unitPrice: number;
  gst: number;
  gstAmount: number;
  totalAmount: number;
}

export interface GrnOcrExtractedInvoice {
  invoiceId: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  sourceFileId: string;
  confidenceScore: number;
  lineItems: GrnOcrLineItem[];
  extractedAt: string;
}

export interface GrnRecord {
  id: string;
  grnNo: string;
  poNumber: string;
  poId?: number;
  /** Purchase order UUID (source_id) — used for edit prefill */
  sourceId?: string;
  /** Supplier UUID — used for edit prefill */
  supplierId?: string;
  vendorName: string;
  vendorReference?: string;
  warehouse: string;
  warehouseId?: number;
  /** Warehouse UUID — used for edit / submit */
  warehouseUuid?: string;
  grnDate: string;
  deliveryChallan?: string;
  deliveryChallanFileName?: string;
  totalProducts: number;
  totalQty: number;
  status: GrnStatus;
  items: GrnItem[];
  batches: GrnBatch[];
  supplierInvoices: GrnSupplierInvoice[];
  ocrExtractedInvoices: GrnOcrExtractedInvoice[];
  ocrExtractionCompleted: boolean;
  /** @deprecated Use supplierInvoices — kept for legacy localStorage records */
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceFileName?: string;
  invoiceFileNames?: string[];
  activity?: Array<{ date: string; time?: string; action: string; by: string; remarks?: string }>;
  createdBy?: string;
  updatedBy?: string;
  /** Stock Transfer / Sales Return / Sample Return inward receipt */
  sourceType?: "purchase_order" | "stock_transfer" | "sales_return" | "sample_return";
  stockTransferNo?: string;
  fromWarehouse?: string;
  toWarehouse?: string;
  dispatchNumber?: string;
  dispatchDate?: string;
  receiptStatus?: "pending_receipt" | "partially_received" | "received";
  receiptRemarks?: string;
  salesReturnNo?: string;
  sampleReturnNo?: string;
  customerName?: string;
}

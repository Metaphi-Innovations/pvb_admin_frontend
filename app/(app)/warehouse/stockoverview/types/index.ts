export interface StockRecord {
  id: string;
  product: string;
  warehouse: string;
  batchNumber: string;
  availableQuantity: number;
  reservedQuantity: number;
  manufacturingDate: string;
  expiryDate: string;
  status: string;
  threshold: number;
}

export type QcPassedStockRecord = StockRecord;

export interface RejectedStockRecord {
  id: string;
  product: string;
  warehouse: string;
  batchNumber: string;
  rejectedQuantity: number;
  rejectionReason: string;
  qcNumber: string;
  inspectionDate: string;
  inspector: string;
  remarks?: string;
  status: string; // Rejected, Under Review, Disposed, Returned To Supplier
}

export interface GrnPendingStockRecord {
  id: string;
  grnNo: string;
  product: string;
  warehouse: string;
  batchNumber: string;
  receivedQuantity: number;
  grnDate: string;
  vendor: string;
  status: string; // Pending QC, QC In Progress, Awaiting Inspection
  assignedInspector: string;
  inspectionDueDate: string;
}

export interface HoldStockRecord {
  id: string;
  product: string;
  warehouse: string;
  batchNumber: string;
  holdQuantity: number;
  qcNumber: string;
  grnNo: string;
  inspectionDate: string;
  status: string;
  remarks?: string;
}

export interface SalesReturnStockRecord {
  id: string;
  product: string;
  warehouse: string;
  batchNumber: string;
  availableQuantity: number;
  salesReturnNo: string;
  customer: string;
  returnDate: string;
  expiryDate: string;
  status: string;
}

export interface SampleReturnStockRecord {
  id: string;
  product: string;
  warehouse: string;
  batchNumber: string;
  availableQuantity: number;
  sampleReturnNo: string;
  customer: string;
  returnDate: string;
  expiryDate: string;
  status: string;
}

export type StockRecordUnion =
  | { type: "qc-passed"; data: QcPassedStockRecord }
  | { type: "rejected"; data: RejectedStockRecord }
  | { type: "grn-pending"; data: GrnPendingStockRecord }
  | { type: "hold"; data: HoldStockRecord }
  | { type: "sales-return"; data: SalesReturnStockRecord }
  | { type: "sample-return"; data: SampleReturnStockRecord };

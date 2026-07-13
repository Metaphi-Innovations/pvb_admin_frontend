export type QcResult = "passed" | "failed" | "partial" | "hold";

export interface QcItem {
  productId: string;
  productName: string;
  productCode?: string;
  batchNumber: string;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  holdQty: number;
  
  // Case conversion fields
  receivedCases?: number;
  receivedLooseQty?: number;
  acceptedCases?: number;
  acceptedLooseQty?: number;
  rejectedCases?: number;
  rejectedLooseQty?: number;
  holdCases?: number;
  holdLooseQty?: number;
  unitPerPacking?: number;

  qcResult?: QcResult;
  rejectionReason?: string;
  grnBatchId?: string;
}

export type QcStatus = "pending" | "completed";

export type QcSourceType = "purchase" | "purchase_order" | "stock_transfer" | "sales_return" | "sample_return";

export interface QcRecord {
  id: string;
  qcNo: string;
  grnId?: string;
  grnNo: string;
  poNumber?: string;
  vendorName: string;
  warehouse: string;
  sourceType?: QcSourceType;
  stockTransferNo?: string;
  fromWarehouse?: string;
  toWarehouse?: string;
  /** Blank until inspection starts */
  inspectionDate: string;
  totalReceivedQty: number;
  totalAcceptedQty: number;
  totalRejectedQty: number;
  totalHoldQty: number;
  status: QcStatus;
  qcResult?: QcResult;
  qcRemarks?: string;
  items: QcItem[];
  isEditable?: boolean;
}

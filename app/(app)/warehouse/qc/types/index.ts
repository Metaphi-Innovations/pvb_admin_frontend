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
  qcResult?: QcResult;
  rejectionReason?: string;
}

export type QcStatus = "pending" | "completed";

export type QcSourceType = "purchase_order" | "stock_transfer";

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
}

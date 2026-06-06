export interface QcItem {
  productId: string;
  productName: string;
  batchNumber: string;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  rejectionReason?: string;
}

export type QcStatus = "pending" | "completed";

export interface QcRecord {
  id: string;
  qcNo: string;
  grnNo: string;
  poNumber?: string;
  vendorName: string;
  inspectionDate: string;
  totalAcceptedQty: number;
  totalRejectedQty: number;
  status: QcStatus;
  qcRemarks?: string;
  items: QcItem[];
}

export interface PackedBatchAllocation {
  batchNumber: string;
  expiryDate: string;
  allocatedQty: number;
}

export interface SalesOrderProduct {
  product: string;
  productId?: string;
  sku: string;
  ordered_cases: number;
  packedQty: number;
  pending_cases: number;
  batchNumber?: string;
  grnNo?: string;
  mfgDate?: string;
  expDate?: string;
  lineId?: string;
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
  sourceDocumentType?: "Sales Order" | "Stock Transfer" | "Sample Order" | "Purchase Return";
  sourceDocumentNo?: string;
  sourceWarehouse?: string;
  targetWarehouse?: string;
  createdDate?: string;
  packingListNo?: string;
  poNumber?: string;
  supplierCode?: string;
  initiatedBy?: string;
  returnRemarks?: string;
}

export interface PackedProduct {
  product: string;
  sku: string;
  ordered_cases: number;
  packedQty: number;
  batchAllocations?: PackedBatchAllocation[];
  nearExpirySchemeEligible?: boolean;
  lineId?: string;
}

export interface PackingNearExpirySchemeEntry {
  schemeId: number;
  schemeCode: string;
  schemeName: string;
  schemeType: "Near Expiry";
  product: string;
  productId: string;
  sku: string;
  batchNumber: string;
  batchExpiryDate: string;
  remainingExpiryDays: number;
  dispatchQuantity: number;
  benefitType: string;
  benefitValue: number;
  estimatedBenefitAmount: number;
  schemeStatus: "Active";
  settlementMethod: string;
  settlementStatus: "Pending";
  /** @deprecated Use settlementMethod */
  settlement?: string;
  /** @deprecated Use settlementStatus */
  status?: string;
  pendingSettlement: true;
  dealerPrice?: number;
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
  nearExpirySchemes?: PackingNearExpirySchemeEntry[];
  sourceDocumentType?: "Sales Order" | "Stock Transfer" | "Sample Order" | "Purchase Return";
  sourceDocumentNo?: string;
  sourceWarehouse?: string;
  targetWarehouse?: string;
  createdDate?: string;
  packingListNo?: string;
  poNumber?: string;
  supplierCode?: string;
  initiatedBy?: string;
  returnRemarks?: string;
  orderAmount?: number;
}

export type PackingRecordUnion =
  | { type: "order"; data: SalesOrderRecord }
  | { type: "packing"; data: PackingRecord };

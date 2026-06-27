export interface DispatchProduct {
  product: string;
  sku: string;
  packedQty: number;
  dispatchQty: number;
  unitRate?: number;
  batchNo?: string;
  batchExpiryDate?: string;
  batchAllocations?: { batchNumber: string; expiryDate: string; allocatedQty: number }[];
  nearExpirySchemeEligible?: boolean;
}

export interface DispatchNearExpirySchemeEntry {
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
  /** Scheme master status — only Active schemes are eligible */
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

export interface DeliveryDetails {
  deliveryDate: string;
  receiverName: string;
  remarks: string;
}

export interface DispatchRecord {
  id: string;
  dispatchNumber: string;
  salesOrderNumber: string;
  customer: string;
  vehicleNumber: string;
  driverName: string;
  transporterName: string;
  dispatchDate: string;
  deliveryStatus:
    | "Pending Dispatch"
    | "In Transit"
    | "Delivered"
    | "Partially Delivered"
    | "Returned"
    | "Cancelled";
  warehouse: string;
  products: DispatchProduct[];
  packingNumbers: string[];
  nearExpirySchemes?: DispatchNearExpirySchemeEntry[];
  deliveryDetails?: DeliveryDetails;
  sourceDocumentType?: "Sales Order" | "Stock Transfer" | "Sample Order";
  sourceWarehouse?: string;
  targetWarehouse?: string;

  // Backend-Ready Fields
  dispatch_id?: string;
  dispatch_no?: string;
  source_type?: "sales_order" | "sample_order" | "stock_transfer";
  source_document_id?: string;
  source_document_no?: string;
  dispatch_date?: string;
  customer_id?: string;
  customer_name?: string;
  source_warehouse_id?: string;
  source_warehouse_name?: string;
  target_warehouse_id?: string;
  target_warehouse_name?: string;
  total_items?: number;
  total_quantity?: number;
  dispatch_status?: string;
}

export interface SalesReturnProduct {
  product: string;
  sku: string;
  dispatchQty: number;
  returnQty: number;
}

export interface SalesReturnRecord {
  id: string;
  returnNumber: string;
  dispatchNumber: string;
  salesOrderNumber: string;
  customer: string;
  returnDate: string;
  warehouse: string;
  products: SalesReturnProduct[];
  remarks?: string;
}

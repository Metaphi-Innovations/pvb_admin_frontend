export interface DispatchProduct {
  product: string;
  sku: string;
  packedQty: number;
  dispatchQty: number;
  unitRate?: number;
  batchNo?: string;
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

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

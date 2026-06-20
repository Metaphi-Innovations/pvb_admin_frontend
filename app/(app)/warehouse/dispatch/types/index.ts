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

import { DispatchRecord } from "../types";

export const SEED_DISPATCHES: DispatchRecord[] = [
  {
    id: "dp-1",
    dispatchNumber: "DSP-2026-001",
    salesOrderNumber: "SO-2026-090",
    customer: "Reliance Agri",
    vehicleNumber: "MH-12-AB-1234",
    driverName: "Ramesh Kumar",
    transporterName: "Blue Dart Logistics",
    dispatchDate: "2026-05-26",
    deliveryStatus: "Delivered",
    warehouse: "Central Warehouse",
    packingNumbers: ["PKG-2026-001"],
    products: [
      { product: "Urea 50kg", sku: "SKU-UR-50", packedQty: 300, dispatchQty: 300, unitRate: 2850, batchNo: "B-UR-26A" },
      { product: "NPK 10:26:26", sku: "SKU-NPK-26", packedQty: 200, dispatchQty: 200, unitRate: 3200, batchNo: "B-NPK-26B" },
    ],
    deliveryDetails: {
      deliveryDate: "2026-05-28",
      receiverName: "Vikram Mehta",
      remarks: "Delivered in good condition.",
    },
    // Backend ready
    dispatch_id: "dp-1",
    dispatch_no: "DSP-2026-001",
    source_type: "sales_order",
    sourceDocumentType: "Sales Order",
    source_document_no: "SO-2026-090",
    dispatch_date: "2026-05-26",
    customer_id: "cust-1",
    customer_name: "Reliance Agri",
    total_items: 2,
    total_quantity: 500,
    dispatch_status: "Delivered",
  },
  {
    id: "dp-2",
    dispatchNumber: "DSP-2026-002",
    salesOrderNumber: "SO-2026-092",
    customer: "Mahindra Farms",
    vehicleNumber: "GJ-01-CD-5678",
    driverName: "Sunil Patil",
    transporterName: "DTDC Cargo",
    dispatchDate: "2026-05-27",
    deliveryStatus: "In Transit",
    warehouse: "Central Warehouse",
    packingNumbers: ["PKG-2026-002"],
    products: [
      { product: "DAP 50kg", sku: "SKU-DAP-50", packedQty: 150, dispatchQty: 150 },
    ],
    // Backend ready
    dispatch_id: "dp-2",
    dispatch_no: "DSP-2026-002",
    source_type: "sales_order",
    sourceDocumentType: "Sales Order",
    source_document_no: "SO-2026-092",
    dispatch_date: "2026-05-27",
    customer_id: "cust-2",
    customer_name: "Mahindra Farms",
    total_items: 1,
    total_quantity: 150,
    dispatch_status: "In Transit",
  },
  {
    id: "dp-3",
    dispatchNumber: "DSP-2026-003",
    salesOrderNumber: "SO-2026-095",
    customer: "Tata Agro",
    vehicleNumber: "RJ-14-EF-9012",
    driverName: "Manoj Singh",
    transporterName: "Gati Express",
    dispatchDate: "2026-05-28",
    deliveryStatus: "Returned",
    warehouse: "West Zone Hub",
    packingNumbers: ["PKG-2026-003"],
    products: [
      { product: "Zinc Sulphate 21%", sku: "SKU-ZN-21", packedQty: 150, dispatchQty: 150 },
      { product: "Urea 50kg", sku: "SKU-UR-50", packedQty: 200, dispatchQty: 200 },
    ],
    // Backend ready
    dispatch_id: "dp-3",
    dispatch_no: "DSP-2026-003",
    source_type: "sales_order",
    sourceDocumentType: "Sales Order",
    source_document_no: "SO-2026-095",
    dispatch_date: "2026-05-28",
    customer_id: "cust-3",
    customer_name: "Tata Agro",
    total_items: 2,
    total_quantity: 350,
    dispatch_status: "Returned",
  },
  {
    id: "dp-4",
    dispatchNumber: "DSP-2026-004",
    salesOrderNumber: "SO-2026-101",
    customer: "Karan Johar",
    vehicleNumber: "MH-04-GH-3456",
    driverName: "Prakash Nair",
    transporterName: "VRL Logistics",
    dispatchDate: "2026-06-01",
    deliveryStatus: "Pending Dispatch",
    warehouse: "Central Warehouse",
    packingNumbers: ["PKG-2026-004"],
    products: [
      { product: "Urea 50kg", sku: "SKU-UR-50", packedQty: 150, dispatchQty: 150 },
      { product: "NPK 10:26:26", sku: "SKU-NPK-26", packedQty: 100, dispatchQty: 100 },
    ],
    // Backend ready
    dispatch_id: "dp-4",
    dispatch_no: "DSP-2026-004",
    source_type: "sales_order",
    sourceDocumentType: "Sales Order",
    source_document_no: "SO-2026-101",
    dispatch_date: "2026-06-01",
    customer_id: "cust-4",
    customer_name: "Karan Johar",
    total_items: 2,
    total_quantity: 250,
    dispatch_status: "Pending Dispatch",
  },
  {
    id: "dp-5",
    dispatchNumber: "DSP-2026-005",
    salesOrderNumber: "SM-2026-103",
    customer: "Reliance Agri",
    vehicleNumber: "KA-09-IJ-7890",
    driverName: "Arun Yadav",
    transporterName: "Blue Dart Logistics",
    dispatchDate: "2026-06-02",
    deliveryStatus: "Delivered",
    warehouse: "North Zone Hub",
    packingNumbers: ["PKG-2026-005"],
    products: [
      { product: "Hybrid Maize Seed", sku: "SKU-MZ-12", packedQty: 400, dispatchQty: 400 },
    ],
    // Backend ready
    dispatch_id: "dp-5",
    dispatch_no: "DSP-2026-005",
    source_type: "sample_order",
    sourceDocumentType: "Sample Order",
    source_document_no: "SM-2026-103",
    dispatch_date: "2026-06-02",
    customer_id: "cust-1",
    customer_name: "Reliance Agri",
    total_items: 1,
    total_quantity: 400,
    dispatch_status: "Delivered",
  },
  {
    id: "dp-st-1",
    dispatchNumber: "DSP-2026-ST01",
    salesOrderNumber: "ST-2026-901",
    customer: "Transfer to West Zone Depot",
    vehicleNumber: "MH-12-ST-8899",
    driverName: "Sanjay Dutt",
    transporterName: "VRL Logistics",
    dispatchDate: "2026-06-10",
    deliveryStatus: "Pending Dispatch",
    warehouse: "Central Warehouse",
    sourceWarehouse: "Central Warehouse",
    targetWarehouse: "West Zone Depot",
    packingNumbers: ["PKG-2026-ST01"],
    products: [
      { product: "NPK 10:26:26", sku: "SKU-NPK-26", packedQty: 300, dispatchQty: 300 },
    ],
    // Backend ready
    dispatch_id: "dp-st-1",
    dispatch_no: "DSP-2026-ST01",
    source_type: "stock_transfer",
    sourceDocumentType: "Stock Transfer",
    source_document_no: "ST-2026-901",
    dispatch_date: "2026-06-10",
    source_warehouse_id: "wh-central",
    source_warehouse_name: "Central Warehouse",
    target_warehouse_id: "wh-west",
    target_warehouse_name: "West Zone Depot",
    total_items: 1,
    total_quantity: 300,
    dispatch_status: "Pending Dispatch",
  }
];

const KEY_DISPATCHES = "ds_dispatch_records";
const DISPATCH_DATA_VERSION = 5;
const DISPATCH_VERSION_KEY = "ds_dispatch_records_version";

export function getDispatchRecords(): DispatchRecord[] {
  if (typeof window === "undefined") return SEED_DISPATCHES;
  const version = localStorage.getItem(DISPATCH_VERSION_KEY);
  if (version !== String(DISPATCH_DATA_VERSION)) {
    localStorage.setItem(KEY_DISPATCHES, JSON.stringify(SEED_DISPATCHES));
    localStorage.setItem(DISPATCH_VERSION_KEY, String(DISPATCH_DATA_VERSION));
    return SEED_DISPATCHES;
  }
  const stored = localStorage.getItem(KEY_DISPATCHES);
  if (!stored) {
    localStorage.setItem(KEY_DISPATCHES, JSON.stringify(SEED_DISPATCHES));
    localStorage.setItem(DISPATCH_VERSION_KEY, String(DISPATCH_DATA_VERSION));
    return SEED_DISPATCHES;
  }
  return JSON.parse(stored);
}

export function saveDispatchRecords(records: DispatchRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_DISPATCHES, JSON.stringify(records));
}

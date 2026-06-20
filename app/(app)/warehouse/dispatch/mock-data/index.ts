import { DispatchRecord, SalesReturnRecord } from "../types";

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
      { product: "Urea 50kg", sku: "SKU-UR-50", packedQty: 300, dispatchQty: 300 },
      { product: "NPK 10:26:26", sku: "SKU-NPK-26", packedQty: 200, dispatchQty: 200 },
    ],
    deliveryDetails: {
      deliveryDate: "2026-05-28",
      receiverName: "Vikram Mehta",
      remarks: "Delivered in good condition.",
    },
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
  },
  {
    id: "dp-5",
    dispatchNumber: "DSP-2026-005",
    salesOrderNumber: "SO-2026-103",
    customer: "Reliance Agri",
    vehicleNumber: "KA-09-IJ-7890",
    driverName: "Arun Yadav",
    transporterName: "Blue Dart Logistics",
    dispatchDate: "2026-06-02",
    deliveryStatus: "In Transit",
    warehouse: "North Zone Hub",
    packingNumbers: ["PKG-2026-005"],
    products: [
      { product: "Hybrid Maize Seed", sku: "SKU-MZ-12", packedQty: 400, dispatchQty: 400 },
    ],
  },
  {
    id: "dp-6",
    dispatchNumber: "DSP-2026-006",
    salesOrderNumber: "SO-2026-098",
    customer: "Aditya Birla Group",
    vehicleNumber: "MH-01-KL-2345",
    driverName: "Deepak Sharma",
    transporterName: "DTDC Cargo",
    dispatchDate: "2026-05-30",
    deliveryStatus: "Partially Delivered",
    warehouse: "South Zone Depot",
    packingNumbers: ["PKG-2026-006"],
    products: [
      { product: "DAP 50kg", sku: "SKU-DAP-50", packedQty: 300, dispatchQty: 250 },
      { product: "Zinc Sulphate 21%", sku: "SKU-ZN-21", packedQty: 100, dispatchQty: 100 },
    ],
  },
  {
    id: "dp-abc-demo",
    dispatchNumber: "DSP-001",
    salesOrderNumber: "SO-2026-001",
    customer: "ABC Agro Distributor",
    vehicleNumber: "MH-12-AB-9901",
    driverName: "Rajesh Sharma",
    transporterName: "Pune Agro Logistics",
    dispatchDate: "2026-06-05",
    deliveryStatus: "Delivered",
    warehouse: "Central Warehouse",
    packingNumbers: ["PKG-2026-ABC-001"],
    products: [
      {
        product: "Urea 50kg",
        sku: "FERT-UREA-50",
        packedQty: 50,
        dispatchQty: 50,
        unitRate: 1200,
        batchNo: "BUR-50A",
      },
      {
        product: "NPK 10:26:26",
        sku: "FERT-NPK-1026",
        packedQty: 30,
        dispatchQty: 30,
        unitRate: 480,
        batchNo: "BNPK-26B",
      },
    ],
    deliveryDetails: {
      deliveryDate: "2026-06-06",
      receiverName: "Rajesh Sharma",
      remarks: "Delivered — pending tax invoice.",
    },
  },
  {
    id: "dp-konkan-demo",
    dispatchNumber: "DIS-001",
    salesOrderNumber: "SO-2026-110",
    customer: "Konkan Fertilizer Depot",
    vehicleNumber: "MH-04-KF-7788",
    driverName: "Sameer Patil",
    transporterName: "Konkan Roadways",
    dispatchDate: "2026-06-15",
    deliveryStatus: "Delivered",
    warehouse: "Central Warehouse",
    packingNumbers: ["PKG-2026-110"],
    products: [
      {
        product: "NPK 10:26:26",
        sku: "FERT-NPK-1026",
        packedQty: 10,
        dispatchQty: 10,
        unitRate: 480,
        batchNo: "BNPK-26A",
      },
    ],
    deliveryDetails: {
      deliveryDate: "2026-06-16",
      receiverName: "Sameer Patil",
      remarks: "Delivered — ready for tax invoice.",
    },
  },
];

const KEY_DISPATCHES = "ds_dispatch_records";
const DISPATCH_DATA_VERSION = 3;
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

export const KEY_SALES_RETURNS = "ds_sales_returns";

export function getSalesReturnRecords(): SalesReturnRecord[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(KEY_SALES_RETURNS);
  if (!stored) return [];
  return JSON.parse(stored);
}

export function saveSalesReturnRecords(records: SalesReturnRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_SALES_RETURNS, JSON.stringify(records));
}

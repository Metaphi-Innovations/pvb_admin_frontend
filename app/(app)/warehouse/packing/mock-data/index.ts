import { SalesOrderRecord, PackingRecord } from "../types";

export const SEED_SALES_ORDERS: SalesOrderRecord[] = [
  {
    id: "so-1",
    salesOrderNo: "SO-2026-101",
    customer: "Karan Johar",
    totalItems: 2,
    totalQuantity: 250,
    orderAmount: 12500,
    orderDate: "2026-05-28",
    deliveryDate: "2026-06-05",
    priority: "High",
    status: "Ready For Packing",
    warehouse: "Central Warehouse",
    products: [
      { product: "Urea 50kg", sku: "SKU-UR-50", orderedQty: 150, packedQty: 0, pendingQty: 150 },
      { product: "NPK 10:26:26", sku: "SKU-NPK-26", orderedQty: 100, packedQty: 0, pendingQty: 100 },
    ],
  },
  {
    id: "so-2",
    salesOrderNo: "SO-2026-102",
    customer: "Aditya Birla Group",
    totalItems: 3,
    totalQuantity: 600,
    orderAmount: 32000,
    orderDate: "2026-05-30",
    deliveryDate: "2026-06-06",
    priority: "Urgent",
    status: "Partially Packed",
    warehouse: "Central Warehouse",
    products: [
      { product: "DAP 50kg", sku: "SKU-DAP-50", orderedQty: 300, packedQty: 150, pendingQty: 150 },
      { product: "Zinc Sulphate 21%", sku: "SKU-ZN-21", orderedQty: 200, packedQty: 200, pendingQty: 0 },
      { product: "Urea 50kg", sku: "SKU-UR-50", orderedQty: 100, packedQty: 0, pendingQty: 100 },
    ],
  },
  {
    id: "so-3",
    salesOrderNo: "SO-2026-103",
    customer: "Reliance Agri",
    totalItems: 1,
    totalQuantity: 400,
    orderAmount: 18000,
    orderDate: "2026-06-01",
    deliveryDate: "2026-06-08",
    priority: "Medium",
    status: "Ready For Packing",
    warehouse: "North Zone Hub",
    products: [
      { product: "Hybrid Maize Seed", sku: "SKU-MZ-12", orderedQty: 400, packedQty: 0, pendingQty: 400 },
    ],
  },
  {
    id: "so-4",
    salesOrderNo: "SO-2026-104",
    customer: "Mahindra Farms",
    totalItems: 2,
    totalQuantity: 150,
    orderAmount: 9500,
    orderDate: "2026-06-02",
    deliveryDate: "2026-06-10",
    priority: "Low",
    status: "Packing In Progress",
    warehouse: "South Zone Depot",
    products: [
      { product: "NPK 10:26:26", sku: "SKU-NPK-26", orderedQty: 100, packedQty: 40, pendingQty: 60 },
      { product: "Zinc Sulphate 21%", sku: "SKU-ZN-21", orderedQty: 50, packedQty: 0, pendingQty: 50 },
    ],
  },
  {
    id: "so-5",
    salesOrderNo: "SO-2026-105",
    customer: "Tata Agro",
    totalItems: 2,
    totalQuantity: 300,
    orderAmount: 15000,
    orderDate: "2026-06-02",
    deliveryDate: "2026-06-09",
    priority: "High",
    status: "Ready For Packing",
    warehouse: "West Zone Hub",
    products: [
      { product: "Urea 50kg", sku: "SKU-UR-50", orderedQty: 200, packedQty: 0, pendingQty: 200 },
      { product: "DAP 50kg", sku: "SKU-DAP-50", orderedQty: 100, packedQty: 0, pendingQty: 100 },
    ],
  },
];

export const SEED_PACKINGS: PackingRecord[] = [
  {
    id: "pk-1",
    packingNo: "PKG-2026-001",
    salesOrderNo: "SO-2026-090",
    customer: "Reliance Agri",
    totalItems: 2,
    packedQuantity: 500,
    packingDate: "2026-05-25",
    packedBy: "Rahul S.",
    status: "Packed",
    warehouse: "Central Warehouse",
    products: [
      { product: "Urea 50kg", sku: "SKU-UR-50", orderedQty: 300, packedQty: 300 },
      { product: "NPK 10:26:26", sku: "SKU-NPK-26", orderedQty: 200, packedQty: 200 },
    ],
  },
  {
    id: "pk-2",
    packingNo: "PKG-2026-002",
    salesOrderNo: "SO-2026-092",
    customer: "Mahindra Farms",
    totalItems: 1,
    packedQuantity: 150,
    packingDate: "2026-05-26",
    packedBy: "Suresh P.",
    status: "Dispatched",
    warehouse: "Central Warehouse",
    products: [
      { product: "DAP 50kg", sku: "SKU-DAP-50", orderedQty: 150, packedQty: 150 },
    ],
  },
  {
    id: "pk-3",
    packingNo: "PKG-2026-003",
    salesOrderNo: "SO-2026-095",
    customer: "Tata Agro",
    totalItems: 2,
    packedQuantity: 350,
    packingDate: "2026-05-27",
    packedBy: "Amit V.",
    status: "Cancelled",
    warehouse: "West Zone Hub",
    products: [
      { product: "Zinc Sulphate 21%", sku: "SKU-ZN-21", orderedQty: 150, packedQty: 150 },
      { product: "Urea 50kg", sku: "SKU-UR-50", orderedQty: 200, packedQty: 200 },
    ],
  },
];

const KEY_SALES_ORDERS = "ds_packing_sales_orders";
const KEY_PACKINGS = "ds_packing_records";

export function getSalesOrderRecords(): SalesOrderRecord[] {
  if (typeof window === "undefined") return SEED_SALES_ORDERS;
  const stored = localStorage.getItem(KEY_SALES_ORDERS);
  if (!stored) {
    localStorage.setItem(KEY_SALES_ORDERS, JSON.stringify(SEED_SALES_ORDERS));
    return SEED_SALES_ORDERS;
  }
  return JSON.parse(stored);
}

export function saveSalesOrderRecords(records: SalesOrderRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_SALES_ORDERS, JSON.stringify(records));
}

export function getPackingRecords(): PackingRecord[] {
  if (typeof window === "undefined") return SEED_PACKINGS;
  const stored = localStorage.getItem(KEY_PACKINGS);
  if (!stored) {
    localStorage.setItem(KEY_PACKINGS, JSON.stringify(SEED_PACKINGS));
    return SEED_PACKINGS;
  }
  return JSON.parse(stored);
}

export function savePackingRecords(records: PackingRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_PACKINGS, JSON.stringify(records));
}

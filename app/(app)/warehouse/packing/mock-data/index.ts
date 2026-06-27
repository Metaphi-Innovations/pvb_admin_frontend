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
  {
    id: "so-ne-demo",
    salesOrderNo: "SO-2026-NE-DEMO",
    customer: "Agro Solutions Pvt Ltd",
    totalItems: 1,
    totalQuantity: 40,
    orderAmount: 16800,
    orderDate: "2026-06-20",
    deliveryDate: "2026-06-28",
    priority: "High",
    status: "Ready For Packing",
    warehouse: "Central Warehouse",
    products: [
      {
        product: "Bio Fertilizer A",
        sku: "BIO-000001",
        orderedQty: 40,
        packedQty: 0,
        pendingQty: 40,
      },
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
  {
    id: "pk-ne-demo",
    packingNo: "PKG-2026-NE-DEMO",
    salesOrderNo: "SO-2026-NE-DEMO",
    customer: "Agro Solutions Pvt Ltd",
    totalItems: 1,
    packedQuantity: 30,
    packingDate: "2026-06-25",
    packedBy: "Rahul S.",
    status: "Packed",
    warehouse: "Central Warehouse",
    products: [
      {
        product: "Bio Fertilizer A",
        sku: "BIO-000001",
        orderedQty: 40,
        packedQty: 30,
        batchAllocations: [
          {
            batchNumber: "B001",
            expiryDate: "2026-07-21",
            allocatedQty: 30,
          },
        ],
        nearExpirySchemeEligible: true,
      },
    ],
    nearExpirySchemes: [
      {
        schemeId: 9,
        schemeCode: "NE-001",
        schemeName: "Near Expiry 30 Days Offer",
        schemeType: "Near Expiry",
        product: "Bio Fertilizer A",
        productId: "10",
        sku: "BIO-000001",
        batchNumber: "B001",
        batchExpiryDate: "2026-07-21",
        remainingExpiryDays: 25,
        dispatchQuantity: 30,
        benefitType: "Percentage",
        benefitValue: 10,
        estimatedBenefitAmount: 1260,
        schemeStatus: "Active",
        settlementMethod: "Credit Note / Journal Voucher",
        settlementStatus: "Pending",
        settlement: "Credit Note / Journal Voucher",
        status: "Pending",
        pendingSettlement: true,
        dealerPrice: 420,
      },
    ],
  },
];

const KEY_SALES_ORDERS = "ds_packing_sales_orders";
const KEY_PACKINGS = "ds_packing_records";
const KEY_PACKING_SEED_VERSION = "ds_packing_seed_version";
const PACKING_SEED_VERSION = "2";

function mergeSalesOrderSeed(stored: SalesOrderRecord[]): SalesOrderRecord[] {
  const merged = [...stored];
  const indexById = new Map(merged.map((row, index) => [row.id, index]));
  for (const seedRow of SEED_SALES_ORDERS) {
    if (!indexById.has(seedRow.id)) {
      merged.push(seedRow);
    }
  }
  return merged;
}

function mergePackingSeed(stored: PackingRecord[]): PackingRecord[] {
  const merged = [...stored];
  const indexById = new Map(merged.map((row, index) => [row.id, index]));
  for (const seedRow of SEED_PACKINGS) {
    const existingIndex = indexById.get(seedRow.id);
    if (existingIndex === undefined) {
      merged.push(seedRow);
      continue;
    }
    if (seedRow.id === "pk-ne-demo") {
      merged[existingIndex] = seedRow;
    }
  }
  return merged;
}

export function getSalesOrderRecords(): SalesOrderRecord[] {
  if (typeof window === "undefined") return SEED_SALES_ORDERS;
  const version = localStorage.getItem(KEY_PACKING_SEED_VERSION);
  const stored = localStorage.getItem(KEY_SALES_ORDERS);
  if (!stored || version !== PACKING_SEED_VERSION) {
    const merged = mergeSalesOrderSeed(stored ? JSON.parse(stored) : []);
    localStorage.setItem(KEY_SALES_ORDERS, JSON.stringify(merged));
    localStorage.setItem(KEY_PACKING_SEED_VERSION, PACKING_SEED_VERSION);
    return merged;
  }
  return mergeSalesOrderSeed(JSON.parse(stored));
}

export function saveSalesOrderRecords(records: SalesOrderRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_SALES_ORDERS, JSON.stringify(records));
}

export function getPackingRecords(): PackingRecord[] {
  if (typeof window === "undefined") return SEED_PACKINGS;
  const version = localStorage.getItem(KEY_PACKING_SEED_VERSION);
  const stored = localStorage.getItem(KEY_PACKINGS);
  if (!stored || version !== PACKING_SEED_VERSION) {
    const merged = mergePackingSeed(stored ? JSON.parse(stored) : []);
    localStorage.setItem(KEY_PACKINGS, JSON.stringify(merged));
    localStorage.setItem(KEY_PACKING_SEED_VERSION, PACKING_SEED_VERSION);
    return merged;
  }
  return mergePackingSeed(JSON.parse(stored));
}

export function savePackingRecords(records: PackingRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY_PACKINGS, JSON.stringify(records));
}

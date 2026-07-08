import { SalesOrderRecord, PackingRecord } from "../types";

export const SEED_SALES_ORDERS: SalesOrderRecord[] = [
  // ── Sales Orders ──
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
    sourceDocumentType: "Sales Order",
    products: [
      { product: "Urea 50kg", sku: "SKU-UR-50", ordered_cases: 150, packedQty: 0, pending_cases: 150 },
      { product: "NPK 10:26:26", sku: "SKU-NPK-26", ordered_cases: 100, packedQty: 0, pending_cases: 100 },
    ],
  },
  {
    id: "so-2",
    salesOrderNo: "SO-2026-102",
    customer: "Aditya Birla Group",
    totalItems: 2,
    totalQuantity: 250,
    orderAmount: 32000,
    orderDate: "2026-05-30",
    deliveryDate: "2026-06-06",
    priority: "Urgent",
    status: "Ready For Packing",
    warehouse: "South Zone Depot",
    sourceDocumentType: "Sales Order",
    products: [
      { product: "Zinc Sulphate 21%", sku: "SKU-ZN-21", ordered_cases: 200, packedQty: 0, pending_cases: 200 },
      { product: "Chlorpyrifos 20 EC", sku: "PRD-004", ordered_cases: 50, packedQty: 0, pending_cases: 50 },
    ],
  },
  // ── Sample Orders ──
  {
    id: "so-3",
    salesOrderNo: "SMP-2026-001",
    customer: "Reliance Agri (Sample)",
    totalItems: 2,
    totalQuantity: 100,
    orderAmount: 0,
    orderDate: "2026-06-01",
    deliveryDate: "2026-06-08",
    priority: "Medium",
    status: "Ready For Packing",
    warehouse: "Central Warehouse",
    sourceDocumentType: "Sample Order",
    products: [
      { product: "DAP Fertilizer", sku: "SKU-DAP-NEW", ordered_cases: 50, packedQty: 0, pending_cases: 50 },
      { product: "Hybrid Tomato Seeds", sku: "SKU-TOM-01", ordered_cases: 50, packedQty: 0, pending_cases: 50 },
    ],
  },
  {
    id: "so-4",
    salesOrderNo: "SMP-2026-002",
    customer: "Mahindra Farms (Sample)",
    totalItems: 2,
    totalQuantity: 80,
    orderAmount: 0,
    orderDate: "2026-06-02",
    deliveryDate: "2026-06-10",
    priority: "Low",
    status: "Ready For Packing",
    warehouse: "North Zone Hub",
    sourceDocumentType: "Sample Order",
    products: [
      { product: "Hybrid Maize Seed", sku: "SKU-MZ-12", ordered_cases: 40, packedQty: 0, pending_cases: 40 },
      { product: "Zinc Sulphate 21%", sku: "SKU-ZN-21", ordered_cases: 40, packedQty: 0, pending_cases: 40 },
    ],
  },
  // ── Stock Transfers ──
  {
    id: "so-5",
    salesOrderNo: "TRF-2026-001",
    customer: "Internal Transfer (West to Central)",
    totalItems: 2,
    totalQuantity: 300,
    orderAmount: 0,
    orderDate: "2026-06-02",
    deliveryDate: "2026-06-09",
    priority: "High",
    status: "Ready For Packing",
    warehouse: "West Zone Hub",
    targetWarehouse: "Central Warehouse",
    sourceDocumentType: "Stock Transfer",
    products: [
      { product: "DAP 50kg", sku: "SKU-DAP-50", ordered_cases: 200, packedQty: 0, pending_cases: 200 },
      { product: "Hybrid Maize Seed", sku: "SKU-MZ-12", ordered_cases: 100, packedQty: 0, pending_cases: 100 },
    ],
  },
  {
    id: "so-6",
    salesOrderNo: "TRF-2026-002",
    customer: "Internal Transfer (Central to South)",
    totalItems: 2,
    totalQuantity: 150,
    orderAmount: 0,
    orderDate: "2026-06-05",
    deliveryDate: "2026-06-12",
    priority: "Medium",
    status: "Ready For Packing",
    warehouse: "Central Warehouse",
    targetWarehouse: "South Zone Depot",
    sourceDocumentType: "Stock Transfer",
    products: [
      { product: "Bio Fertilizer A", sku: "BIO-000001", ordered_cases: 50, packedQty: 0, pending_cases: 50 },
      { product: "NPK 19:19:19", sku: "SKU-NPK-19", ordered_cases: 100, packedQty: 0, pending_cases: 100 },
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
      { product: "Urea 50kg", sku: "SKU-UR-50", ordered_cases: 300, packedQty: 300 },
      { product: "NPK 10:26:26", sku: "SKU-NPK-26", ordered_cases: 200, packedQty: 200 },
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
      { product: "DAP 50kg", sku: "SKU-DAP-50", ordered_cases: 150, packedQty: 150 },
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
      { product: "Zinc Sulphate 21%", sku: "SKU-ZN-21", ordered_cases: 150, packedQty: 150 },
      { product: "Urea 50kg", sku: "SKU-UR-50", ordered_cases: 200, packedQty: 200 },
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
        ordered_cases: 40,
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
const PACKING_SEED_VERSION = "4";

function mergeSalesOrderSeed(stored: SalesOrderRecord[]): SalesOrderRecord[] {
  const seedById = new Map(SEED_SALES_ORDERS.map((row) => [row.id, row]));
  const userRows = stored.filter((row) => !seedById.has(row.id));
  return [...userRows, ...SEED_SALES_ORDERS];
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
    localStorage.setItem(KEY_SALES_ORDERS, JSON.stringify(SEED_SALES_ORDERS));
    localStorage.setItem(KEY_PACKING_SEED_VERSION, PACKING_SEED_VERSION);
    return [...SEED_SALES_ORDERS];
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

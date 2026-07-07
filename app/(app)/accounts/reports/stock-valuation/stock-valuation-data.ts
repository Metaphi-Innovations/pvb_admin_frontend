import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Stock Valuation report — read-only accounts report data (demo seed).
 * Isolated from inventory / warehouse modules.
 */

export type StockValuationStatus = "Available" | "Near Expiry" | "Expired";

export type StockValuationStatusFilter = "all" | StockValuationStatus;

export type StockValuationSortKey =
  | "product"
  | "warehouse"
  | "availableQty"
  | "costPrice"
  | "stockValue"
  | "expiryDate";

export interface StockValuationSeedRecord {
  id: string;
  product: string;
  sku: string;
  category: string;
  uom: string;
  packSize: string;
  unitsPerPack: number;
  batchNo: string;
  warehouse: string;
  availableQty: number;
  costPrice: number;
  mfgDate: string;
  expiryDate: string;
}

export interface StockValuationRow extends StockValuationSeedRecord {
  stockValue: number;
  stockStatus: StockValuationStatus;
}

export interface StockValuationFilters {
  asOnDate: string;
  warehouse?: string;
  category?: string;
  product?: string;
  stockStatus?: StockValuationStatusFilter;
  search?: string;
}

export interface StockValuationTotals {
  count: number;
  totalAvailableQty: number;
  totalStockValue: number;
}

export const STOCK_VALUATION_WAREHOUSES = [
  "Central Warehouse",
  "North Zone Hub",
  "South Zone Depot",
  "West Zone Hub",
  "East Zone Hub",
] as const;

export const STOCK_VALUATION_CATEGORIES = [
  "Fertilizers",
  "Seeds",
  "Pesticides",
  "Micronutrients",
  "Bio Stimulants",
  "Organic Inputs",
] as const;

const SEED_STOCK_VALUATION: StockValuationSeedRecord[] = [
  {
    id: "sv-01",
    product: "Bio Grow Plus",
    sku: "PVB-BIO-001",
    category: "Bio Stimulants",
    uom: "LTR",
    packSize: "500 ML",
    unitsPerPack: 48,
    batchNo: "B-BIO-01A",
    warehouse: "Central Warehouse",
    availableQty: 320,
    costPrice: 185,
    mfgDate: demoDateAt(0),
    expiryDate: "2027-08-01",
  },
  {
    id: "sv-02",
    product: "Bio Grow Plus",
    sku: "PVB-BIO-001",
    category: "Bio Stimulants",
    uom: "LTR",
    packSize: "500 ML",
    unitsPerPack: 48,
    batchNo: "B-BIO-02C",
    warehouse: "North Zone Hub",
    availableQty: 96,
    costPrice: 185,
    mfgDate: demoDateAt(1),
    expiryDate: demoDateAt(2),
  },
  {
    id: "sv-03",
    product: "Urea 50kg",
    sku: "PVB-URE-050",
    category: "Fertilizers",
    uom: "BAG",
    packSize: "50 KG",
    unitsPerPack: 40,
    batchNo: "B-UR-99A",
    warehouse: "Central Warehouse",
    availableQty: 500,
    costPrice: 620,
    mfgDate: demoDateAt(3),
    expiryDate: "2027-11-01",
  },
  {
    id: "sv-04",
    product: "Urea 50kg",
    sku: "PVB-URE-050",
    category: "Fertilizers",
    uom: "BAG",
    packSize: "50 KG",
    unitsPerPack: 40,
    batchNo: "B-UR-44X",
    warehouse: "North Zone Hub",
    availableQty: 80,
    costPrice: 620,
    mfgDate: demoDateAt(4),
    expiryDate: demoDateAt(5),
  },
  {
    id: "sv-05",
    product: "NPK 10:26:26",
    sku: "PVB-NPK-1026",
    category: "Fertilizers",
    uom: "BAG",
    packSize: "50 KG",
    unitsPerPack: 40,
    batchNo: "B-NPK-12B",
    warehouse: "Central Warehouse",
    availableQty: 300,
    costPrice: 1450,
    mfgDate: demoDateAt(6),
    expiryDate: "2027-12-05",
  },
  {
    id: "sv-06",
    product: "Hybrid Maize Seed",
    sku: "PVB-MZ-HYB",
    category: "Seeds",
    uom: "BOX",
    packSize: "5 KG",
    unitsPerPack: 20,
    batchNo: "B-MZ-01X",
    warehouse: "North Zone Hub",
    availableQty: 200,
    costPrice: 890,
    mfgDate: demoDateAt(7),
    expiryDate: demoDateAt(8),
  },
  {
    id: "sv-07",
    product: "DAP 50kg",
    sku: "PVB-DAP-050",
    category: "Fertilizers",
    uom: "BAG",
    packSize: "50 KG",
    unitsPerPack: 40,
    batchNo: "B-DAP-33C",
    warehouse: "Central Warehouse",
    availableQty: 45,
    costPrice: 1380,
    mfgDate: demoDateAt(9),
    expiryDate: "2027-12-01",
  },
  {
    id: "sv-08",
    product: "Zinc Sulphate 21%",
    sku: "PVB-ZN-21",
    category: "Micronutrients",
    uom: "BAG",
    packSize: "25 KG",
    unitsPerPack: 40,
    batchNo: "B-ZN-77Y",
    warehouse: "Central Warehouse",
    availableQty: 140,
    costPrice: 720,
    mfgDate: demoDateAt(10),
    expiryDate: "2027-11-15",
  },
  {
    id: "sv-09",
    product: "Humic Acid 12%",
    sku: "PVB-HUM-12",
    category: "Organic Inputs",
    uom: "KG",
    packSize: "25 KG",
    unitsPerPack: 20,
    batchNo: "B-HUM-11P",
    warehouse: "South Zone Depot",
    availableQty: 180,
    costPrice: 95,
    mfgDate: demoDateAt(11),
    expiryDate: "2027-07-01",
  },
  {
    id: "sv-10",
    product: "Neem Oil EC",
    sku: "PVB-NEM-EC",
    category: "Pesticides",
    uom: "LTR",
    packSize: "1 LTR",
    unitsPerPack: 12,
    batchNo: "B-NEM-08K",
    warehouse: "South Zone Depot",
    availableQty: 72,
    costPrice: 310,
    mfgDate: demoDateAt(12),
    expiryDate: demoDateAt(13),
  },
  {
    id: "sv-11",
    product: "Chlorpyrifos 20% EC",
    sku: "PVB-CPF-20",
    category: "Pesticides",
    uom: "LTR",
    packSize: "500 ML",
    unitsPerPack: 48,
    batchNo: "B-CPF-22M",
    warehouse: "West Zone Hub",
    availableQty: 144,
    costPrice: 245,
    mfgDate: demoDateAt(14),
    expiryDate: demoDateAt(15),
  },
  {
    id: "sv-12",
    product: "Potash 50kg",
    sku: "PVB-POT-050",
    category: "Fertilizers",
    uom: "BAG",
    packSize: "50 KG",
    unitsPerPack: 40,
    batchNo: "B-POT-55D",
    warehouse: "East Zone Hub",
    availableQty: 220,
    costPrice: 980,
    mfgDate: demoDateAt(16),
    expiryDate: "2027-10-20",
  },
  {
    id: "sv-13",
    product: "Paddy Seed IR-64",
    sku: "PVB-PDY-IR64",
    category: "Seeds",
    uom: "BAG",
    packSize: "25 KG",
    unitsPerPack: 40,
    batchNo: "B-PDY-18F",
    warehouse: "South Zone Depot",
    availableQty: 160,
    costPrice: 520,
    mfgDate: demoDateAt(17),
    expiryDate: demoDateAt(18),
  },
  {
    id: "sv-14",
    product: "Boron 20%",
    sku: "PVB-BOR-20",
    category: "Micronutrients",
    uom: "KG",
    packSize: "25 KG",
    unitsPerPack: 20,
    batchNo: "B-BOR-03G",
    warehouse: "West Zone Hub",
    availableQty: 60,
    costPrice: 165,
    mfgDate: demoDateAt(19),
    expiryDate: demoDateAt(20),
  },
  {
    id: "sv-15",
    product: "Seaweed Extract",
    sku: "PVB-SWE-EXT",
    category: "Bio Stimulants",
    uom: "LTR",
    packSize: "250 ML",
    unitsPerPack: 40,
    batchNo: "B-SWE-07H",
    warehouse: "Central Warehouse",
    availableQty: 200,
    costPrice: 142,
    mfgDate: demoDateAt(21),
    expiryDate: "2027-09-20",
  },
  {
    id: "sv-16",
    product: "Glyphosate 41% SL",
    sku: "PVB-GLY-41",
    category: "Pesticides",
    uom: "LTR",
    packSize: "1 LTR",
    unitsPerPack: 12,
    batchNo: "B-GLY-91J",
    warehouse: "North Zone Hub",
    availableQty: 84,
    costPrice: 275,
    mfgDate: demoDateAt(22),
    expiryDate: demoDateAt(23),
  },
  {
    id: "sv-17",
    product: "SSP 50kg",
    sku: "PVB-SSP-050",
    category: "Fertilizers",
    uom: "BAG",
    packSize: "50 KG",
    unitsPerPack: 40,
    batchNo: "B-SSP-66L",
    warehouse: "East Zone Hub",
    availableQty: 380,
    costPrice: 420,
    mfgDate: demoDateAt(24),
    expiryDate: "2027-11-05",
  },
  {
    id: "sv-18",
    product: "Cotton Seed BG-II",
    sku: "PVB-COT-BG2",
    category: "Seeds",
    uom: "BOX",
    packSize: "450 GM",
    unitsPerPack: 48,
    batchNo: "B-COT-12N",
    warehouse: "South Zone Depot",
    availableQty: 96,
    costPrice: 1050,
    mfgDate: demoDateAt(25),
    expiryDate: demoDateAt(26),
  },
  {
    id: "sv-19",
    product: "Mancozeb 75% WP",
    sku: "PVB-MNZ-75",
    category: "Pesticides",
    uom: "KG",
    packSize: "1 KG",
    unitsPerPack: 24,
    batchNo: "B-MNZ-44Q",
    warehouse: "West Zone Hub",
    availableQty: 120,
    costPrice: 198,
    mfgDate: demoDateAt(27),
    expiryDate: "2027-10-01",
  },
  {
    id: "sv-20",
    product: "Calcium Nitrate",
    sku: "PVB-CAN-NIT",
    category: "Fertilizers",
    uom: "BAG",
    packSize: "25 KG",
    unitsPerPack: 40,
    batchNo: "B-CAN-28R",
    warehouse: "Central Warehouse",
    availableQty: 75,
    costPrice: 1180,
    mfgDate: demoDateAt(28),
    expiryDate: "2027-12-10",
  },
  {
    id: "sv-21",
    product: "Bio Grow Plus",
    sku: "PVB-BIO-001",
    category: "Bio Stimulants",
    uom: "LTR",
    packSize: "500 ML",
    unitsPerPack: 48,
    batchNo: "B-BIO-15S",
    warehouse: "South Zone Depot",
    availableQty: 48,
    costPrice: 185,
    mfgDate: demoDateAt(29),
    expiryDate: demoDateAt(30),
  },
  {
    id: "sv-22",
    product: "Ferrous Sulphate",
    sku: "PVB-FES-21",
    category: "Micronutrients",
    uom: "BAG",
    packSize: "25 KG",
    unitsPerPack: 40,
    batchNo: "B-FES-89T",
    warehouse: "North Zone Hub",
    availableQty: 110,
    costPrice: 385,
    mfgDate: demoDateAt(31),
    expiryDate: "2027-08-25",
  },
  {
    id: "sv-23",
    product: "Imidacloprid 17.8% SL",
    sku: "PVB-IMD-178",
    category: "Pesticides",
    uom: "LTR",
    packSize: "100 ML",
    unitsPerPack: 60,
    batchNo: "B-IMD-33U",
    warehouse: "East Zone Hub",
    availableQty: 180,
    costPrice: 88,
    mfgDate: demoDateAt(32),
    expiryDate: demoDateAt(33),
  },
  {
    id: "sv-24",
    product: "Compost Activator",
    sku: "PVB-CMP-ACT",
    category: "Organic Inputs",
    uom: "KG",
    packSize: "10 KG",
    unitsPerPack: 30,
    batchNo: "B-CMP-77V",
    warehouse: "West Zone Hub",
    availableQty: 90,
    costPrice: 215,
    mfgDate: demoDateAt(34),
    expiryDate: "2027-11-01",
  },
];

function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 9999;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function getStockValuationStatus(
  expiryDate: string,
  asOnDate: string,
): StockValuationStatus {
  if (!expiryDate) return "Available";
  const days = daysBetween(asOnDate, expiryDate);
  if (days < 0) return "Expired";
  if (days <= 90) return "Near Expiry";
  return "Available";
}

export function buildStockValuationRows(asOnDate: string): StockValuationRow[] {
  return SEED_STOCK_VALUATION.map((record) => {
    const stockStatus = getStockValuationStatus(record.expiryDate, asOnDate);
    return {
      ...record,
      stockStatus,
      stockValue: record.availableQty * record.costPrice,
    };
  });
}

export function getStockValuationProductOptions(): string[] {
  return [...new Set(SEED_STOCK_VALUATION.map((r) => r.product))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export function filterStockValuationRows(
  rows: StockValuationRow[],
  filters: StockValuationFilters,
): StockValuationRow[] {
  const q = filters.search?.trim().toLowerCase() ?? "";

  return rows.filter((row) => {
    if (row.availableQty <= 0) return false;
    if (filters.warehouse && filters.warehouse !== "all" && row.warehouse !== filters.warehouse) {
      return false;
    }
    if (filters.category && filters.category !== "all" && row.category !== filters.category) {
      return false;
    }
    if (filters.product && filters.product !== "all" && row.product !== filters.product) {
      return false;
    }
    if (
      filters.stockStatus &&
      filters.stockStatus !== "all" &&
      row.stockStatus !== filters.stockStatus
    ) {
      return false;
    }
    if (q) {
      const haystack = [row.product, row.sku, row.batchNo, row.warehouse]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function sortStockValuationRows(
  rows: StockValuationRow[],
  sortKey: StockValuationSortKey,
  sortDir: "asc" | "desc",
): StockValuationRow[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "product":
        cmp = a.product.localeCompare(b.product);
        break;
      case "warehouse":
        cmp = a.warehouse.localeCompare(b.warehouse);
        break;
      case "availableQty":
        cmp = a.availableQty - b.availableQty;
        break;
      case "costPrice":
        cmp = a.costPrice - b.costPrice;
        break;
      case "stockValue":
        cmp = a.stockValue - b.stockValue;
        break;
      case "expiryDate":
        cmp = (a.expiryDate || "").localeCompare(b.expiryDate || "");
        break;
      default:
        cmp = 0;
    }
    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return cmp * dir;
  });
}

export function computeStockValuationTotals(rows: StockValuationRow[]): StockValuationTotals {
  return {
    count: rows.length,
    totalAvailableQty: rows.reduce((s, r) => s + r.availableQty, 0),
    totalStockValue: rows.reduce((s, r) => s + r.stockValue, 0),
  };
}

export function formatStockValuationDate(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

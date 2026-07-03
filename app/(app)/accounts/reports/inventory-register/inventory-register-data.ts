import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { roundMoney } from "@/lib/accounts/money-format";

export type InventoryTransactionType =
  | "opening_stock"
  | "purchase"
  | "purchase_return"
  | "sales"
  | "sales_return"
  | "stock_transfer_in"
  | "stock_transfer_out"
  | "sample_issue"
  | "sample_return";

export const INVENTORY_TRANSACTION_TYPE_OPTIONS: {
  value: InventoryTransactionType | "all";
  label: string;
}[] = [
  { value: "all", label: "All types" },
  { value: "opening_stock", label: "Opening Stock" },
  { value: "purchase", label: "Purchase" },
  { value: "purchase_return", label: "Purchase Return" },
  { value: "sales", label: "Sales" },
  { value: "sales_return", label: "Sales Return" },
  { value: "stock_transfer_in", label: "Stock Transfer In" },
  { value: "stock_transfer_out", label: "Stock Transfer Out" },
  { value: "sample_issue", label: "Sample Issue" },
  { value: "sample_return", label: "Sample Return" },
];

export const INVENTORY_TRANSACTION_TYPE_LABELS: Record<InventoryTransactionType, string> = {
  opening_stock: "Opening Stock",
  purchase: "Purchase",
  purchase_return: "Purchase Return",
  sales: "Sales",
  sales_return: "Sales Return",
  stock_transfer_in: "Stock Transfer In",
  stock_transfer_out: "Stock Transfer Out",
  sample_issue: "Sample Issue",
  sample_return: "Sample Return",
};

export type InventoryRegisterSortKey =
  | "date"
  | "productName"
  | "warehouse"
  | "transactionType"
  | "inQty"
  | "outQty";

export interface InventoryRegisterMovementSeed {
  id: string;
  date: string;
  transactionType: InventoryTransactionType;
  documentNo: string;
  productName: string;
  sku: string;
  category: string;
  batchNo: string;
  warehouse: string;
  inQty: number;
  outQty: number;
  uom: string;
  costPrice: number;
  financialYearId: number;
}

export interface InventoryRegisterRow extends InventoryRegisterMovementSeed {
  balanceQty: number;
  stockValue: number;
}

export interface InventoryRegisterFilterParams {
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  warehouse: string;
  productId: string;
  category: string;
  batchNo: string;
  transactionType: string;
  search: string;
}

export interface InventoryRegisterTotals {
  totalInQty: number;
  totalOutQty: number;
  count: number;
}

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

const MOVEMENT_SEEDS: InventoryRegisterMovementSeed[] = [
  {
    id: "inv-001",
    date: demoDateAt(0),
    transactionType: "opening_stock",
    documentNo: "OS-0001",
    productName: "Urea 50kg",
    sku: "UR-50KG",
    category: "Fertilizer",
    batchNo: "B-UR-99A",
    warehouse: "Central Warehouse",
    inQty: 500,
    outQty: 0,
    uom: "BAG",
    costPrice: 280,
    financialYearId: 1,
  },
  {
    id: "inv-002",
    date: demoDateAt(1),
    transactionType: "opening_stock",
    documentNo: "OS-0002",
    productName: "NPK 20:20:0",
    sku: "NPK-2020",
    category: "Fertilizer",
    batchNo: "B-NPK-12C",
    warehouse: "Central Warehouse",
    inQty: 300,
    outQty: 0,
    uom: "BAG",
    costPrice: 450,
    financialYearId: 1,
  },
  {
    id: "inv-003",
    date: demoDateAt(2),
    transactionType: "opening_stock",
    documentNo: "OS-0003",
    productName: "Herbicide Max 1L",
    sku: "HRB-MAX-1L",
    category: "Crop Protection",
    batchNo: "B-HRB-88X",
    warehouse: "Regional Warehouse",
    inQty: 200,
    outQty: 0,
    uom: "LTR",
    costPrice: 320,
    financialYearId: 1,
  },
  {
    id: "inv-004",
    date: demoDateAt(3),
    transactionType: "purchase",
    documentNo: "GRN-0005",
    productName: "Urea 50kg",
    sku: "UR-50KG",
    category: "Fertilizer",
    batchNo: "B-UR-99A",
    warehouse: "Central Warehouse",
    inQty: 100,
    outQty: 0,
    uom: "BAG",
    costPrice: 280,
    financialYearId: 1,
  },
  {
    id: "inv-005",
    date: demoDateAt(4),
    transactionType: "purchase",
    documentNo: "GRN-0008",
    productName: "Bio Fertilizer 5kg",
    sku: "BIO-FERT-5KG",
    category: "Bio Input",
    batchNo: "B-BIO-44D",
    warehouse: "Central Warehouse",
    inQty: 150,
    outQty: 0,
    uom: "BAG",
    costPrice: 180,
    financialYearId: 1,
  },
  {
    id: "inv-006",
    date: demoDateAt(5),
    transactionType: "sales",
    documentNo: "SI-0003",
    productName: "Urea 50kg",
    sku: "UR-50KG",
    category: "Fertilizer",
    batchNo: "B-UR-99A",
    warehouse: "Central Warehouse",
    inQty: 0,
    outQty: 80,
    uom: "BAG",
    costPrice: 280,
    financialYearId: 1,
  },
  {
    id: "inv-007",
    date: demoDateAt(6),
    transactionType: "sample_issue",
    documentNo: "SM-0001",
    productName: "Urea 50kg",
    sku: "UR-50KG",
    category: "Fertilizer",
    batchNo: "B-UR-99A",
    warehouse: "Central Warehouse",
    inQty: 0,
    outQty: 20,
    uom: "BAG",
    costPrice: 280,
    financialYearId: 1,
  },
  {
    id: "inv-008",
    date: demoDateAt(7),
    transactionType: "sales",
    documentNo: "SI-0007",
    productName: "NPK 20:20:0",
    sku: "NPK-2020",
    category: "Fertilizer",
    batchNo: "B-NPK-12C",
    warehouse: "Central Warehouse",
    inQty: 0,
    outQty: 60,
    uom: "BAG",
    costPrice: 450,
    financialYearId: 1,
  },
  {
    id: "inv-009",
    date: demoDateAt(8),
    transactionType: "purchase_return",
    documentNo: "PR-0002",
    productName: "Urea 50kg",
    sku: "UR-50KG",
    category: "Fertilizer",
    batchNo: "B-UR-99A",
    warehouse: "Central Warehouse",
    inQty: 0,
    outQty: 10,
    uom: "BAG",
    costPrice: 280,
    financialYearId: 1,
  },
  {
    id: "inv-010",
    date: demoDateAt(9),
    transactionType: "sales_return",
    documentNo: "SR-0001",
    productName: "Urea 50kg",
    sku: "UR-50KG",
    category: "Fertilizer",
    batchNo: "B-UR-99A",
    warehouse: "Central Warehouse",
    inQty: 15,
    outQty: 0,
    uom: "BAG",
    costPrice: 280,
    financialYearId: 1,
  },
  {
    id: "inv-011",
    date: demoDateAt(10),
    transactionType: "stock_transfer_out",
    documentNo: "ST-0003",
    productName: "Urea 50kg",
    sku: "UR-50KG",
    category: "Fertilizer",
    batchNo: "B-UR-99A",
    warehouse: "Central Warehouse",
    inQty: 0,
    outQty: 50,
    uom: "BAG",
    costPrice: 280,
    financialYearId: 1,
  },
  {
    id: "inv-012",
    date: demoDateAt(11),
    transactionType: "stock_transfer_in",
    documentNo: "ST-0003",
    productName: "Urea 50kg",
    sku: "UR-50KG",
    category: "Fertilizer",
    batchNo: "B-UR-99A",
    warehouse: "Field Depot",
    inQty: 50,
    outQty: 0,
    uom: "BAG",
    costPrice: 280,
    financialYearId: 1,
  },
  {
    id: "inv-013",
    date: demoDateAt(12),
    transactionType: "purchase",
    documentNo: "GRN-0012",
    productName: "Herbicide Max 1L",
    sku: "HRB-MAX-1L",
    category: "Crop Protection",
    batchNo: "B-HRB-88X",
    warehouse: "Regional Warehouse",
    inQty: 80,
    outQty: 0,
    uom: "LTR",
    costPrice: 320,
    financialYearId: 1,
  },
  {
    id: "inv-014",
    date: demoDateAt(13),
    transactionType: "sales",
    documentNo: "SI-0012",
    productName: "Herbicide Max 1L",
    sku: "HRB-MAX-1L",
    category: "Crop Protection",
    batchNo: "B-HRB-88X",
    warehouse: "Regional Warehouse",
    inQty: 0,
    outQty: 45,
    uom: "LTR",
    costPrice: 320,
    financialYearId: 1,
  },
  {
    id: "inv-015",
    date: demoDateAt(14),
    transactionType: "sample_issue",
    documentNo: "SM-0004",
    productName: "Bio Fertilizer 5kg",
    sku: "BIO-FERT-5KG",
    category: "Bio Input",
    batchNo: "B-BIO-44D",
    warehouse: "Central Warehouse",
    inQty: 0,
    outQty: 12,
    uom: "BAG",
    costPrice: 180,
    financialYearId: 1,
  },
  {
    id: "inv-016",
    date: demoDateAt(15),
    transactionType: "sales",
    documentNo: "SI-0018",
    productName: "Urea 50kg",
    sku: "UR-50KG",
    category: "Fertilizer",
    batchNo: "B-UR-99A",
    warehouse: "Field Depot",
    inQty: 0,
    outQty: 25,
    uom: "BAG",
    costPrice: 280,
    financialYearId: 1,
  },
  {
    id: "inv-017",
    date: demoDateAt(16),
    transactionType: "purchase",
    documentNo: "GRN-0018",
    productName: "NPK 20:20:0",
    sku: "NPK-2020",
    category: "Fertilizer",
    batchNo: "B-NPK-12C",
    warehouse: "Central Warehouse",
    inQty: 120,
    outQty: 0,
    uom: "BAG",
    costPrice: 450,
    financialYearId: 1,
  },
  {
    id: "inv-018",
    date: demoDateAt(17),
    transactionType: "sales_return",
    documentNo: "SR-0003",
    productName: "NPK 20:20:0",
    sku: "NPK-2020",
    category: "Fertilizer",
    batchNo: "B-NPK-12C",
    warehouse: "Central Warehouse",
    inQty: 8,
    outQty: 0,
    uom: "BAG",
    costPrice: 450,
    financialYearId: 1,
  },
  {
    id: "inv-019",
    date: demoDateAt(18),
    transactionType: "stock_transfer_out",
    documentNo: "ST-0007",
    productName: "Bio Fertilizer 5kg",
    sku: "BIO-FERT-5KG",
    category: "Bio Input",
    batchNo: "B-BIO-44D",
    warehouse: "Central Warehouse",
    inQty: 0,
    outQty: 30,
    uom: "BAG",
    costPrice: 180,
    financialYearId: 1,
  },
  {
    id: "inv-020",
    date: demoDateAt(19),
    transactionType: "stock_transfer_in",
    documentNo: "ST-0007",
    productName: "Bio Fertilizer 5kg",
    sku: "BIO-FERT-5KG",
    category: "Bio Input",
    batchNo: "B-BIO-44D",
    warehouse: "Regional Warehouse",
    inQty: 30,
    outQty: 0,
    uom: "BAG",
    costPrice: 180,
    financialYearId: 1,
  },
  {
    id: "inv-021",
    date: demoDateAt(20),
    transactionType: "sample_return",
    documentNo: "SM-0006",
    productName: "Urea 50kg",
    sku: "UR-50KG",
    category: "Fertilizer",
    batchNo: "B-UR-99A",
    warehouse: "Central Warehouse",
    inQty: 5,
    outQty: 0,
    uom: "BAG",
    costPrice: 280,
    financialYearId: 1,
  },
  {
    id: "inv-022",
    date: demoDateAt(21),
    transactionType: "sales",
    documentNo: "SI-0024",
    productName: "Bio Fertilizer 5kg",
    sku: "BIO-FERT-5KG",
    category: "Bio Input",
    batchNo: "B-BIO-44D",
    warehouse: "Central Warehouse",
    inQty: 0,
    outQty: 40,
    uom: "BAG",
    costPrice: 180,
    financialYearId: 1,
  },
  {
    id: "inv-023",
    date: demoDateAt(22),
    transactionType: "purchase",
    documentNo: "GRN-0022",
    productName: "Fungicide Shield 500ml",
    sku: "FNG-SHLD-500",
    category: "Crop Protection",
    batchNo: "B-FNG-21K",
    warehouse: "Central Warehouse",
    inQty: 240,
    outQty: 0,
    uom: "BOX",
    costPrice: 95,
    financialYearId: 1,
  },
  {
    id: "inv-024",
    date: demoDateAt(23),
    transactionType: "sales",
    documentNo: "SI-0028",
    productName: "Fungicide Shield 500ml",
    sku: "FNG-SHLD-500",
    category: "Crop Protection",
    batchNo: "B-FNG-21K",
    warehouse: "Central Warehouse",
    inQty: 0,
    outQty: 65,
    uom: "BOX",
    costPrice: 95,
    financialYearId: 1,
  },
  {
    id: "inv-025",
    date: demoDateAt(24),
    transactionType: "purchase_return",
    documentNo: "PR-0005",
    productName: "Herbicide Max 1L",
    sku: "HRB-MAX-1L",
    category: "Crop Protection",
    batchNo: "B-HRB-88X",
    warehouse: "Regional Warehouse",
    inQty: 0,
    outQty: 6,
    uom: "LTR",
    costPrice: 320,
    financialYearId: 1,
  },
  {
    id: "inv-026",
    date: demoDateAt(25),
    transactionType: "sample_issue",
    documentNo: "SM-0009",
    productName: "NPK 20:20:0",
    sku: "NPK-2020",
    category: "Fertilizer",
    batchNo: "B-NPK-12C",
    warehouse: "Central Warehouse",
    inQty: 0,
    outQty: 10,
    uom: "BAG",
    costPrice: 450,
    financialYearId: 1,
  },
  {
    id: "inv-027",
    date: demoDateAt(26),
    transactionType: "opening_stock",
    documentNo: "OS-0004",
    productName: "Micronutrient Mix",
    sku: "MCN-MIX-1KG",
    category: "Fertilizer",
    batchNo: "B-MCN-55P",
    warehouse: "Field Depot",
    inQty: 180,
    outQty: 0,
    uom: "KG",
    costPrice: 42,
    financialYearId: 1,
  },
  {
    id: "inv-028",
    date: demoDateAt(27),
    transactionType: "sales",
    documentNo: "SI-0035",
    productName: "Micronutrient Mix",
    sku: "MCN-MIX-1KG",
    category: "Fertilizer",
    batchNo: "B-MCN-55P",
    warehouse: "Field Depot",
    inQty: 0,
    outQty: 35,
    uom: "KG",
    costPrice: 42,
    financialYearId: 1,
  },
  {
    id: "inv-029",
    date: demoDateAt(28),
    transactionType: "stock_transfer_in",
    documentNo: "ST-0011",
    productName: "NPK 20:20:0",
    sku: "NPK-2020",
    category: "Fertilizer",
    batchNo: "B-NPK-12C",
    warehouse: "Field Depot",
    inQty: 40,
    outQty: 0,
    uom: "BAG",
    costPrice: 450,
    financialYearId: 1,
  },
  {
    id: "inv-030",
    date: demoDateAt(29),
    transactionType: "sample_return",
    documentNo: "SM-0012",
    productName: "Bio Fertilizer 5kg",
    sku: "BIO-FERT-5KG",
    category: "Bio Input",
    batchNo: "B-BIO-44D",
    warehouse: "Regional Warehouse",
    inQty: 4,
    outQty: 0,
    uom: "BAG",
    costPrice: 180,
    financialYearId: 1,
  },
];

function balanceKey(row: Pick<InventoryRegisterMovementSeed, "sku" | "batchNo" | "warehouse">): string {
  return `${row.sku}|${row.batchNo}|${row.warehouse}`;
}

export function buildInventoryRegisterRows(): InventoryRegisterRow[] {
  const sorted = [...MOVEMENT_SEEDS].sort((a, b) => {
    const dateCmp = a.date.localeCompare(b.date);
    if (dateCmp !== 0) return dateCmp;
    return a.id.localeCompare(b.id);
  });

  const balances = new Map<string, number>();

  return sorted.map((seed) => {
    const key = balanceKey(seed);
    const prev = balances.get(key) ?? 0;
    const balanceQty = prev + seed.inQty - seed.outQty;
    balances.set(key, balanceQty);

    return {
      ...seed,
      balanceQty,
      stockValue: roundMoney(balanceQty * seed.costPrice),
    };
  });
}

export const INVENTORY_REGISTER_PRODUCT_OPTIONS: ProductOption[] = Array.from(
  new Map(
    MOVEMENT_SEEDS.map((m) => [
      m.sku,
      { id: m.sku, name: m.productName, sku: m.sku },
    ]),
  ).values(),
).sort((a, b) => a.name.localeCompare(b.name));

export const INVENTORY_REGISTER_WAREHOUSE_OPTIONS = Array.from(
  new Set(MOVEMENT_SEEDS.map((m) => m.warehouse)),
).sort();

export const INVENTORY_REGISTER_CATEGORY_OPTIONS = Array.from(
  new Set(MOVEMENT_SEEDS.map((m) => m.category)),
).sort();

export const INVENTORY_REGISTER_BATCH_OPTIONS = Array.from(
  new Set(MOVEMENT_SEEDS.map((m) => m.batchNo)),
).sort();

function rowInFinancialYear(row: InventoryRegisterRow, financialYearId: string): boolean {
  if (financialYearId === "all") return true;
  const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
  if (!fy) return String(row.financialYearId) === financialYearId;
  return row.date >= fy.startDate && row.date <= fy.endDate;
}

function matchesSearch(search: string, parts: (string | number | undefined | null)[]): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return parts.some((p) => String(p ?? "").toLowerCase().includes(q));
}

export function filterInventoryRegisterRows(
  rows: InventoryRegisterRow[],
  filters: InventoryRegisterFilterParams,
): InventoryRegisterRow[] {
  return rows.filter((row) => {
    if (filters.dateFrom && row.date < filters.dateFrom) return false;
    if (filters.dateTo && row.date > filters.dateTo) return false;
    if (!rowInFinancialYear(row, filters.financialYearId)) return false;
    if (filters.warehouse !== "all" && row.warehouse !== filters.warehouse) return false;
    if (filters.productId !== "all" && row.sku !== filters.productId) return false;
    if (filters.category !== "all" && row.category !== filters.category) return false;
    if (filters.batchNo !== "all" && row.batchNo !== filters.batchNo) return false;
    if (filters.transactionType !== "all" && row.transactionType !== filters.transactionType) return false;
    if (
      !matchesSearch(filters.search, [
        row.productName,
        row.sku,
        row.batchNo,
        row.warehouse,
        row.documentNo,
      ])
    ) {
      return false;
    }
    return true;
  });
}

export function sortInventoryRegisterRows(
  rows: InventoryRegisterRow[],
  sortKey: InventoryRegisterSortKey,
  sortDir: "asc" | "desc",
): InventoryRegisterRow[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.date.localeCompare(b.date);
        break;
      case "productName":
        cmp = a.productName.localeCompare(b.productName);
        break;
      case "warehouse":
        cmp = a.warehouse.localeCompare(b.warehouse);
        break;
      case "transactionType":
        cmp = INVENTORY_TRANSACTION_TYPE_LABELS[a.transactionType].localeCompare(
          INVENTORY_TRANSACTION_TYPE_LABELS[b.transactionType],
        );
        break;
      case "inQty":
        cmp = a.inQty - b.inQty;
        break;
      case "outQty":
        cmp = a.outQty - b.outQty;
        break;
    }
    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return sortDir === "asc" ? cmp : -cmp;
  });
  return sorted;
}

export function computeInventoryRegisterTotals(rows: InventoryRegisterRow[]): InventoryRegisterTotals {
  return rows.reduce(
    (acc, row) => ({
      count: acc.count + 1,
      totalInQty: acc.totalInQty + row.inQty,
      totalOutQty: acc.totalOutQty + row.outQty,
    }),
    { count: 0, totalInQty: 0, totalOutQty: 0 },
  );
}

export function formatInventoryRegisterDate(iso: string): string {
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(/ /g, "-");
}

export function formatQty(value: number, showZero = false): string {
  if (value === 0 && !showZero) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

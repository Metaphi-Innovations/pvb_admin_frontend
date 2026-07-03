import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Stock Ledger report — local data & statement builder.
 * Isolated to Accounts → Reports → Stock Ledger only.
 */

import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadTransfers } from "@/app/(app)/sales/stock-transfer/stock-transfer-data";
import { loadOrders as loadSampleOrders } from "@/app/(app)/sales/sample-order/orders-data";

export type StockLedgerTransactionType =
  | "opening_stock"
  | "purchase"
  | "purchase_return"
  | "sales"
  | "sales_return"
  | "stock_transfer_in"
  | "stock_transfer_out"
  | "sample_issue"
  | "sample_return";

export const STOCK_LEDGER_TRANSACTION_TYPE_LABELS: Record<StockLedgerTransactionType, string> = {
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

export type StockLedgerSortKey =
  | "date"
  | "documentNo"
  | "transactionType"
  | "warehouse"
  | "inQty"
  | "outQty";

export interface StockLedgerProductOption {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
}

export interface StockLedgerMovementSeed {
  id: string;
  productId: string;
  date: string;
  transactionType: StockLedgerTransactionType;
  documentNo: string;
  warehouse: string;
  batchNo: string;
  inQty: number;
  outQty: number;
  costPrice: number;
  financialYearId: number;
}

export interface StockLedgerTransactionRow extends StockLedgerMovementSeed {
  balanceQty: number;
  viewHref?: string;
}

export type StockLedgerRowKind = "opening" | "transaction" | "closing";

export interface StockLedgerDisplayRow {
  kind: StockLedgerRowKind;
  id: string;
  date: string;
  isoDate: string;
  transactionType: StockLedgerTransactionType | "";
  transactionTypeLabel: string;
  documentNo: string;
  warehouse: string;
  batchNo: string;
  inQty: number;
  outQty: number;
  balanceQty: number;
  unit: string;
  costPrice: number;
  viewHref?: string;
}

export interface StockLedgerSummary {
  productId: string;
  productName: string;
  sku: string;
  category: string;
  unit: string;
  warehouseLabel: string;
  batchLabel: string;
  openingQty: number;
  totalInQty: number;
  totalOutQty: number;
  closingQty: number;
}

export interface StockLedgerStatement {
  summary: StockLedgerSummary;
  transactionRows: StockLedgerDisplayRow[];
  displayRows: StockLedgerDisplayRow[];
  hasPeriodTransactions: boolean;
}

export interface StockLedgerFilters {
  productId: string;
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  warehouse: string;
  batchNo: string;
  search: string;
}

const PRODUCTS: StockLedgerProductOption[] = [
  {
    id: "bgl-5l",
    name: "Bio Growth Liquid 5L",
    sku: "BGL-5L",
    category: "Bio Input",
    unit: "Ltr",
  },
  {
    id: "ur-50kg",
    name: "Urea 50kg",
    sku: "UR-50KG",
    category: "Fertilizer",
    unit: "BAG",
  },
  {
    id: "hrb-max-1l",
    name: "Herbicide Max 1L",
    sku: "HRB-MAX-1L",
    category: "Crop Protection",
    unit: "Ltr",
  },
];

/** 25 movements for Bio Growth Liquid 5L — Apr–Jun 2026. */
const BGL_MOVEMENTS: Omit<StockLedgerMovementSeed, "productId">[] = [
  { id: "sl-001", date: demoDateAt(0), transactionType: "opening_stock", documentNo: "OS-0001", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 500, outQty: 0, costPrice: 180, financialYearId: 1 },
  { id: "sl-002", date: demoDateAt(1), transactionType: "purchase", documentNo: "GRN-0005", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 100, outQty: 0, costPrice: 180, financialYearId: 1 },
  { id: "sl-003", date: demoDateAt(2), transactionType: "purchase", documentNo: "GRN-0006", warehouse: "Regional Warehouse", batchNo: "BG-2402", inQty: 50, outQty: 0, costPrice: 180, financialYearId: 1 },
  { id: "sl-004", date: demoDateAt(3), transactionType: "sales", documentNo: "SI-0003", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 0, outQty: 80, costPrice: 180, financialYearId: 1 },
  { id: "sl-005", date: demoDateAt(4), transactionType: "stock_transfer_out", documentNo: "ST-0002", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 0, outQty: 50, costPrice: 180, financialYearId: 1 },
  { id: "sl-006", date: demoDateAt(5), transactionType: "stock_transfer_in", documentNo: "ST-0002", warehouse: "Field Depot", batchNo: "BG-2401", inQty: 50, outQty: 0, costPrice: 180, financialYearId: 1 },
  { id: "sl-007", date: demoDateAt(6), transactionType: "sales_return", documentNo: "SR-0001", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 20, outQty: 0, costPrice: 180, financialYearId: 1 },
  { id: "sl-008", date: demoDateAt(7), transactionType: "purchase", documentNo: "GRN-0009", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 75, outQty: 0, costPrice: 180, financialYearId: 1 },
  { id: "sl-009", date: demoDateAt(8), transactionType: "sales", documentNo: "SI-0008", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 0, outQty: 60, costPrice: 180, financialYearId: 1 },
  { id: "sl-010", date: demoDateAt(9), transactionType: "sample_issue", documentNo: "SM-0002", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 0, outQty: 15, costPrice: 180, financialYearId: 1 },
  { id: "sl-011", date: demoDateAt(10), transactionType: "purchase_return", documentNo: "PR-0001", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 0, outQty: 10, costPrice: 180, financialYearId: 1 },
  { id: "sl-012", date: demoDateAt(11), transactionType: "sales", documentNo: "SI-0012", warehouse: "Field Depot", batchNo: "BG-2401", inQty: 0, outQty: 40, costPrice: 180, financialYearId: 1 },
  { id: "sl-013", date: demoDateAt(12), transactionType: "purchase", documentNo: "GRN-0015", warehouse: "Regional Warehouse", batchNo: "BG-2402", inQty: 120, outQty: 0, costPrice: 180, financialYearId: 1 },
  { id: "sl-014", date: demoDateAt(13), transactionType: "sales", documentNo: "SI-0015", warehouse: "Regional Warehouse", batchNo: "BG-2402", inQty: 0, outQty: 55, costPrice: 180, financialYearId: 1 },
  { id: "sl-015", date: demoDateAt(14), transactionType: "sales_return", documentNo: "SR-0002", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 12, outQty: 0, costPrice: 180, financialYearId: 1 },
  { id: "sl-016", date: demoDateAt(15), transactionType: "stock_transfer_out", documentNo: "ST-0005", warehouse: "Regional Warehouse", batchNo: "BG-2402", inQty: 0, outQty: 30, costPrice: 180, financialYearId: 1 },
  { id: "sl-017", date: demoDateAt(16), transactionType: "stock_transfer_in", documentNo: "ST-0005", warehouse: "Central Warehouse", batchNo: "BG-2402", inQty: 30, outQty: 0, costPrice: 180, financialYearId: 1 },
  { id: "sl-018", date: demoDateAt(17), transactionType: "sample_issue", documentNo: "SM-0005", warehouse: "Regional Warehouse", batchNo: "BG-2402", inQty: 0, outQty: 8, costPrice: 180, financialYearId: 1 },
  { id: "sl-019", date: demoDateAt(18), transactionType: "purchase_return", documentNo: "PR-0003", warehouse: "Regional Warehouse", batchNo: "BG-2402", inQty: 0, outQty: 5, costPrice: 180, financialYearId: 1 },
  { id: "sl-020", date: demoDateAt(19), transactionType: "sales", documentNo: "SI-0020", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 0, outQty: 70, costPrice: 180, financialYearId: 1 },
  { id: "sl-021", date: demoDateAt(20), transactionType: "purchase", documentNo: "GRN-0020", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 90, outQty: 0, costPrice: 180, financialYearId: 1 },
  { id: "sl-022", date: demoDateAt(21), transactionType: "sample_return", documentNo: "SM-0008", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 6, outQty: 0, costPrice: 180, financialYearId: 1 },
  { id: "sl-023", date: demoDateAt(22), transactionType: "sales", documentNo: "SI-0025", warehouse: "Field Depot", batchNo: "BG-2401", inQty: 0, outQty: 45, costPrice: 180, financialYearId: 1 },
  { id: "sl-024", date: demoDateAt(23), transactionType: "purchase", documentNo: "GRN-0025", warehouse: "Regional Warehouse", batchNo: "BG-2402", inQty: 60, outQty: 0, costPrice: 180, financialYearId: 1 },
  { id: "sl-025", date: demoDateAt(24), transactionType: "sales", documentNo: "SI-0030", warehouse: "Central Warehouse", batchNo: "BG-2401", inQty: 0, outQty: 50, costPrice: 180, financialYearId: 1 },
];

const OTHER_MOVEMENTS: StockLedgerMovementSeed[] = [
  { id: "sl-u01", productId: "ur-50kg", date: demoDateAt(25), transactionType: "opening_stock", documentNo: "OS-0002", warehouse: "Central Warehouse", batchNo: "B-UR-99A", inQty: 300, outQty: 0, costPrice: 280, financialYearId: 1 },
  { id: "sl-u02", productId: "ur-50kg", date: demoDateAt(26), transactionType: "purchase", documentNo: "GRN-0010", warehouse: "Central Warehouse", batchNo: "B-UR-99A", inQty: 100, outQty: 0, costPrice: 280, financialYearId: 1 },
  { id: "sl-u03", productId: "ur-50kg", date: demoDateAt(27), transactionType: "sales", documentNo: "SI-0005", warehouse: "Central Warehouse", batchNo: "B-UR-99A", inQty: 0, outQty: 80, costPrice: 280, financialYearId: 1 },
  { id: "sl-h01", productId: "hrb-max-1l", date: demoDateAt(28), transactionType: "opening_stock", documentNo: "OS-0003", warehouse: "Regional Warehouse", batchNo: "B-HRB-88X", inQty: 200, outQty: 0, costPrice: 320, financialYearId: 1 },
  { id: "sl-h02", productId: "hrb-max-1l", date: demoDateAt(29), transactionType: "purchase", documentNo: "GRN-0012", warehouse: "Regional Warehouse", batchNo: "B-HRB-88X", inQty: 80, outQty: 0, costPrice: 320, financialYearId: 1 },
  { id: "sl-h03", productId: "hrb-max-1l", date: demoDateAt(30), transactionType: "sales", documentNo: "SI-0010", warehouse: "Regional Warehouse", batchNo: "B-HRB-88X", inQty: 0, outQty: 45, costPrice: 320, financialYearId: 1 },
];

const MOVEMENT_SEEDS: StockLedgerMovementSeed[] = [
  ...BGL_MOVEMENTS.map((m) => ({ ...m, productId: "bgl-5l" })),
  ...OTHER_MOVEMENTS,
];

export function getStockLedgerProducts(): StockLedgerProductOption[] {
  return [...PRODUCTS].sort((a, b) => a.name.localeCompare(b.name));
}

export function getStockLedgerProductById(id: string): StockLedgerProductOption | null {
  return PRODUCTS.find((p) => p.id === id) ?? null;
}

export const STOCK_LEDGER_WAREHOUSE_OPTIONS = Array.from(
  new Set(MOVEMENT_SEEDS.map((m) => m.warehouse)),
).sort();

export function getStockLedgerBatchOptions(productId: string): string[] {
  return Array.from(
    new Set(MOVEMENT_SEEDS.filter((m) => m.productId === productId).map((m) => m.batchNo)),
  ).sort();
}

export function formatStockLedgerDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
}

export function formatQty(value: number, showZero = false): string {
  if (value === 0 && !showZero) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function rowInFinancialYear(row: StockLedgerMovementSeed, financialYearId: string): boolean {
  if (financialYearId === "all") return true;
  const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
  if (!fy) return String(row.financialYearId) === financialYearId;
  return row.date >= fy.startDate && row.date <= fy.endDate;
}

function matchesScope(
  row: StockLedgerMovementSeed,
  warehouse: string,
  batchNo: string,
): boolean {
  if (warehouse !== "all" && row.warehouse !== warehouse) return false;
  if (batchNo !== "all" && row.batchNo !== batchNo) return false;
  return true;
}

function matchesSearch(
  row: StockLedgerMovementSeed,
  search: string,
): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [
    row.documentNo,
    row.batchNo,
    row.warehouse,
    STOCK_LEDGER_TRANSACTION_TYPE_LABELS[row.transactionType],
  ].some((p) => p.toLowerCase().includes(q));
}

export function resolveStockLedgerDocumentHref(
  documentNo: string,
  transactionType: StockLedgerTransactionType,
): string | null {
  if (!documentNo || documentNo.startsWith("OS-")) return null;

  switch (transactionType) {
    case "opening_stock":
      return "/accounts/masters/stock-opening";
    case "purchase": {
      const pi = loadPurchaseInvoices().find(
        (p) => p.grnNo === documentNo || p.invoiceNo === documentNo,
      );
      if (pi) return `/accounts/purchase-invoices/${pi.id}`;
      return "/warehouse/grn/purchase";
    }
    case "purchase_return":
      return "/accounts/transactions/purchase-return";
    case "sales": {
      const inv = loadInvoices().find((i) => i.invoiceNo === documentNo);
      if (inv) return `/accounts/transactions/invoices/${inv.id}`;
      return "/accounts/transactions/invoices";
    }
    case "sales_return":
      return "/accounts/transactions/sales-return";
    case "stock_transfer_in":
    case "stock_transfer_out": {
      const transfer = loadTransfers().find((t) => t.transferNumber === documentNo);
      if (transfer) return `/sales/stock-transfer/${transfer.id}`;
      return "/sales/stock-transfer";
    }
    case "sample_issue":
    case "sample_return": {
      const order = loadSampleOrders().find((o) => o.soNumber === documentNo);
      if (order) return `/sales/sample-order/${order.id}`;
      return "/sales/sample-order";
    }
    default:
      return null;
  }
}

function buildChronologicalRows(
  productId: string,
  warehouse: string,
  batchNo: string,
): StockLedgerTransactionRow[] {
  const sorted = MOVEMENT_SEEDS.filter(
    (m) => m.productId === productId && matchesScope(m, warehouse, batchNo),
  ).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  let balance = 0;
  return sorted.map((seed) => {
    balance += seed.inQty - seed.outQty;
    return {
      ...seed,
      balanceQty: balance,
      viewHref: resolveStockLedgerDocumentHref(seed.documentNo, seed.transactionType) ?? undefined,
    };
  });
}

function computeOpeningQty(
  rows: StockLedgerTransactionRow[],
  dateFrom: string,
): number {
  let balance = 0;
  for (const row of rows) {
    if (row.date > dateFrom) break;
    if (row.date < dateFrom) {
      balance += row.inQty - row.outQty;
      continue;
    }
    if (row.date === dateFrom && row.transactionType === "opening_stock") {
      balance += row.inQty - row.outQty;
    }
  }
  return balance;
}

function isPeriodTransaction(row: StockLedgerTransactionSeed, dateFrom: string): boolean {
  if (row.date === dateFrom && row.transactionType === "opening_stock") return false;
  return true;
}

type StockLedgerTransactionSeed = StockLedgerMovementSeed;

function toDisplayRow(
  row: StockLedgerTransactionRow,
  product: StockLedgerProductOption,
  kind: StockLedgerRowKind,
  overrides?: Partial<StockLedgerDisplayRow>,
): StockLedgerDisplayRow {
  return {
    kind,
    id: row.id,
    date: formatStockLedgerDate(row.date),
    isoDate: row.date,
    transactionType: row.transactionType,
    transactionTypeLabel: STOCK_LEDGER_TRANSACTION_TYPE_LABELS[row.transactionType],
    documentNo: row.documentNo,
    warehouse: row.warehouse,
    batchNo: row.batchNo,
    inQty: row.inQty,
    outQty: row.outQty,
    balanceQty: row.balanceQty,
    unit: product.unit,
    costPrice: row.costPrice,
    viewHref: row.viewHref,
    ...overrides,
  };
}

export function sortStockLedgerTransactions(
  rows: StockLedgerDisplayRow[],
  sortKey: StockLedgerSortKey,
  sortDir: "asc" | "desc",
): StockLedgerDisplayRow[] {
  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case "date":
        cmp = a.isoDate.localeCompare(b.isoDate);
        break;
      case "documentNo":
        cmp = a.documentNo.localeCompare(b.documentNo);
        break;
      case "transactionType":
        cmp = a.transactionTypeLabel.localeCompare(b.transactionTypeLabel);
        break;
      case "warehouse":
        cmp = a.warehouse.localeCompare(b.warehouse);
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

export function buildStockLedgerStatement(
  filters: StockLedgerFilters,
): StockLedgerStatement | null {
  const product = getStockLedgerProductById(filters.productId);
  if (!product) return null;

  const chronological = buildChronologicalRows(
    filters.productId,
    filters.warehouse,
    filters.batchNo,
  );

  const openingQty = computeOpeningQty(chronological, filters.dateFrom);

  const periodTransactions = chronological.filter(
    (row) =>
      row.date >= filters.dateFrom &&
      row.date <= filters.dateTo &&
      rowInFinancialYear(row, filters.financialYearId) &&
      isPeriodTransaction(row, filters.dateFrom),
  );

  const filteredTransactions = periodTransactions.filter((row) =>
    matchesSearch(row, filters.search),
  );

  const openingRow: StockLedgerDisplayRow = {
    kind: "opening",
    id: "opening",
    date: formatStockLedgerDate(filters.dateFrom),
    isoDate: filters.dateFrom,
    transactionType: "",
    transactionTypeLabel: "Opening Stock",
    documentNo: "—",
    warehouse: filters.warehouse === "all" ? "—" : filters.warehouse,
    batchNo: filters.batchNo === "all" ? "—" : filters.batchNo,
    inQty: openingQty,
    outQty: 0,
    balanceQty: openingQty,
    unit: product.unit,
    costPrice: chronological[0]?.costPrice ?? 0,
  };

  let running = openingQty;
  const transactionRows: StockLedgerDisplayRow[] = filteredTransactions.map((row) => {
    running += row.inQty - row.outQty;
    return toDisplayRow(row, product, "transaction", { balanceQty: running });
  });

  let closingQty = openingQty;
  for (const row of periodTransactions) {
    closingQty += row.inQty - row.outQty;
  }

  const totalInQty = filteredTransactions.reduce((s, r) => s + r.inQty, 0);
  const totalOutQty = filteredTransactions.reduce((s, r) => s + r.outQty, 0);

  const closingRow: StockLedgerDisplayRow = {
    kind: "closing",
    id: "closing",
    date: formatStockLedgerDate(filters.dateTo),
    isoDate: filters.dateTo,
    transactionType: "",
    transactionTypeLabel: "Closing Quantity",
    documentNo: "—",
    warehouse: filters.warehouse === "all" ? "—" : filters.warehouse,
    batchNo: filters.batchNo === "all" ? "—" : filters.batchNo,
    inQty: 0,
    outQty: 0,
    balanceQty: closingQty,
    unit: product.unit,
    costPrice: 0,
  };

  return {
    summary: {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      category: product.category,
      unit: product.unit,
      warehouseLabel: filters.warehouse === "all" ? "All" : filters.warehouse,
      batchLabel: filters.batchNo === "all" ? "All" : filters.batchNo,
      openingQty,
      totalInQty,
      totalOutQty,
      closingQty,
    },
    transactionRows,
    displayRows: [openingRow, ...transactionRows, closingRow],
    hasPeriodTransactions: periodTransactions.length > 0,
  };
}

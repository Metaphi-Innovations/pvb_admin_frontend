/**
 * Inventory Register — product-wise stock movement summary with drill-down detail.
 * Built from actual stock ledger movements (GRN, invoices, transfers, opening, etc.).
 */

import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import {
  buildStockLedgerRows,
  resolveStockLedgerDocumentHref,
  STOCK_LEDGER_TRANSACTION_TYPE_LABELS,
  type StockLedgerTransactionType,
} from "@/app/(app)/accounts/reports/stock-ledger/stock-ledger-data";
import {
  matchesMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";

export interface InventoryRegisterFilters {
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  warehouse: string | string[];
  productId: string | string[];
  category: string;
  search: string;
}

export interface InventoryRegisterMovementDetail {
  id: string;
  date: string;
  transactionType: StockLedgerTransactionType;
  transactionTypeLabel: string;
  voucherNo: string;
  referenceNo: string;
  partyName: string;
  warehouse: string;
  stockIn: number;
  stockOut: number;
  runningBalance: number;
  viewHref?: string;
}

export interface InventoryRegisterProductRow {
  rowKey: string;
  productCode: string;
  productName: string;
  category: string;
  openingStock: number;
  stockIn: number;
  stockOut: number;
  closingStock: number;
  unit: string;
  movements: InventoryRegisterMovementDetail[];
}

export interface InventoryRegisterTotals {
  totalProducts: number;
  totalOpeningStock: number;
  totalStockIn: number;
  totalStockOut: number;
  totalClosingStock: number;
}

export interface InventoryRegisterReport {
  rows: InventoryRegisterProductRow[];
  totals: InventoryRegisterTotals;
  hasData: boolean;
}

interface BaseMovement {
  id: string;
  date: string;
  productCode: string;
  productName: string;
  category: string;
  warehouse: string;
  inQty: number;
  outQty: number;
  unit: string;
  transactionType: StockLedgerTransactionType;
  documentNo: string;
  referenceModule: string;
  remarks: string;
  viewHref?: string;
}

const TXN_LABELS: Record<StockLedgerTransactionType, string> = {
  ...STOCK_LEDGER_TRANSACTION_TYPE_LABELS,
};

function transactionTypeLabel(type: StockLedgerTransactionType, inQty: number, outQty: number): string {
  if (type === "adjustment") {
    if (inQty > 0) return "Stock Adjustment In";
    if (outQty > 0) return "Stock Adjustment Out";
    return "Stock Adjustment";
  }
  return TXN_LABELS[type] ?? type;
}

function buildProductCategoryMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const p of loadProducts()) {
    if (p.sku) map.set(p.sku, p.category?.trim() || "—");
  }
  return map;
}

function lookupCategory(sku: string, categoryMap: Map<string, string>): string {
  return categoryMap.get(sku) ?? "—";
}

function partyNameFromReference(referenceModule: string): string {
  for (const sep of ["—", " – ", " - "]) {
    const idx = referenceModule.indexOf(sep);
    if (idx >= 0) {
      const party = referenceModule.slice(idx + sep.length).trim();
      if (party) return party;
    }
  }
  return "—";
}

function referenceNoFromMovement(remarks: string, documentNo: string): string {
  const trimmed = remarks?.trim();
  if (trimmed) return trimmed;
  return documentNo && documentNo !== "—" ? documentNo : "—";
}

function rowInFinancialYear(date: string, financialYearId: string): boolean {
  if (financialYearId === "all") return true;
  const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
  if (!fy) return true;
  return date >= fy.startDate && date <= fy.endDate;
}

function resolveInventoryRegisterDocumentHref(
  documentNo: string,
  transactionType: StockLedgerTransactionType,
  existingHref?: string,
): string | undefined {
  if (existingHref) return existingHref;

  const base = resolveStockLedgerDocumentHref(documentNo, transactionType);
  if (!documentNo || documentNo === "—") return base ?? undefined;

  if (transactionType === "sales_return") {
    const note = loadCreditNotes().find((n) => n.creditNoteNo === documentNo);
    if (note) return `/accounts/transactions/credit-notes/${note.id}`;
    return "/accounts/transactions/credit-notes";
  }

  if (transactionType === "purchase_return") {
    const note = loadDebitNotes().find((n) => n.debitNoteNo === documentNo);
    if (note) return `/accounts/transactions/debit-notes/${note.id}`;
    return "/accounts/transactions/debit-notes";
  }

  if (transactionType === "adjustment") {
    return "/accounts/transactions/inventory-adjustments";
  }

  return base ?? undefined;
}

function buildBaseMovements(): BaseMovement[] {
  const categoryMap = buildProductCategoryMap();
  return buildStockLedgerRows().map((row) => ({
    id: row.id,
    date: row.date,
    productCode: row.productCode,
    productName: row.productName,
    category: lookupCategory(row.productCode, categoryMap),
    warehouse: row.warehouse,
    inQty: row.inQty,
    outQty: row.outQty,
    unit: row.unit,
    transactionType: row.transactionType,
    documentNo: row.documentNo,
    referenceModule: row.referenceModule,
    remarks: row.remarks,
    viewHref: row.viewHref,
  }));
}

function matchesScopeFilters(
  movement: BaseMovement,
  filters: InventoryRegisterFilters,
  options?: { periodOnly?: boolean },
): boolean {
  if (!matchesMultiFilter(filters.warehouse, movement.warehouse)) return false;
  if (!matchesMultiFilter(filters.productId, movement.productCode)) return false;
  if (filters.category !== "all" && movement.category !== filters.category) return false;

  if (options?.periodOnly) {
    if (filters.dateFrom && movement.date < filters.dateFrom) return false;
    if (filters.dateTo && movement.date > filters.dateTo) return false;
    if (!rowInFinancialYear(movement.date, filters.financialYearId)) return false;
  }

  return true;
}

function matchesSearch(row: Pick<InventoryRegisterProductRow, "productCode" | "productName" | "category">, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return [row.productCode, row.productName, row.category].some((p) =>
    String(p ?? "").toLowerCase().includes(q),
  );
}

function buildMovementDetails(
  movements: BaseMovement[],
  openingStock: number,
): InventoryRegisterMovementDetail[] {
  let balance = openingStock;
  return movements.map((m) => {
    balance += m.inQty - m.outQty;
    return {
      id: m.id,
      date: m.date,
      transactionType: m.transactionType,
      transactionTypeLabel: transactionTypeLabel(m.transactionType, m.inQty, m.outQty),
      voucherNo: m.documentNo,
      referenceNo: referenceNoFromMovement(m.remarks, m.documentNo),
      partyName: partyNameFromReference(m.referenceModule),
      warehouse: m.warehouse,
      stockIn: m.inQty,
      stockOut: m.outQty,
      runningBalance: balance,
      viewHref: resolveInventoryRegisterDocumentHref(m.documentNo, m.transactionType, m.viewHref),
    };
  });
}

export function buildInventoryRegisterReport(filters: InventoryRegisterFilters): InventoryRegisterReport {
  const allMovements = buildBaseMovements();
  const scopedMovements = allMovements.filter((m) => matchesScopeFilters(m, filters));

  const productCodes = new Set(scopedMovements.map((m) => m.productCode));
  const rows: InventoryRegisterProductRow[] = [];

  for (const productCode of productCodes) {
    const productMovements = scopedMovements.filter((m) => m.productCode === productCode);
    if (productMovements.length === 0) continue;

    const productName = productMovements[0]?.productName ?? productCode;
    const category = productMovements[0]?.category ?? "—";
    const unit = productMovements[0]?.unit ?? "—";

    const beforePeriod = productMovements.filter((m) => filters.dateFrom && m.date < filters.dateFrom);
    const openingStock = beforePeriod.reduce((sum, m) => sum + m.inQty - m.outQty, 0);

    const inPeriod = productMovements
      .filter((m) => {
        if (filters.dateFrom && m.date < filters.dateFrom) return false;
        if (filters.dateTo && m.date > filters.dateTo) return false;
        return rowInFinancialYear(m.date, filters.financialYearId);
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

    const stockIn = inPeriod.reduce((sum, m) => sum + m.inQty, 0);
    const stockOut = inPeriod.reduce((sum, m) => sum + m.outQty, 0);
    const closingStock = openingStock + stockIn - stockOut;

    if (openingStock === 0 && stockIn === 0 && stockOut === 0 && closingStock === 0) continue;

    const summaryRow: InventoryRegisterProductRow = {
      rowKey: productCode,
      productCode,
      productName,
      category,
      openingStock,
      stockIn,
      stockOut,
      closingStock,
      unit,
      movements: buildMovementDetails(inPeriod, openingStock),
    };

    if (!matchesSearch(summaryRow, filters.search)) continue;
    rows.push(summaryRow);
  }

  rows.sort((a, b) => a.productName.localeCompare(b.productName));

  const totals: InventoryRegisterTotals = {
    totalProducts: rows.length,
    totalOpeningStock: rows.reduce((s, r) => s + r.openingStock, 0),
    totalStockIn: rows.reduce((s, r) => s + r.stockIn, 0),
    totalStockOut: rows.reduce((s, r) => s + r.stockOut, 0),
    totalClosingStock: rows.reduce((s, r) => s + r.closingStock, 0),
  };

  return {
    rows,
    totals,
    hasData: rows.length > 0,
  };
}

export function getInventoryRegisterProductOptions(): { id: string; name: string; code: string }[] {
  const map = new Map<string, { id: string; name: string; code: string }>();
  for (const row of buildBaseMovements()) {
    if (!map.has(row.productCode)) {
      map.set(row.productCode, {
        id: row.productCode,
        name: row.productName,
        code: row.productCode,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function getInventoryRegisterWarehouseOptions(): string[] {
  return Array.from(new Set(buildBaseMovements().map((m) => m.warehouse))).sort();
}

export function getInventoryRegisterCategoryOptions(): string[] {
  const categories = new Set<string>();
  for (const p of loadProducts()) {
    if (p.category?.trim()) categories.add(p.category.trim());
  }
  for (const m of buildBaseMovements()) {
    if (m.category && m.category !== "—") categories.add(m.category);
  }
  return Array.from(categories).sort();
}

export function formatInventoryRegisterDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
}

export function formatQty(value: number, showZero = false): string {
  if (value === 0 && !showZero) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

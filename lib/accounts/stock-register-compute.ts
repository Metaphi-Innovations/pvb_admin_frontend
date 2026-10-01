/**
 * Stock Register — Summary / Detailed / Batch Wise tabs.
 * Built from shared stock movement ledger (actual transaction history).
 */

import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { roundMoney } from "@/lib/accounts/money-format";
import { matchesMultiFilter } from "@/lib/accounts/report-multi-filter-utils";
import {
  buildStockLedgerRows,
  resolveStockLedgerDocumentHref,
  STOCK_LEDGER_TRANSACTION_TYPE_LABELS,
  type StockLedgerRow,
  type StockLedgerTransactionType,
} from "@/lib/accounts/stock-movement-ledger";

export type StockRegisterTab = "summary" | "detailed" | "batch-wise";

export interface StockRegisterFilters {
  dateFrom: string;
  dateTo: string;
  financialYearId: string;
  branch: string;
  warehouse: string | string[];
  productId: string | string[];
  category: string;
  batchNo: string | string[];
}

export interface StockRegisterSummaryRow {
  rowKey: string;
  productCode: string;
  productName: string;
  category: string;
  openingQty: number;
  inwardQty: number;
  outwardQty: number;
  closingQty: number;
  rate: number;
  closingValue: number;
  unit: string;
}

export interface StockRegisterDetailedRow {
  rowKey: string;
  productCode: string;
  productName: string;
  category: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  warehouse: string;
  openingStock: number;
  purchaseQty: number;
  purchaseReturnQty: number;
  netPurchase: number;
  salesQty: number;
  salesReturnQty: number;
  netSales: number;
  stockTransferIn: number;
  stockTransferOut: number;
  sampleReturn: number;
  sampleIssue: number;
  positiveAdjustment: number;
  negativeAdjustment: number;
  closingStock: number;
  rate: number;
  closingValue: number;
  unit: string;
}

export interface StockRegisterBatchWiseRow {
  id: string;
  date: string;
  voucherType: string;
  voucherNumber: string;
  transactionType: StockLedgerTransactionType;
  productCode: string;
  productName: string;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
  warehouse: string;
  partyName: string;
  quantityIn: number;
  quantityOut: number;
  runningBalanceQty: number;
  rate: number;
  value: number;
  remarks: string;
  viewHref?: string;
}

export interface StockRegisterSummaryTotals {
  totalProducts: number;
  totalOpeningQty: number;
  totalInwardQty: number;
  totalOutwardQty: number;
  totalClosingValue: number;
}

export interface StockRegisterDetailedTotals {
  totalProducts: number;
  totalBatches: number;
  totalOpeningQty: number;
  totalClosingQty: number;
  totalClosingValue: number;
}

export interface StockRegisterBatchWiseTotals {
  totalTransactions: number;
  totalQuantityIn: number;
  totalQuantityOut: number;
  currentBalanceQty: number;
  totalMovementValue: number;
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

function rowInFinancialYear(date: string, financialYearId: string): boolean {
  if (financialYearId === "all") return true;
  const fy = loadFinancialYears().find((y) => String(y.id) === financialYearId);
  if (!fy) return true;
  return date >= fy.startDate && date <= fy.endDate;
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

function matchesScope(row: StockLedgerRow, filters: StockRegisterFilters): boolean {
  if (!matchesMultiFilter(filters.warehouse, row.warehouse)) return false;
  if (!matchesMultiFilter(filters.productId, row.productCode)) return false;
  if (!matchesMultiFilter(filters.batchNo, row.batchNo)) return false;
  // Branch is retained for UI/export; movement rows are warehouse-scoped today.
  void filters.branch;
  return true;
}

function resolveDocumentHref(row: StockLedgerRow): string | undefined {
  if (row.viewHref) return row.viewHref;
  if (row.transactionType === "sales_return") {
    const note = loadCreditNotes().find((n) => n.creditNoteNo === row.documentNo);
    if (note) return `/accounts/transactions/credit-notes/${note.id}`;
    return "/accounts/transactions/credit-notes";
  }
  if (row.transactionType === "purchase_return") {
    const note = loadDebitNotes().find((n) => n.debitNoteNo === row.documentNo);
    if (note) return `/accounts/transactions/debit-notes/${note.id}`;
    return "/accounts/transactions/debit-notes";
  }
  return resolveStockLedgerDocumentHref(row.documentNo, row.transactionType) ?? undefined;
}

function weightedAverageRate(rows: StockLedgerRow[], fallbackClosingQty: number): number {
  let amount = 0;
  let qty = 0;
  for (const row of rows) {
    const movementQty = Math.abs(row.inQty - row.outQty);
    if (movementQty <= 0 || row.rate <= 0) continue;
    amount += movementQty * row.rate;
    qty += movementQty;
  }
  if (qty > 0) return roundMoney(amount / qty);
  const lastWithRate = [...rows].reverse().find((r) => r.rate > 0);
  if (lastWithRate) return lastWithRate.rate;
  return fallbackClosingQty !== 0 ? 0 : 0;
}

function bucketDetailedQty(type: StockLedgerTransactionType, inQty: number, outQty: number) {
  return {
    purchaseQty: type === "purchase" ? inQty : 0,
    purchaseReturnQty: type === "purchase_return" ? outQty : 0,
    salesQty: type === "sales" ? outQty : 0,
    salesReturnQty: type === "sales_return" ? inQty : 0,
    stockTransferIn: type === "stock_transfer_in" ? inQty : 0,
    stockTransferOut: type === "stock_transfer_out" ? outQty : 0,
    sampleReturn: type === "sample_return" ? inQty : 0,
    sampleIssue: type === "sample_issue" ? outQty : 0,
    positiveAdjustment:
      type === "positive_adjustment" ? inQty : type === "adjustment" && inQty > 0 ? inQty : 0,
    negativeAdjustment:
      type === "negative_adjustment" || type === "expired_stock" || type === "damaged_stock"
        ? outQty
        : type === "adjustment" && outQty > 0
          ? outQty
          : 0,
  };
}

export function buildStockRegisterSummary(
  filters: StockRegisterFilters,
): { rows: StockRegisterSummaryRow[]; totals: StockRegisterSummaryTotals; hasData: boolean } {
  const categoryMap = buildProductCategoryMap();
  const all = buildStockLedgerRows().filter((r) => matchesScope(r, filters));
  const productCodes = Array.from(new Set(all.map((r) => r.productCode)));
  const rows: StockRegisterSummaryRow[] = [];

  for (const productCode of productCodes) {
    const productRows = all.filter((r) => r.productCode === productCode);
    if (productRows.length === 0) continue;
    if (filters.category !== "all" && lookupCategory(productCode, categoryMap) !== filters.category) {
      continue;
    }

    const before = productRows.filter((r) => filters.dateFrom && r.date < filters.dateFrom);
    const openingQty = before.reduce((s, r) => s + r.inQty - r.outQty, 0);

    const inPeriod = productRows.filter((r) => {
      if (filters.dateFrom && r.date < filters.dateFrom) return false;
      if (filters.dateTo && r.date > filters.dateTo) return false;
      return rowInFinancialYear(r.date, filters.financialYearId);
    });

    const inwardQty = inPeriod.reduce((s, r) => s + r.inQty, 0);
    const outwardQty = inPeriod.reduce((s, r) => s + r.outQty, 0);
    const closingQty = openingQty + inwardQty - outwardQty;
    if (openingQty === 0 && inwardQty === 0 && outwardQty === 0) continue;

    const rate = weightedAverageRate([...before, ...inPeriod], closingQty);
    rows.push({
      rowKey: productCode,
      productCode,
      productName: productRows[0]?.productName ?? productCode,
      category: lookupCategory(productCode, categoryMap),
      openingQty,
      inwardQty,
      outwardQty,
      closingQty,
      rate,
      closingValue: roundMoney(closingQty * rate),
      unit: productRows[0]?.unit ?? "—",
    });
  }

  rows.sort((a, b) => a.productName.localeCompare(b.productName));

  const totals: StockRegisterSummaryTotals = {
    totalProducts: rows.length,
    totalOpeningQty: rows.reduce((s, r) => s + r.openingQty, 0),
    totalInwardQty: rows.reduce((s, r) => s + r.inwardQty, 0),
    totalOutwardQty: rows.reduce((s, r) => s + r.outwardQty, 0),
    totalClosingValue: roundMoney(rows.reduce((s, r) => s + r.closingValue, 0)),
  };

  return { rows, totals, hasData: rows.length > 0 };
}

export function buildStockRegisterDetailed(
  filters: StockRegisterFilters,
): { rows: StockRegisterDetailedRow[]; totals: StockRegisterDetailedTotals; hasData: boolean } {
  const categoryMap = buildProductCategoryMap();
  const all = buildStockLedgerRows().filter((r) => matchesScope(r, filters));
  const keys = new Map<string, StockLedgerRow[]>();

  for (const row of all) {
    if (filters.category !== "all" && lookupCategory(row.productCode, categoryMap) !== filters.category) {
      continue;
    }
    const key = `${row.productCode}|${row.batchNo}|${row.warehouse}`;
    const list = keys.get(key) ?? [];
    list.push(row);
    keys.set(key, list);
  }

  const rows: StockRegisterDetailedRow[] = [];

  for (const [key, productRows] of keys) {
    const before = productRows.filter((r) => filters.dateFrom && r.date < filters.dateFrom);
    const openingStock = before.reduce((s, r) => s + r.inQty - r.outQty, 0);

    const inPeriod = productRows.filter((r) => {
      if (filters.dateFrom && r.date < filters.dateFrom) return false;
      if (filters.dateTo && r.date > filters.dateTo) return false;
      return rowInFinancialYear(r.date, filters.financialYearId);
    });

    let purchaseQty = 0;
    let purchaseReturnQty = 0;
    let salesQty = 0;
    let salesReturnQty = 0;
    let stockTransferIn = 0;
    let stockTransferOut = 0;
    let sampleReturn = 0;
    let sampleIssue = 0;
    let positiveAdjustment = 0;
    let negativeAdjustment = 0;

    for (const r of inPeriod) {
      const b = bucketDetailedQty(r.transactionType, r.inQty, r.outQty);
      purchaseQty += b.purchaseQty;
      purchaseReturnQty += b.purchaseReturnQty;
      salesQty += b.salesQty;
      salesReturnQty += b.salesReturnQty;
      stockTransferIn += b.stockTransferIn;
      stockTransferOut += b.stockTransferOut;
      sampleReturn += b.sampleReturn;
      sampleIssue += b.sampleIssue;
      positiveAdjustment += b.positiveAdjustment;
      negativeAdjustment += b.negativeAdjustment;
    }

    const netPurchase = purchaseQty - purchaseReturnQty;
    const netSales = salesQty - salesReturnQty;
    const closingStock =
      openingStock +
      netPurchase +
      salesReturnQty +
      stockTransferIn +
      sampleReturn +
      positiveAdjustment -
      salesQty -
      stockTransferOut -
      sampleIssue -
      negativeAdjustment;

    if (
      openingStock === 0 &&
      purchaseQty === 0 &&
      purchaseReturnQty === 0 &&
      salesQty === 0 &&
      salesReturnQty === 0 &&
      stockTransferIn === 0 &&
      stockTransferOut === 0 &&
      sampleReturn === 0 &&
      sampleIssue === 0 &&
      positiveAdjustment === 0 &&
      negativeAdjustment === 0
    ) {
      continue;
    }

    const sample = productRows[0]!;
    const rate = weightedAverageRate([...before, ...inPeriod], closingStock);
    const withMeta = [...inPeriod, ...before].find((r) => r.mfgDate || r.expiryDate) ?? sample;

    rows.push({
      rowKey: key,
      productCode: sample.productCode,
      productName: sample.productName,
      category: lookupCategory(sample.productCode, categoryMap),
      batchNo: sample.batchNo,
      mfgDate: withMeta.mfgDate,
      expiryDate: withMeta.expiryDate,
      warehouse: sample.warehouse,
      openingStock,
      purchaseQty,
      purchaseReturnQty,
      netPurchase,
      salesQty,
      salesReturnQty,
      netSales,
      stockTransferIn,
      stockTransferOut,
      sampleReturn,
      sampleIssue,
      positiveAdjustment,
      negativeAdjustment,
      closingStock,
      rate,
      closingValue: roundMoney(closingStock * rate),
      unit: sample.unit,
    });
  }

  rows.sort(
    (a, b) =>
      a.productName.localeCompare(b.productName) ||
      a.batchNo.localeCompare(b.batchNo) ||
      a.warehouse.localeCompare(b.warehouse),
  );

  const totals: StockRegisterDetailedTotals = {
    totalProducts: new Set(rows.map((r) => r.productCode)).size,
    totalBatches: rows.length,
    totalOpeningQty: rows.reduce((s, r) => s + r.openingStock, 0),
    totalClosingQty: rows.reduce((s, r) => s + r.closingStock, 0),
    totalClosingValue: roundMoney(rows.reduce((s, r) => s + r.closingValue, 0)),
  };

  return { rows, totals, hasData: rows.length > 0 };
}

export function buildStockRegisterBatchWise(
  filters: StockRegisterFilters,
): { rows: StockRegisterBatchWiseRow[]; totals: StockRegisterBatchWiseTotals; hasData: boolean } {
  const categoryMap = buildProductCategoryMap();
  const scoped = buildStockLedgerRows().filter((r) => {
    if (!matchesScope(r, filters)) return false;
    if (filters.category !== "all" && lookupCategory(r.productCode, categoryMap) !== filters.category) {
      return false;
    }
    return true;
  });

  const openingByKey = new Map<string, number>();
  for (const row of scoped) {
    if (!filters.dateFrom || row.date >= filters.dateFrom) continue;
    const key = `${row.productCode}|${row.warehouse}|${row.batchNo}`;
    openingByKey.set(key, (openingByKey.get(key) ?? 0) + row.inQty - row.outQty);
  }

  const inPeriod = scoped
    .filter((r) => {
      if (filters.dateFrom && r.date < filters.dateFrom) return false;
      if (filters.dateTo && r.date > filters.dateTo) return false;
      return rowInFinancialYear(r.date, filters.financialYearId);
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const balances = new Map<string, number>(openingByKey);
  const rows: StockRegisterBatchWiseRow[] = inPeriod.map((row) => {
    const key = `${row.productCode}|${row.warehouse}|${row.batchNo}`;
    const opening = balances.get(key) ?? 0;
    const running = opening + row.inQty - row.outQty;
    balances.set(key, running);
    return {
      id: row.id,
      date: row.date,
      voucherType: STOCK_LEDGER_TRANSACTION_TYPE_LABELS[row.transactionType],
      voucherNumber: row.documentNo,
      transactionType: row.transactionType,
      productCode: row.productCode,
      productName: row.productName,
      batchNo: row.batchNo,
      mfgDate: row.mfgDate,
      expiryDate: row.expiryDate,
      warehouse: row.warehouse,
      partyName: partyNameFromReference(row.referenceModule),
      quantityIn: row.inQty,
      quantityOut: row.outQty,
      runningBalanceQty: running,
      rate: row.rate,
      value: row.value,
      remarks: row.remarks || "",
      viewHref: resolveDocumentHref(row),
    };
  });

  let currentBalanceQty = 0;
  for (const bal of balances.values()) currentBalanceQty += bal;

  const totals: StockRegisterBatchWiseTotals = {
    totalTransactions: rows.length,
    totalQuantityIn: rows.reduce((s, r) => s + r.quantityIn, 0),
    totalQuantityOut: rows.reduce((s, r) => s + r.quantityOut, 0),
    currentBalanceQty,
    totalMovementValue: roundMoney(rows.reduce((s, r) => s + r.value, 0)),
  };

  return { rows, totals, hasData: rows.length > 0 };
}

export function getStockRegisterProductOptions(): { id: string; name: string; code: string }[] {
  const map = new Map<string, { id: string; name: string; code: string }>();
  for (const row of buildStockLedgerRows()) {
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

export function getStockRegisterWarehouseOptions(): string[] {
  return Array.from(new Set(buildStockLedgerRows().map((r) => r.warehouse))).sort();
}

export function getStockRegisterCategoryOptions(): string[] {
  const categories = new Set<string>();
  for (const p of loadProducts()) {
    if (p.category?.trim()) categories.add(p.category.trim());
  }
  const categoryMap = buildProductCategoryMap();
  for (const row of buildStockLedgerRows()) {
    const cat = lookupCategory(row.productCode, categoryMap);
    if (cat && cat !== "—") categories.add(cat);
  }
  return Array.from(categories).sort();
}

export function getStockRegisterBatchOptions(): string[] {
  return Array.from(
    new Set(buildStockLedgerRows().map((r) => r.batchNo).filter((b) => b && b !== "—")),
  ).sort();
}

export function buildStockRegisterDrillHref(params: {
  productCode?: string;
  warehouse?: string;
  batchNo?: string;
  financialYearId?: string;
  dateFrom?: string;
  dateTo?: string;
  tab?: StockRegisterTab;
}): string {
  const qs = new URLSearchParams();
  qs.set("tab", params.tab ?? "batch-wise");
  if (params.productCode) qs.set("product", params.productCode);
  if (params.warehouse?.trim()) qs.set("warehouse", params.warehouse);
  if (params.batchNo?.trim() && params.batchNo !== "—") qs.set("batch", params.batchNo);
  if (params.financialYearId && params.financialYearId !== "all") qs.set("fy", params.financialYearId);
  if (params.dateFrom) qs.set("dateFrom", params.dateFrom);
  if (params.dateTo) qs.set("dateTo", params.dateTo);
  return `/accounts/reports/stock-register?${qs.toString()}`;
}

export function formatStockRegisterDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T12:00:00`)
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
}

export function formatQty(value: number, showZero = false): string {
  if (value === 0 && !showZero) return "—";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

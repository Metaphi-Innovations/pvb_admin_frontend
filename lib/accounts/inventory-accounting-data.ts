/**
 * Inventory accounting — bridges Warehouse stock, Product/Pricing masters, and Accounts.
 * Stock value = Available Qty × Cost Price (Pricing Master CP only).
 */

import { getQcPassedStockRecords } from "@/app/(app)/warehouse/stockoverview/mock-data";
import type { QcPassedStockRecord } from "@/app/(app)/warehouse/stockoverview/types";
import { getGrnRecords } from "@/app/(app)/warehouse/grn/mock-data";
const getDispatchRecords = (): any[] => [];

import { loadPricingRecords, findActivePricingForStock, ensurePricingDemoSeed } from "@/app/(app)/masters/pricing/pricing-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { findProductByName } from "@/lib/accounts/transaction-master-fetch";
import { loadStockOpeningRows } from "@/lib/accounts/stock-opening-data";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { loadStockReconciliations } from "@/lib/accounts/stock-reconciliation-data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";

// ── Types ───────────────────────────────────────────────────────────────────

export type InventoryVoucherType =
  | "Opening Stock"
  | "GRN"
  | "Purchase Return"
  | "Sales Dispatch"
  | "Sales Return"
  | "Stock Adjustment"
  | "Stock Reconciliation";

export type ExpiryBucket =
  | "all"
  | "Expired"
  | "Expiring in 30 Days"
  | "Expiring in 60 Days"
  | "Expiring in 90 Days"
  | "Healthy Stock";

export type StockStatus = "Available" | "Near Expiry" | "Expired";

export type AgingBucket =
  | "all"
  | "0-30 days"
  | "31-60 days"
  | "61-90 days"
  | "91-180 days"
  | "180+ days";

export interface InventoryMovement {
  id: string;
  date: string;
  voucherType: InventoryVoucherType;
  voucherNo: string;
  product: string;
  sku: string;
  warehouse: string;
  batchNo: string;
  inQty: number;
  outQty: number;
  rate: number;
  source: string;
  narration?: string;
}

export interface InventoryRegisterRow extends InventoryMovement {
  balanceQty: number;
  stockValue: number;
}

export interface StockValuationRow {
  sku: string;
  product: string;
  uom: string;
  packSize: string;
  unitsPerCase: number;
  warehouse: string;
  batchNo: string;
  availableQty: number;
  reservedQty: number;
  costPrice: number;
  cpMissing: boolean;
  stockValue: number;
  expiryDate: string;
  status: string;
  expiryBucket: ExpiryBucket;
  agingBucket: AgingBucket;
  grnReceiptDate: string;
  stockId: string;
}

export interface ProductValuationSummary {
  product: string;
  sku: string;
  uom: string;
  availableQty: number;
  reservedQty: number;
  costPrice: number;
  cpMissing: boolean;
  inventoryValue: number;
}

export interface WarehouseValuationSummary {
  warehouse: string;
  totalSkus: number;
  availableQty: number;
  reservedQty: number;
  inventoryValue: number;
}

export interface BatchRegisterRow {
  product: string;
  sku: string;
  uom: string;
  packSize: string;
  unitsPerPack: number;
  batchNo: string;
  warehouse: string;
  availableQty: number;
  costPrice: number;
  cpMissing: boolean;
  mfgDate: string;
  expiryDate: string;
  stockStatus: StockStatus;
  stockValue: number;
}

export interface InventoryDashboardMetrics {
  totalInventoryValue: number;
  totalAvailableQty: number;
  nearExpiryStockValue: number;
  expiredStockValue: number;
  cogsThisMonth: number;
  stockAdjustmentValue: number;
}

// ── Pricing & SKU ─────────────────────────────────────────────────────────────

export function resolveSku(productName: string, skuHint?: string): string {
  if (skuHint?.trim()) return skuHint.trim();
  const match = findProductByName(productName);
  if (match?.sku) return match.sku;
  const products = loadProducts();
  const exact = products.find((p) => p.productName.toLowerCase() === productName.trim().toLowerCase());
  if (exact) return exact.sku;
  const pricing = loadPricingRecords().find(
    (r) => r.productName.toLowerCase() === productName.trim().toLowerCase(),
  );
  return pricing?.sku ?? productName;
}

export function getCostPriceBySku(sku: string, productName?: string): number {
  ensurePricingDemoSeed();
  const pricing = findActivePricingForStock(sku, productName ?? sku);
  return pricing?.costPrice ?? 0;
}

export function getCostPriceByProductName(productName: string): number {
  const sku = resolveSku(productName);
  return getCostPriceBySku(sku, productName);
}

export function isCpMissing(sku: string, productName: string): boolean {
  const pricing = findActivePricingForStock(sku, productName);
  return !pricing || pricing.costPrice <= 0;
}

export function computeStockValue(availableQty: number, cp: number, cpMissing: boolean): number {
  if (availableQty === 0) return 0;
  if (cpMissing) return 0;
  return availableQty * cp;
}

// ── Expiry & aging ────────────────────────────────────────────────────────────

function daysBetween(from: string, to: string): number {
  const a = new Date(from);
  const b = new Date(to);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 9999;
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function getStockStatus(expiryDate: string, asOn = new Date().toISOString().slice(0, 10)): StockStatus {
  if (!expiryDate) return "Available";
  const days = daysBetween(asOn, expiryDate);
  if (days < 0) return "Expired";
  if (days <= 90) return "Near Expiry";
  return "Available";
}

/** Active usable inventory: qty > 0 and not expired as on the given date. */
export function isActiveUsableInventory(
  availableQty: number,
  expiryDate: string,
  asOn = new Date().toISOString().slice(0, 10),
): boolean {
  if (availableQty <= 0) return false;
  if (!expiryDate) return true;
  return daysBetween(asOn, expiryDate) >= 0;
}

function isViewingExpiredInventory(filters: StockValuationFilters): boolean {
  return filters.status === "Expired" || filters.expiryBucket === "Expired";
}

export function getExpiryBucket(expiryDate: string, asOn = new Date().toISOString().slice(0, 10)): ExpiryBucket {
  if (!expiryDate) return "Healthy Stock";
  const days = daysBetween(asOn, expiryDate);
  if (days < 0) return "Expired";
  if (days <= 30) return "Expiring in 30 Days";
  if (days <= 60) return "Expiring in 60 Days";
  if (days <= 90) return "Expiring in 90 Days";
  return "Healthy Stock";
}

export function getAgingBucket(grnDate: string, asOn = new Date().toISOString().slice(0, 10)): AgingBucket {
  if (!grnDate) return "180+ days";
  const age = daysBetween(grnDate, asOn);
  if (age <= 30) return "0-30 days";
  if (age <= 60) return "31-60 days";
  if (age <= 90) return "61-90 days";
  if (age <= 180) return "91-180 days";
  return "180+ days";
}

/** GRN receipt date by product + batch (+ warehouse when known) */
function buildGrnReceiptDateMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const grn of getGrnRecords()) {
    if (grn.status !== "qc_completed") continue;
    for (const batch of grn.batches) {
      const sku = resolveSku(batch.productName);
      const keys = [
        `${batch.productName}|${batch.batchNumber}|${grn.warehouse}`,
        `${sku}|${batch.batchNumber}|${grn.warehouse}`,
        `${batch.productName}|${batch.batchNumber}`,
        `${sku}|${batch.batchNumber}`,
      ];
      for (const k of keys) {
        if (!map.has(k) || grn.grnDate < (map.get(k) ?? "")) {
          map.set(k, grn.grnDate);
        }
      }
    }
  }
  return map;
}

function lookupGrnDate(product: string, sku: string, batch: string, warehouse: string): string {
  const map = buildGrnReceiptDateMap();
  return (
    map.get(`${product}|${batch}|${warehouse}`) ??
    map.get(`${sku}|${batch}|${warehouse}`) ??
    map.get(`${product}|${batch}`) ??
    map.get(`${sku}|${batch}`) ??
    ""
  );
}

// ── Stock valuation from warehouse QC-passed ──────────────────────────────────

export interface StockValuationFilters {
  warehouse?: string;
  product?: string;
  sku?: string;
  batch?: string;
  status?: string;
  expiryBucket?: ExpiryBucket;
  asOnDate?: string;
}

export function enrichStockRecord(
  record: QcPassedStockRecord,
  asOnDate?: string,
): StockValuationRow {
  const sku = resolveSku(record.product);
  const pricing = findActivePricingForStock(sku, record.product);
  const cp = pricing?.costPrice ?? 0;
  const cpMissing = !pricing || cp <= 0;
  const grnReceiptDate = lookupGrnDate(record.product, sku, record.batchNumber, record.warehouse);
  const expiryBucket = getExpiryBucket(record.expiryDate, asOnDate);
  return {
    sku: pricing?.sku ?? sku,
    product: record.product,
    uom: pricing?.uom ?? "",
    packSize: pricing?.packSize ?? "",
    unitsPerCase: pricing?.unitsPerCase ?? 1,
    warehouse: record.warehouse,
    batchNo: record.batchNumber,
    availableQty: record.availableQuantity,
    reservedQty: 0,
    costPrice: cp,
    cpMissing,
    stockValue: computeStockValue(record.availableQuantity, cp, cpMissing),
    expiryDate: record.expiryDate,
    status: getStockStatus(record.expiryDate, asOnDate),
    expiryBucket,
    agingBucket: getAgingBucket(grnReceiptDate, asOnDate),
    grnReceiptDate,
    stockId: record.id,
  };
}

export function computeStockValuationRows(filters: StockValuationFilters = {}): StockValuationRow[] {
  const asOn = filters.asOnDate ?? new Date().toISOString().slice(0, 10);
  const viewingExpired = isViewingExpiredInventory(filters);
  return getQcPassedStockRecords()
    .map((r) => enrichStockRecord(r, asOn))
    .filter((row) => {
      if (row.availableQty <= 0) return false;
      if (viewingExpired) {
        if (row.status !== "Expired") return false;
      } else if (!isActiveUsableInventory(row.availableQty, row.expiryDate, asOn)) {
        return false;
      }
      if (filters.warehouse && filters.warehouse !== "all" && row.warehouse !== filters.warehouse) return false;
      if (filters.product && filters.product !== "all" && row.product !== filters.product) return false;
      if (filters.sku && filters.sku !== "all" && row.sku !== filters.sku) return false;
      if (filters.batch && filters.batch !== "all" && row.batchNo !== filters.batch) return false;
      if (filters.status && filters.status !== "all" && row.status !== filters.status) return false;
      if (filters.expiryBucket && filters.expiryBucket !== "all" && row.expiryBucket !== filters.expiryBucket) {
        return false;
      }
      return true;
    });
}

export function computeWarehouseValuationSummary(rows: StockValuationRow[]): WarehouseValuationSummary[] {
  const byWh = new Map<string, WarehouseValuationSummary>();
  for (const row of rows) {
    if (row.cpMissing && row.availableQty > 0) continue;
    const existing = byWh.get(row.warehouse) ?? {
      warehouse: row.warehouse,
      totalSkus: 0,
      availableQty: 0,
      reservedQty: 0,
      inventoryValue: 0,
    };
    existing.totalSkus += 1;
    existing.availableQty += row.availableQty;
    existing.reservedQty += row.reservedQty;
    existing.inventoryValue += row.stockValue;
    byWh.set(row.warehouse, existing);
  }
  return Array.from(byWh.values()).sort((a, b) => a.warehouse.localeCompare(b.warehouse));
}

export function computeProductValuationSummary(rows: StockValuationRow[]): ProductValuationSummary[] {
  const byProduct = new Map<string, ProductValuationSummary>();
  for (const row of rows) {
    if (row.cpMissing && row.availableQty > 0) continue;
    const key = row.sku;
    const existing = byProduct.get(key) ?? {
      product: row.product,
      sku: row.sku,
      uom: row.uom,
      availableQty: 0,
      reservedQty: 0,
      costPrice: row.costPrice,
      cpMissing: row.cpMissing,
      inventoryValue: 0,
    };
    existing.availableQty += row.availableQty;
    existing.reservedQty += row.reservedQty;
    existing.inventoryValue += row.stockValue;
    if (!existing.cpMissing && row.cpMissing) existing.cpMissing = true;
    byProduct.set(key, existing);
  }
  return Array.from(byProduct.values()).sort((a, b) => a.product.localeCompare(b.product));
}

export function stockValuationSummary(rows: StockValuationRow[], asOnDate?: string) {
  const asOn = asOnDate ?? new Date().toISOString().slice(0, 10);
  const valuedRows = rows.filter((r) => !(r.cpMissing && r.availableQty > 0));
  const totalAvailableQty = rows.reduce((s, r) => s + r.availableQty, 0);
  const totalInventoryValue = valuedRows.reduce((s, r) => s + r.stockValue, 0);
  const nearExpiryStockValue = valuedRows
    .filter((r) => getStockStatus(r.expiryDate, asOn) === "Near Expiry")
    .reduce((s, r) => s + r.stockValue, 0);
  const expiredStockValue = valuedRows
    .filter((r) => getStockStatus(r.expiryDate, asOn) === "Expired")
    .reduce((s, r) => s + r.stockValue, 0);
  const cpMissingCount = rows.filter((r) => r.cpMissing && r.availableQty > 0).length;
  return {
    totalItems: rows.length,
    totalAvailableQty,
    totalInventoryValue,
    nearExpiryStockValue,
    expiredStockValue,
    cpMissingCount,
  };
}

// ── Inventory movements ───────────────────────────────────────────────────────

export function buildInventoryMovements(filters?: {
  dateFrom?: string;
  dateTo?: string;
  warehouse?: string;
  sku?: string;
  product?: string;
}): InventoryMovement[] {
  const movements: InventoryMovement[] = [];

  for (const row of loadStockOpeningRows()) {
    if (row.openingQty <= 0) continue;
    movements.push({
      id: `op-${row.id}`,
      date: row.date,
      voucherType: "Opening Stock",
      voucherNo: `OP-${row.sku}`,
      product: row.itemName,
      sku: row.sku,
      warehouse: row.warehouse,
      batchNo: row.batchNo || "—",
      inQty: row.openingQty,
      outQty: 0,
      rate: row.rate || getCostPriceBySku(row.sku, row.itemName),
      source: "Stock Opening",
      narration: row.remarks,
    });
  }

  for (const grn of getGrnRecords()) {
    if (grn.status !== "qc_completed") continue;
    for (const batch of grn.batches) {
      const sku = resolveSku(batch.productName);
      const rate = getCostPriceBySku(sku, batch.productName);
      movements.push({
        id: `grn-${grn.id}-${batch.batchNumber}`,
        date: grn.grnDate,
        voucherType: "GRN",
        voucherNo: grn.grnNo,
        product: batch.productName,
        sku,
        warehouse: grn.warehouse,
        batchNo: batch.batchNumber,
        inQty: batch.quantity,
        outQty: 0,
        rate,
        source: `GRN QC Passed — ${grn.vendorName}`,
        narration: `PO ${grn.poNumber}`,
      });
    }
  }

  for (const dispatch of getDispatchRecords()) {
    if (dispatch.deliveryStatus === "Cancelled") continue;
    for (const p of dispatch.products) {
      const sku = resolveSku(p.product, p.sku);
      const rate = getCostPriceBySku(sku, p.product);
      movements.push({
        id: `dsp-${dispatch.id}-${sku}`,
        date: dispatch.dispatchDate,
        voucherType: "Sales Dispatch",
        voucherNo: dispatch.dispatchNumber,
        product: p.product,
        sku,
        warehouse: dispatch.warehouse,
        batchNo: "—",
        inQty: 0,
        outQty: p.dispatchQty,
        rate,
        source: `Dispatch — ${dispatch.customer}`,
        narration: `SO ${dispatch.salesOrderNumber}`,
      });
    }
  }

  for (const inv of loadInvoices()) {
    if (inv.invoiceStatus === "cancelled") continue;
    for (const line of inv.lineItems) {
      if (line.qty <= 0) continue;
      const sku = resolveSku(line.productName);
      movements.push({
        id: `si-${inv.id}-${line.id}`,
        date: inv.invoiceDate,
        voucherType: "Sales Dispatch",
        voucherNo: inv.invoiceNo,
        product: line.productName,
        sku,
        warehouse: inv.warehouse ?? "Central Warehouse",
        batchNo: "—",
        inQty: 0,
        outQty: line.qty,
        rate: getCostPriceBySku(sku, line.productName),
        source: `Sales Invoice — ${inv.customerName}`,
      });
    }
  }

  for (const note of loadDebitNotes()) {
    if (note.status !== "approved") continue;
    for (const line of note.lineItems ?? []) {
      const sku = resolveSku(line.productName);
      const qty = line.returnQty ?? 0;
      if (qty <= 0) continue;
      movements.push({
        id: `dn-${note.id}-${line.id}`,
        date: note.debitNoteDate,
        voucherType: "Purchase Return",
        voucherNo: note.debitNoteNo,
        product: line.productName,
        sku,
        warehouse: "Central Warehouse",
        batchNo: "—",
        inQty: 0,
        outQty: qty,
        rate: getCostPriceBySku(sku, line.productName),
        source: `Debit Note — ${note.vendorName}`,
      });
    }
  }

  for (const note of loadCreditNotes()) {
    if (note.status !== "approved") continue;
    for (const line of note.lineItems ?? []) {
      const sku = resolveSku(line.productName);
      const qty = line.returnQty ?? 0;
      if (qty <= 0) continue;
      movements.push({
        id: `cn-${note.id}-${line.id}`,
        date: note.creditNoteDate,
        voucherType: "Sales Return",
        voucherNo: note.creditNoteNo,
        product: line.productName,
        sku,
        warehouse: "Central Warehouse",
        batchNo: "—",
        inQty: qty,
        outQty: 0,
        rate: getCostPriceBySku(sku, line.productName),
        source: `Credit Note — ${note.customerName}`,
      });
    }
  }

  for (const rec of loadStockReconciliations()) {
    if (rec.status !== "posted" && rec.status !== "approved") continue;
    const diff = rec.physicalQty - rec.systemQty;
    if (diff === 0) continue;
    movements.push({
      id: `rec-${rec.id}`,
      date: rec.date,
      voucherType: "Stock Reconciliation",
      voucherNo: rec.id,
      product: rec.product,
      sku: rec.sku,
      warehouse: rec.warehouse,
      batchNo: rec.batchNo,
      inQty: diff > 0 ? diff : 0,
      outQty: diff < 0 ? Math.abs(diff) : 0,
      rate: rec.costPrice,
      source: "Stock Reconciliation",
      narration: rec.reason,
    });
  }

  let filtered = movements.sort((a, b) => a.date.localeCompare(b.date) || a.voucherNo.localeCompare(b.voucherNo));
  if (filters?.dateFrom) filtered = filtered.filter((m) => m.date >= filters.dateFrom!);
  if (filters?.dateTo) filtered = filtered.filter((m) => m.date <= filters.dateTo!);
  if (filters?.warehouse && filters.warehouse !== "all") {
    filtered = filtered.filter((m) => m.warehouse === filters.warehouse);
  }
  if (filters?.sku && filters.sku !== "all") filtered = filtered.filter((m) => m.sku === filters.sku);
  if (filters?.product && filters.product !== "all") {
    filtered = filtered.filter((m) => m.product === filters.product);
  }
  return filtered;
}

export function computeInventoryRegister(filters?: Parameters<typeof buildInventoryMovements>[0]): InventoryRegisterRow[] {
  const movements = buildInventoryMovements(filters);
  const balanceKey = (m: InventoryMovement) =>
    `${m.sku}|${m.warehouse}|${m.batchNo}`;
  const balances = new Map<string, number>();
  const rows: InventoryRegisterRow[] = [];

  for (const m of movements) {
    const key = balanceKey(m);
    const prev = balances.get(key) ?? 0;
    const next = prev + m.inQty - m.outQty;
    balances.set(key, next);
    rows.push({
      ...m,
      balanceQty: next,
      stockValue: next * m.rate,
    });
  }
  return rows;
}

export function buildProductInventoryLedger(
  sku: string,
  filters?: { warehouse?: string; batchNo?: string; dateFrom?: string; dateTo?: string },
) {
  const product = loadProducts().find((p) => p.sku === sku)?.productName;
  const movements = buildInventoryMovements({
    sku,
    product: product ?? undefined,
    dateFrom: filters?.dateFrom,
    dateTo: filters?.dateTo,
    warehouse: filters?.warehouse,
  }).filter((m) => {
    if (filters?.warehouse && filters.warehouse !== "all" && m.warehouse !== filters.warehouse) return false;
    if (filters?.batchNo && filters.batchNo !== "all" && m.batchNo !== filters.batchNo) return false;
    return true;
  });

  let balance = 0;
  return movements.map((m) => {
    balance += m.inQty - m.outQty;
    return {
      date: m.date,
      voucherType: m.voucherType,
      voucherNo: m.voucherNo,
      warehouse: m.warehouse,
      batchNo: m.batchNo,
      inQty: m.inQty,
      outQty: m.outQty,
      balanceQty: balance,
      rate: m.rate,
      value: balance * m.rate,
      narration: m.narration ?? m.source,
    };
  });
}

// ── Batch register ────────────────────────────────────────────────────────────

export function computeBatchRegister(filters?: {
  warehouse?: string;
  product?: string;
  sku?: string;
  batch?: string;
  asOnDate?: string;
}): BatchRegisterRow[] {
  const asOn = filters?.asOnDate ?? new Date().toISOString().slice(0, 10);
  const stockRows = computeStockValuationRows({
    warehouse: filters?.warehouse,
    product: filters?.product,
    sku: filters?.sku,
    batch: filters?.batch,
    asOnDate: asOn,
  });

  const mfgMap = new Map<string, string>();
  const key = (sku: string, batch: string, wh: string) => `${sku}|${batch}|${wh}`;

  for (const grn of getGrnRecords()) {
    if (grn.status !== "qc_completed") continue;
    for (const batch of grn.batches) {
      const sku = resolveSku(batch.productName);
      const k = key(sku, batch.batchNumber, grn.warehouse);
      if (batch.mfgDate) mfgMap.set(k, batch.mfgDate);
    }
  }

  return stockRows
    .filter((row) => isActiveUsableInventory(row.availableQty, row.expiryDate, asOn))
    .map((row) => {
      const k = key(row.sku, row.batchNo, row.warehouse);
      const stock = getQcPassedStockRecords().find((s) => s.id === row.stockId);
      const stockStatus = getStockStatus(row.expiryDate, asOn);
      return {
        product: row.product,
        sku: row.sku,
        uom: row.uom,
        packSize: row.packSize,
        unitsPerPack: row.unitsPerCase,
        batchNo: row.batchNo,
        warehouse: row.warehouse,
        availableQty: row.availableQty,
        costPrice: row.costPrice,
        cpMissing: row.cpMissing,
        mfgDate: stock?.manufacturingDate ?? mfgMap.get(k) ?? "",
        expiryDate: row.expiryDate,
        stockStatus,
        stockValue: computeStockValue(row.availableQty, row.costPrice, row.cpMissing),
      };
    });
}

export function computeBatchRegisterSummary(rows: BatchRegisterRow[]) {
  const totalAvailableQty = rows.reduce((s, r) => s + r.availableQty, 0);
  const totalStockValue = rows.reduce(
    (s, r) => s + (r.cpMissing && r.availableQty > 0 ? 0 : r.stockValue),
    0,
  );
  const cpMissingCount = rows.filter((r) => r.cpMissing && r.availableQty > 0).length;
  return {
    batchLines: rows.length,
    totalStockValue,
    totalAvailableQty,
    warehouseCount: new Set(rows.map((r) => r.warehouse)).size,
    cpMissingCount,
  };
}

function valuedBatchRows(rows: BatchRegisterRow[]): BatchRegisterRow[] {
  return rows.filter((r) => !(r.cpMissing && r.availableQty > 0));
}

export function computeBatchRegisterWarehouseSummary(rows: BatchRegisterRow[]): WarehouseValuationSummary[] {
  const byWh = new Map<string, WarehouseValuationSummary>();
  for (const row of valuedBatchRows(rows)) {
    const existing = byWh.get(row.warehouse) ?? {
      warehouse: row.warehouse,
      totalSkus: 0,
      availableQty: 0,
      reservedQty: 0,
      inventoryValue: 0,
    };
    existing.totalSkus += 1;
    existing.availableQty += row.availableQty;
    existing.inventoryValue += row.stockValue;
    byWh.set(row.warehouse, existing);
  }
  return Array.from(byWh.values()).sort((a, b) => a.warehouse.localeCompare(b.warehouse));
}

export function computeBatchRegisterProductSummary(rows: BatchRegisterRow[]): ProductValuationSummary[] {
  const byProduct = new Map<string, ProductValuationSummary>();
  for (const row of rows) {
    if (row.cpMissing && row.availableQty > 0) continue;
    const key = row.sku;
    const existing = byProduct.get(key) ?? {
      product: row.product,
      sku: row.sku,
      uom: row.uom,
      availableQty: 0,
      reservedQty: 0,
      costPrice: row.costPrice,
      cpMissing: row.cpMissing,
      inventoryValue: 0,
    };
    existing.availableQty += row.availableQty;
    existing.inventoryValue += row.stockValue;
    if (!existing.cpMissing && row.cpMissing) existing.cpMissing = true;
    byProduct.set(key, existing);
  }
  return Array.from(byProduct.values()).sort((a, b) => a.product.localeCompare(b.product));
}

export function computeBatchRegisterNearExpiryValue(rows: BatchRegisterRow[]): number {
  return valuedBatchRows(rows)
    .filter((r) => r.stockStatus === "Near Expiry")
    .reduce((s, r) => s + r.stockValue, 0);
}

// ── COA inventory asset reconciliation ────────────────────────────────────────

export function getInventoryAssetBookValue(): number {
  const ledgers = getLedgersUnderSubGroupName("Inventory / Stock-in-Hand");
  return ledgers.reduce((s, l) => s + computeLedgerCurrentBalance(l).amount, 0);
}

export function getInventoryAssetReconciliation(stockValuationTotal: number) {
  const bookValue = getInventoryAssetBookValue();
  const variance = stockValuationTotal - bookValue;
  return {
    bookValue,
    stockValuationTotal,
    variance,
    matched: Math.abs(variance) < 1,
  };
}

// ── Dashboard metrics ─────────────────────────────────────────────────────────

export function getInventoryDashboardMetrics(asOnDate?: string): InventoryDashboardMetrics {
  const asOn = asOnDate ?? new Date().toISOString().slice(0, 10);
  const rows = computeStockValuationRows({ asOnDate: asOn });
  const summary = stockValuationSummary(rows, asOn);
  const monthStart = asOn.slice(0, 8) + "01";

  let cogsThisMonth = 0;
  for (const inv of loadInvoices()) {
    if (inv.invoiceStatus === "cancelled") continue;
    if (inv.invoiceDate < monthStart) continue;
    for (const line of inv.lineItems) {
      cogsThisMonth += line.qty * getCostPriceBySku(resolveSku(line.productName), line.productName);
    }
  }

  let stockAdjustmentValue = 0;
  for (const rec of loadStockReconciliations()) {
    if (rec.status !== "posted" && rec.status !== "approved") continue;
    if (rec.date < monthStart) continue;
    stockAdjustmentValue += Math.abs(rec.differenceValue);
  }

  return {
    totalInventoryValue: summary.totalInventoryValue,
    totalAvailableQty: summary.totalAvailableQty,
    nearExpiryStockValue: summary.nearExpiryStockValue,
    expiredStockValue: summary.expiredStockValue,
    cogsThisMonth,
    stockAdjustmentValue,
  };
}

// ── Demo ledger bootstrap (no COA structure changes) ──────────────────────────

const DEMO_LEDGER_SPECS: Array<{ subGroup: string; name: string }> = [
  { subGroup: "Other Current Liabilities", name: "GRN Clearing / Purchase Accrual" },
  { subGroup: "Cost of Goods Sold", name: "Cost of Goods Sold — Inventory" },
  { subGroup: "Miscellaneous Expenses", name: "Inventory Loss / Stock Adjustment Expense" },
  { subGroup: "Miscellaneous Income", name: "Stock Adjustment Gain / Other Income" },
];

export function ensureInventoryAccountingLedgers(): void {
  if (typeof window === "undefined") return;
  const records = loadChartOfAccounts();
  let changed = false;
  for (const spec of DEMO_LEDGER_SPECS) {
    const subGroup = records.find(
      (r) => r.nodeLevel === "account_group" && r.accountName === spec.subGroup,
    );
    if (!subGroup) continue;
    const exists = records.some(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.parentAccountId === subGroup.id &&
        r.accountName === spec.name,
    );
    if (exists) continue;
    const id = nextId(records);
    const ledger: ChartOfAccount = {
      id,
      accountCode: `LED-${String(id).padStart(4, "0")}`,
      accountName: spec.name,
      alias: "",
      accountType: subGroup.accountType,
      nodeLevel: "ledger",
      parentAccountId: subGroup.id,
      parentAccount: subGroup.accountName,
      description: "Auto-created for inventory accounting demo",
      status: "active",
      usedIn: ["journal"],
      isSystem: false,
      isSystemGenerated: true,
      openingBalance: 0,
      balanceType:
        subGroup.accountType === "Liability" || subGroup.accountType === "Income"
          ? "Credit"
          : "Debit",
      gstApplicable: false,
      tdsApplicable: false,
      costCenterApplicable: false,
      bankAccountFlag: false,
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
    };
    records.push(ledger);
    changed = true;
  }
  if (changed) saveChartOfAccounts(records);
}

export const WAREHOUSE_FILTER_OPTIONS = [
  "Central Warehouse",
  "North Zone Hub",
  "South Zone Depot",
  "West Zone Hub",
  "East Zone Hub",
];

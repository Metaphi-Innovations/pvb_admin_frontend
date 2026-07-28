/**
 * Stock Valuation report — calculated from posted inventory movements.
 * Closing stock reconciles with Stock Register Batch Wise; cost rate follows the selected method.
 */

import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import {
  ensurePricingDemoSeed,
  findActivePricingForStock,
} from "@/app/(app)/masters/pricing/pricing-data";
import {
  getStockStatus as getBatchExpiryStatus,
} from "@/lib/accounts/inventory-accounting-data";
import { roundMoney } from "@/lib/accounts/money-format";
import { matchesMultiFilter } from "@/lib/accounts/report-multi-filter-utils";
import {
  buildStockLedgerRows,
  type StockLedgerRow,
  type StockLedgerTransactionType,
} from "@/app/(app)/accounts/reports/stock-ledger/stock-ledger-data";

/** System does not currently permit negative inventory for valuation. */
export const NEGATIVE_STOCK_PERMITTED = false;

export type CostRateMethod = "weighted_average" | "fifo" | "last_purchase";

export const COST_RATE_METHOD_OPTIONS: { value: CostRateMethod; label: string }[] = [
  { value: "weighted_average", label: "Weighted Average" },
  { value: "fifo", label: "FIFO" },
  { value: "last_purchase", label: "Last Purchase Rate" },
];

export function getCostRateMethodLabel(method: CostRateMethod): string {
  return COST_RATE_METHOD_OPTIONS.find((o) => o.value === method)?.label ?? method;
}

/** @deprecated Use CostRateMethod — kept for older call sites during migration. */
export type ValuationBasis = CostRateMethod;

/** @deprecated Use COST_RATE_METHOD_OPTIONS */
export const VALUATION_BASIS_OPTIONS = COST_RATE_METHOD_OPTIONS;

/** @deprecated Use getCostRateMethodLabel */
export function getValuationBasisLabel(basis: ValuationBasis): string {
  return getCostRateMethodLabel(basis);
}

export type StockValuationGrouping = "product_warehouse" | "product";

export type StockValuationStatus =
  | "Available"
  | "Near Expiry"
  | "Expired"
  | "Zero Stock"
  | "Negative Stock";

export type StockValuationStatusFilter = "all" | StockValuationStatus;

export type StockValuationTab = "summary" | "detailed";

export type StockValuationSortKey =
  | "productName"
  | "productCode"
  | "warehouse"
  | "openingQty"
  | "inwardQty"
  | "outwardQty"
  | "closingQty"
  | "costRate"
  | "costValue"
  | "marketRate"
  | "marketValue"
  | "finalStockValue";

export interface StockValuationRow {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  warehouse: string;
  unit: string;
  openingQty: number;
  inwardQty: number;
  outwardQty: number;
  closingQty: number;
  costRate: number;
  costRateMissing: boolean;
  costValue: number;
  marketRate: number | null;
  marketRateMissing: boolean;
  marketValue: number | null;
  finalStockValue: number;
  stockStatus: StockValuationStatus;
}

export interface StockValuationFilters {
  asOnDate: string;
  financialYearId?: string;
  warehouse?: string | string[];
  category?: string | string[];
  product?: string | string[];
  stockStatus?: StockValuationStatusFilter;
  search?: string;
}

export interface StockValuationTotals {
  count: number;
  totalOpeningQty: number;
  totalInwardQty: number;
  totalOutwardQty: number;
  totalClosingQty: number;
  totalCostValue: number;
  totalMarketValue: number | null;
  marketValueAvailable: boolean;
  totalFinalStockValue: number;
}

interface CostLayer {
  qty: number;
  rate: number;
}

interface ProductWhBucket {
  productCode: string;
  productName: string;
  warehouse: string;
  unit: string;
  category: string;
  openingQty: number;
  inwardQty: number;
  outwardQty: number;
  closingQty: number;
  costRate: number;
  costRateMissing: boolean;
  costValue: number;
  /** Worst expiry status among batch balances with qty > 0; else quantity-based. */
  expiryHint: "Available" | "Near Expiry" | "Expired" | null;
}

const PURCHASE_TYPES = new Set<StockLedgerTransactionType>(["purchase", "opening"]);

/**
 * Approved market valuation rate — no dedicated source exists in the system yet.
 * Do not treat MRP / dealer price as market rate.
 */
export function getApprovedMarketRate(
  _productCode: string,
  _productName?: string,
): number | null {
  return null;
}

/** @deprecated Pricing-basis helper removed; cost comes from cost-rate method. */
export function getValuationRateFromPricing(): number {
  return 0;
}

function lookupCategory(sku: string, productName: string): string {
  const product = loadProducts().find(
    (p) => p.sku === sku || p.productName.toLowerCase() === productName.toLowerCase(),
  );
  return product?.category?.trim() || "—";
}

function lookupUnit(sku: string, productName: string, fallback?: string): string {
  if (fallback && fallback !== "—") return fallback;
  const product = loadProducts().find(
    (p) => p.sku === sku || p.productName.toLowerCase() === productName.toLowerCase(),
  );
  return product?.baseUnit ?? product?.mou ?? "—";
}

function fallbackCostRate(sku: string, productName: string): number {
  ensurePricingDemoSeed();
  const pricing = findActivePricingForStock(sku, productName);
  return pricing?.costPrice && pricing.costPrice > 0 ? pricing.costPrice : 0;
}

function resolveFyWindow(
  financialYearId: string | undefined,
  asOnDate: string,
): { periodStart: string; asOn: string } {
  const years = loadFinancialYears();
  const fy =
    financialYearId && financialYearId !== "all"
      ? years.find((y) => String(y.id) === financialYearId)
      : years.find((y) => y.status === "active") ?? years[0];

  const periodStart = fy?.startDate ?? `${asOnDate.slice(0, 4)}-04-01`;
  const fyEnd = fy?.endDate ?? asOnDate;
  const asOn = asOnDate <= fyEnd ? asOnDate : fyEnd;
  return { periodStart, asOn };
}

function pwKey(productCode: string, warehouse: string): string {
  return `${productCode}|${warehouse}`;
}

function batchKey(productCode: string, warehouse: string, batchNo: string): string {
  return `${productCode}|${warehouse}|${batchNo}`;
}

function consumeFifo(layers: CostLayer[], qtyOut: number): void {
  let remaining = qtyOut;
  while (remaining > 1e-9 && layers.length > 0) {
    const layer = layers[0];
    const take = Math.min(layer.qty, remaining);
    layer.qty -= take;
    remaining -= take;
    if (layer.qty <= 1e-9) layers.shift();
  }
}

function weightedAverageRate(layers: CostLayer[]): number {
  let qty = 0;
  let value = 0;
  for (const layer of layers) {
    if (layer.qty <= 0 || layer.rate <= 0) continue;
    qty += layer.qty;
    value += layer.qty * layer.rate;
  }
  if (qty <= 0) return 0;
  return value / qty;
}

function cloneLayers(layers: CostLayer[]): CostLayer[] {
  return layers.map((l) => ({ ...l }));
}

function applyInwardWac(layers: CostLayer[], qty: number, rate: number): void {
  if (qty <= 0) return;
  const effectiveRate = rate > 0 ? rate : 0;
  if (effectiveRate <= 0) {
    layers.push({ qty, rate: 0 });
    return;
  }
  const currentQty = layers.reduce((s, l) => s + l.qty, 0);
  const currentValue = layers.reduce((s, l) => s + l.qty * l.rate, 0);
  const newAvg =
    currentQty + qty > 0 ? (currentValue + qty * effectiveRate) / (currentQty + qty) : effectiveRate;
  layers.length = 0;
  layers.push({ qty: currentQty + qty, rate: newAvg });
}

function deriveStatus(
  closingQty: number,
  expiryHint: "Available" | "Near Expiry" | "Expired" | null,
): StockValuationStatus {
  if (closingQty < 0) return "Negative Stock";
  if (closingQty === 0) return "Zero Stock";
  if (expiryHint === "Expired") return "Expired";
  if (expiryHint === "Near Expiry") return "Near Expiry";
  return "Available";
}

function aggregateExpiryHint(
  statuses: Array<"Available" | "Near Expiry" | "Expired">,
): "Available" | "Near Expiry" | "Expired" | null {
  if (statuses.length === 0) return null;
  if (statuses.includes("Expired")) return "Expired";
  if (statuses.includes("Near Expiry")) return "Near Expiry";
  return "Available";
}

function computeCostForClosing(
  method: CostRateMethod,
  layers: CostLayer[],
  closingQty: number,
  lastPurchaseRate: number,
  fallbackRate: number,
): { costRate: number; costRateMissing: boolean; costValue: number } {
  const qty = Math.max(0, closingQty);
  if (qty === 0) {
    return { costRate: 0, costRateMissing: false, costValue: 0 };
  }

  if (method === "last_purchase") {
    const rate = lastPurchaseRate > 0 ? lastPurchaseRate : fallbackRate;
    const missing = rate <= 0;
    return {
      costRate: missing ? 0 : rate,
      costRateMissing: missing,
      costValue: missing ? 0 : roundMoney(qty * rate),
    };
  }

  const remaining = cloneLayers(layers).filter((l) => l.qty > 0);
  let valuedQty = 0;
  let valuedValue = 0;
  for (const layer of remaining) {
    valuedQty += layer.qty;
    valuedValue += layer.qty * (layer.rate > 0 ? layer.rate : 0);
  }

  if (valuedQty <= 0 || valuedValue <= 0) {
    const rate = fallbackRate;
    const missing = rate <= 0;
    return {
      costRate: missing ? 0 : rate,
      costRateMissing: missing,
      costValue: missing ? 0 : roundMoney(qty * rate),
    };
  }

  const costRate =
    method === "weighted_average"
      ? valuedValue / valuedQty
      : valuedValue / valuedQty; // FIFO layers already reflect remaining stock composition

  return {
    costRate,
    costRateMissing: false,
    costValue: roundMoney(qty * costRate),
  };
}

function buildProductWarehouseBuckets(
  movements: StockLedgerRow[],
  periodStart: string,
  asOn: string,
  method: CostRateMethod,
): ProductWhBucket[] {
  type State = {
    productCode: string;
    productName: string;
    warehouse: string;
    unit: string;
    category: string;
    layers: CostLayer[];
    lastPurchaseRate: number;
    openingQty: number;
    inwardQty: number;
    outwardQty: number;
    opened: boolean;
    batchBalances: Map<string, { qty: number; expiryDate: string }>;
  };

  const states = new Map<string, State>();

  const ensure = (row: StockLedgerRow): State => {
    const key = pwKey(row.productCode, row.warehouse);
    let state = states.get(key);
    if (!state) {
      state = {
        productCode: row.productCode,
        productName: row.productName,
        warehouse: row.warehouse,
        unit: lookupUnit(row.productCode, row.productName, row.unit),
        category: lookupCategory(row.productCode, row.productName),
        layers: [],
        lastPurchaseRate: 0,
        openingQty: 0,
        inwardQty: 0,
        outwardQty: 0,
        opened: false,
        batchBalances: new Map(),
      };
      states.set(key, state);
    }
    return state;
  };

  const applyMovement = (state: State, row: StockLedgerRow, countPeriod: boolean) => {
    const inQty = row.inQty;
    const outQty = row.outQty;
    const rate = row.rate > 0 ? row.rate : 0;

    if (inQty > 0) {
      if (method === "weighted_average") {
        applyInwardWac(state.layers, inQty, rate);
      } else {
        state.layers.push({ qty: inQty, rate });
      }
      if (PURCHASE_TYPES.has(row.transactionType) && rate > 0) {
        state.lastPurchaseRate = rate;
      } else if (row.transactionType === "stock_transfer_in" && rate > 0 && state.lastPurchaseRate <= 0) {
        state.lastPurchaseRate = rate;
      }
      if (countPeriod) state.inwardQty += inQty;
    }

    if (outQty > 0) {
      if (method === "fifo" || method === "last_purchase") {
        consumeFifo(state.layers, outQty);
      } else {
        consumeFifo(state.layers, outQty);
      }
      if (countPeriod) state.outwardQty += outQty;
    }

    const bk = batchKey(row.productCode, row.warehouse, row.batchNo || "—");
    const batch = state.batchBalances.get(bk) ?? { qty: 0, expiryDate: row.expiryDate || "" };
    batch.qty += inQty - outQty;
    if (row.expiryDate) batch.expiryDate = row.expiryDate;
    state.batchBalances.set(bk, batch);
  };

  const sorted = [...movements]
    .filter((m) => m.date <= asOn)
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  for (const row of sorted) {
    const state = ensure(row);
    if (row.date < periodStart) {
      applyMovement(state, row, false);
    } else {
      if (!state.opened) {
        state.openingQty = state.layers.reduce((s, l) => s + l.qty, 0);
        state.opened = true;
      }
      applyMovement(state, row, true);
    }
  }

  const buckets: ProductWhBucket[] = [];

  for (const state of states.values()) {
    if (!state.opened) {
      state.openingQty = state.layers.reduce((s, l) => s + l.qty, 0);
    }
    const closingQty = state.openingQty + state.inwardQty - state.outwardQty;
    const fallback = fallbackCostRate(state.productCode, state.productName);
    const cost = computeCostForClosing(
      method,
      state.layers,
      closingQty,
      state.lastPurchaseRate,
      fallback,
    );

    const expiryStatuses: Array<"Available" | "Near Expiry" | "Expired"> = [];
    for (const batch of state.batchBalances.values()) {
      if (batch.qty <= 0) continue;
      expiryStatuses.push(getBatchExpiryStatus(batch.expiryDate, asOn));
    }

    buckets.push({
      productCode: state.productCode,
      productName: state.productName,
      warehouse: state.warehouse,
      unit: state.unit,
      category: state.category,
      openingQty: state.openingQty,
      inwardQty: state.inwardQty,
      outwardQty: state.outwardQty,
      closingQty,
      costRate: cost.costRate,
      costRateMissing: cost.costRateMissing,
      costValue: cost.costValue,
      expiryHint: aggregateExpiryHint(expiryStatuses),
    });
  }

  return buckets;
}

function toRow(bucket: ProductWhBucket, warehouseLabel?: string): StockValuationRow {
  const marketRate = getApprovedMarketRate(bucket.productCode, bucket.productName);
  const marketRateMissing = marketRate == null || marketRate <= 0;
  const marketValue =
    marketRateMissing || bucket.closingQty === 0
      ? marketRateMissing
        ? null
        : 0
      : roundMoney(bucket.closingQty * marketRate);

  let finalStockValue = 0;
  if (bucket.costRateMissing && marketRateMissing) {
    finalStockValue = 0;
  } else if (marketRateMissing) {
    finalStockValue = bucket.costValue;
  } else if (bucket.costRateMissing) {
    finalStockValue = marketValue ?? 0;
  } else {
    finalStockValue = roundMoney(Math.min(bucket.costValue, marketValue ?? bucket.costValue));
  }

  const warehouse = warehouseLabel ?? bucket.warehouse;
  const stockStatus = deriveStatus(bucket.closingQty, bucket.expiryHint);

  return {
    id: `${bucket.productCode}|${warehouse}`,
    productCode: bucket.productCode,
    productName: bucket.productName,
    category: bucket.category,
    warehouse,
    unit: bucket.unit,
    openingQty: bucket.openingQty,
    inwardQty: bucket.inwardQty,
    outwardQty: bucket.outwardQty,
    closingQty: bucket.closingQty,
    costRate: bucket.costRate,
    costRateMissing: bucket.costRateMissing,
    costValue: bucket.costValue,
    marketRate: marketRateMissing ? null : marketRate,
    marketRateMissing,
    marketValue,
    finalStockValue,
    stockStatus,
  };
}

export function consolidateStockValuationProductWise(rows: StockValuationRow[]): StockValuationRow[] {
  const map = new Map<string, StockValuationRow>();

  for (const row of rows) {
    const existing = map.get(row.productCode);
    if (!existing) {
      map.set(row.productCode, {
        ...row,
        id: row.productCode,
        // Keep concrete warehouse when consolidating a single warehouse;
        // cleared only when multiple warehouses are rolled up (column is hidden in UI).
        warehouse: row.warehouse,
      });
      continue;
    }
    if (existing.warehouse && existing.warehouse !== row.warehouse) {
      existing.warehouse = "";
    }
    existing.openingQty += row.openingQty;
    existing.inwardQty += row.inwardQty;
    existing.outwardQty += row.outwardQty;
    existing.closingQty += row.closingQty;
    existing.costValue = roundMoney(existing.costValue + row.costValue);
    if (!row.costRateMissing && row.costRate > 0) {
      existing.costRateMissing = false;
    } else if (existing.costValue <= 0) {
      existing.costRateMissing = existing.costRateMissing || row.costRateMissing;
    }
    if (row.marketRateMissing || row.marketValue == null) {
      existing.marketRateMissing = true;
      existing.marketRate = null;
      existing.marketValue = null;
    } else if (!existing.marketRateMissing && existing.marketValue != null) {
      existing.marketValue = roundMoney(existing.marketValue + row.marketValue);
    }

    if (row.stockStatus === "Negative Stock" || existing.stockStatus === "Negative Stock") {
      existing.stockStatus = "Negative Stock";
    } else if (row.stockStatus === "Zero Stock" && existing.stockStatus === "Zero Stock") {
      existing.stockStatus = "Zero Stock";
    } else if (row.stockStatus === "Expired" || existing.stockStatus === "Expired") {
      existing.stockStatus = existing.closingQty === 0 ? "Zero Stock" : "Expired";
    } else if (row.stockStatus === "Near Expiry" || existing.stockStatus === "Near Expiry") {
      existing.stockStatus = existing.closingQty === 0 ? "Zero Stock" : "Near Expiry";
    } else if (existing.closingQty === 0) {
      existing.stockStatus = "Zero Stock";
    } else if (existing.closingQty < 0) {
      existing.stockStatus = "Negative Stock";
    } else {
      existing.stockStatus = "Available";
    }
  }

  for (const row of map.values()) {
    if (row.closingQty > 0 && !row.costRateMissing) {
      row.costRate = row.costValue / row.closingQty;
    } else if (row.closingQty === 0) {
      row.costRate = 0;
      row.costValue = 0;
    }
    if (!row.marketRateMissing && row.marketValue != null && row.closingQty > 0) {
      row.marketRate = row.marketValue / row.closingQty;
    }
    if (row.marketRateMissing) {
      row.finalStockValue = row.costValue;
    } else if (row.costRateMissing) {
      row.finalStockValue = row.marketValue ?? 0;
    } else {
      row.finalStockValue = roundMoney(Math.min(row.costValue, row.marketValue ?? row.costValue));
    }
    row.stockStatus = deriveStatus(
      row.closingQty,
      row.stockStatus === "Expired" || row.stockStatus === "Near Expiry" || row.stockStatus === "Available"
        ? row.stockStatus
        : null,
    );
  }

  return Array.from(map.values());
}

export function buildStockValuationRows(
  asOnDate: string,
  costRateMethod: CostRateMethod = "weighted_average",
  stockStatusFilter: StockValuationStatusFilter = "all",
  options?: {
    financialYearId?: string;
    grouping?: StockValuationGrouping;
  },
): StockValuationRow[] {
  const { periodStart, asOn } = resolveFyWindow(options?.financialYearId, asOnDate);
  const movements = buildStockLedgerRows();
  const buckets = buildProductWarehouseBuckets(movements, periodStart, asOn, costRateMethod);

  let rows = buckets.map((b) => toRow(b));

  if (options?.grouping === "product") {
    rows = consolidateStockValuationProductWise(rows);
  }

  // Optional early status filter for callers that don't use filterStockValuationRows.
  if (stockStatusFilter === "Negative Stock") {
    rows = rows.filter((row) => row.closingQty < 0 || row.stockStatus === "Negative Stock");
  } else if (stockStatusFilter !== "all") {
    if (!NEGATIVE_STOCK_PERMITTED) {
      rows = rows.filter((row) => row.closingQty >= 0);
    }
    rows = rows.filter((row) => row.stockStatus === stockStatusFilter);
  }

  return rows.sort(
    (a, b) =>
      a.productName.localeCompare(b.productName) ||
      a.warehouse.localeCompare(b.warehouse) ||
      a.productCode.localeCompare(b.productCode),
  );
}

export function getStockValuationProductOptions(): string[] {
  const asOn = new Date().toISOString().slice(0, 10);
  return [
    ...new Set(
      buildStockValuationRows(asOn, "weighted_average", "all").map((r) => r.productName),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function getStockValuationCategoryOptions(): string[] {
  const asOn = new Date().toISOString().slice(0, 10);
  const categories = new Set<string>();
  for (const row of buildStockValuationRows(asOn, "weighted_average", "all")) {
    if (row.category && row.category !== "—") categories.add(row.category);
  }
  for (const p of loadProducts()) {
    if (p.category?.trim()) categories.add(p.category.trim());
  }
  return Array.from(categories).sort();
}

export function filterStockValuationRows(
  rows: StockValuationRow[],
  filters: StockValuationFilters,
): StockValuationRow[] {
  const q = filters.search?.trim().toLowerCase() ?? "";
  const status = filters.stockStatus ?? "all";

  return rows.filter((row) => {
    if (!matchesMultiFilter(filters.warehouse, row.warehouse)) return false;
    if (!matchesMultiFilter(filters.category, row.category)) return false;
    if (!matchesMultiFilter(filters.product, row.productName)) return false;

    if (status === "Negative Stock") {
      if (!(row.closingQty < 0 || row.stockStatus === "Negative Stock")) return false;
    } else {
      if (!NEGATIVE_STOCK_PERMITTED && row.closingQty < 0) return false;
      if (status !== "all" && row.stockStatus !== status) return false;
    }

    if (q) {
      const haystack = [row.productName, row.productCode, row.warehouse, row.category]
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
      case "productName":
        cmp = a.productName.localeCompare(b.productName);
        break;
      case "productCode":
        cmp = a.productCode.localeCompare(b.productCode);
        break;
      case "warehouse":
        cmp = a.warehouse.localeCompare(b.warehouse);
        break;
      case "openingQty":
        cmp = a.openingQty - b.openingQty;
        break;
      case "inwardQty":
        cmp = a.inwardQty - b.inwardQty;
        break;
      case "outwardQty":
        cmp = a.outwardQty - b.outwardQty;
        break;
      case "closingQty":
        cmp = a.closingQty - b.closingQty;
        break;
      case "costRate":
        cmp = a.costRate - b.costRate;
        break;
      case "costValue":
        cmp = a.costValue - b.costValue;
        break;
      case "marketRate":
        cmp = (a.marketRate ?? -1) - (b.marketRate ?? -1);
        break;
      case "marketValue":
        cmp = (a.marketValue ?? -1) - (b.marketValue ?? -1);
        break;
      case "finalStockValue":
        cmp = a.finalStockValue - b.finalStockValue;
        break;
      default:
        cmp = 0;
    }
    if (cmp === 0) cmp = a.id.localeCompare(b.id);
    return cmp * dir;
  });
}

export function computeStockValuationTotals(rows: StockValuationRow[]): StockValuationTotals {
  const marketValues = rows.map((r) => r.marketValue);
  const anyMarket = marketValues.some((v) => v != null);
  const allMarket = rows.length > 0 && marketValues.every((v) => v != null);

  return {
    count: rows.length,
    totalOpeningQty: rows.reduce((s, r) => s + r.openingQty, 0),
    totalInwardQty: rows.reduce((s, r) => s + r.inwardQty, 0),
    totalOutwardQty: rows.reduce((s, r) => s + r.outwardQty, 0),
    totalClosingQty: rows.reduce((s, r) => s + r.closingQty, 0),
    totalCostValue: roundMoney(rows.reduce((s, r) => s + r.costValue, 0)),
    totalMarketValue: allMarket
      ? roundMoney(rows.reduce((s, r) => s + (r.marketValue ?? 0), 0))
      : anyMarket
        ? roundMoney(
            rows.reduce((s, r) => s + (r.marketValue ?? 0), 0),
          )
        : null,
    marketValueAvailable: anyMarket,
    totalFinalStockValue: roundMoney(rows.reduce((s, r) => s + r.finalStockValue, 0)),
  };
}

export function formatStockValuationDate(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatQtyWithUnit(qty: number, unit: string): string {
  const qtyStr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(qty);
  if (!unit || unit === "—") return qtyStr;
  return `${qtyStr} ${unit}`;
}

export function formatOptionalMoney(
  value: number | null | undefined,
  missing: boolean,
): string {
  if (missing || value == null) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function buildStockLedgerDrillHref(params: {
  productCode: string;
  warehouse?: string;
  financialYearId?: string;
  asOnDate: string;
  periodStart?: string;
}): string {
  const qs = new URLSearchParams();
  qs.set("tab", "batch-wise");
  qs.set("product", params.productCode);
  if (params.warehouse?.trim()) {
    qs.set("warehouse", params.warehouse);
  }
  if (params.financialYearId && params.financialYearId !== "all") {
    qs.set("fy", params.financialYearId);
  }
  if (params.periodStart) qs.set("dateFrom", params.periodStart);
  qs.set("dateTo", params.asOnDate);
  return `/accounts/reports/stock-register?${qs.toString()}`;
}

export function getValuationPeriodStart(
  financialYearId: string | undefined,
  asOnDate: string,
): string {
  return resolveFyWindow(financialYearId, asOnDate).periodStart;
}

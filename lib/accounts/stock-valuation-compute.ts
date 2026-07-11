/**
 * Stock Valuation report — built from warehouse QC-passed stock and Pricing Master rates.
 */

import { loadProducts } from "@/app/(app)/masters/products/product-data";
import {
  ensurePricingDemoSeed,
  findActivePricingForStock,
  type PricingRecord,
} from "@/app/(app)/masters/pricing/pricing-data";
import {
  computeStockValuationRows,
} from "@/lib/accounts/inventory-accounting-data";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  matchesMultiFilter,
} from "@/lib/accounts/report-multi-filter-utils";

export type ValuationBasis = "cost_price" | "market_price" | "distributor_price" | "retail_mrp";

export const VALUATION_BASIS_OPTIONS: { value: ValuationBasis; label: string }[] = [
  { value: "cost_price", label: "Cost Price" },
  { value: "market_price", label: "Market Price" },
  { value: "distributor_price", label: "Distributor Price" },
  { value: "retail_mrp", label: "Retail Price (MRP)" },
];

export function getValuationBasisLabel(basis: ValuationBasis): string {
  return VALUATION_BASIS_OPTIONS.find((o) => o.value === basis)?.label ?? basis;
}

export type StockValuationStatus = "Available" | "Near Expiry" | "Expired";

export type StockValuationStatusFilter = "all" | StockValuationStatus;

export type StockValuationSortKey =
  | "productName"
  | "productCode"
  | "warehouse"
  | "closingQty"
  | "valuationRate"
  | "totalStockValue";

export interface StockValuationRow {
  id: string;
  productCode: string;
  productName: string;
  category: string;
  warehouse: string;
  closingQty: number;
  valuationRate: number;
  rateMissing: boolean;
  totalStockValue: number;
  stockStatus: StockValuationStatus;
}

export interface StockValuationFilters {
  asOnDate: string;
  warehouse?: string | string[];
  category?: string | string[];
  product?: string | string[];
  stockStatus?: StockValuationStatusFilter;
  search?: string;
}

export interface StockValuationTotals {
  count: number;
  totalClosingQty: number;
  totalStockValue: number;
}

/** Market Price maps to Pricing Master `retailPrice` (falls back to dealer price when unset). */
export function getValuationRateFromPricing(
  pricing: PricingRecord | undefined,
  basis: ValuationBasis,
): number {
  if (!pricing) return 0;
  switch (basis) {
    case "cost_price":
      return pricing.costPrice ?? 0;
    case "market_price":
      return pricing.retailPrice > 0
        ? pricing.retailPrice
        : pricing.dealerPrice > 0
          ? pricing.dealerPrice
          : pricing.netSellingPrice ?? 0;
    case "distributor_price":
      return pricing.distributorPrice ?? 0;
    case "retail_mrp":
      return pricing.mrp ?? 0;
    default:
      return 0;
  }
}

function lookupCategory(sku: string, productName: string, pricing?: PricingRecord): string {
  if (pricing?.category?.trim()) return pricing.category.trim();
  const product = loadProducts().find(
    (p) => p.sku === sku || p.productName.toLowerCase() === productName.toLowerCase(),
  );
  return product?.category?.trim() || "—";
}

function aggregateStockStatus(statuses: StockValuationStatus[]): StockValuationStatus {
  if (statuses.includes("Expired")) return "Expired";
  if (statuses.includes("Near Expiry")) return "Near Expiry";
  return "Available";
}

function mapInventoryStatus(status: string): StockValuationStatus {
  if (status === "Expired" || status === "Near Expiry") return status;
  return "Available";
}

interface AggregateBucket {
  productCode: string;
  productName: string;
  category: string;
  warehouse: string;
  closingQty: number;
  statuses: StockValuationStatus[];
}

export function buildStockValuationRows(
  asOnDate: string,
  valuationBasis: ValuationBasis = "cost_price",
  stockStatusFilter: StockValuationStatusFilter = "all",
): StockValuationRow[] {
  ensurePricingDemoSeed();

  const computeFilters: Parameters<typeof computeStockValuationRows>[0] = { asOnDate };
  if (stockStatusFilter !== "all") {
    computeFilters.status = stockStatusFilter;
  }

  const batchRows = computeStockValuationRows(computeFilters);
  const buckets = new Map<string, AggregateBucket>();

  for (const batch of batchRows) {
    const key = `${batch.sku}|${batch.warehouse}`;
    const existing = buckets.get(key);
    const status = mapInventoryStatus(batch.status);

    if (existing) {
      existing.closingQty += batch.availableQty;
      existing.statuses.push(status);
    } else {
      const pricing = findActivePricingForStock(batch.sku, batch.product);
      buckets.set(key, {
        productCode: batch.sku,
        productName: batch.product,
        category: lookupCategory(batch.sku, batch.product, pricing),
        warehouse: batch.warehouse,
        closingQty: batch.availableQty,
        statuses: [status],
      });
    }
  }

  const rows: StockValuationRow[] = [];

  for (const bucket of buckets.values()) {
    const pricing = findActivePricingForStock(bucket.productCode, bucket.productName);
    const valuationRate = getValuationRateFromPricing(pricing, valuationBasis);
    const rateMissing = !pricing || valuationRate <= 0;
    const totalStockValue = rateMissing ? 0 : roundMoney(bucket.closingQty * valuationRate);

    rows.push({
      id: `${bucket.productCode}|${bucket.warehouse}`,
      productCode: bucket.productCode,
      productName: bucket.productName,
      category: bucket.category,
      warehouse: bucket.warehouse,
      closingQty: bucket.closingQty,
      valuationRate,
      rateMissing,
      totalStockValue,
      stockStatus: aggregateStockStatus(bucket.statuses),
    });
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
      buildStockValuationRows(asOn, "cost_price", "all").map((r) => r.productName),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function getStockValuationCategoryOptions(): string[] {
  const asOn = new Date().toISOString().slice(0, 10);
  const categories = new Set<string>();
  for (const row of buildStockValuationRows(asOn, "cost_price", "all")) {
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

  return rows.filter((row) => {
    if (row.closingQty <= 0) return false;
    if (!matchesMultiFilter(filters.warehouse, row.warehouse)) return false;
    if (!matchesMultiFilter(filters.category, row.category)) return false;
    if (!matchesMultiFilter(filters.product, row.productName)) return false;
    if (
      filters.stockStatus &&
      filters.stockStatus !== "all" &&
      row.stockStatus !== filters.stockStatus
    ) {
      return false;
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
      case "closingQty":
        cmp = a.closingQty - b.closingQty;
        break;
      case "valuationRate":
        cmp = a.valuationRate - b.valuationRate;
        break;
      case "totalStockValue":
        cmp = a.totalStockValue - b.totalStockValue;
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
    totalClosingQty: rows.reduce((s, r) => s + r.closingQty, 0),
    totalStockValue: roundMoney(rows.reduce((s, r) => s + r.totalStockValue, 0)),
  };
}

export function formatStockValuationDate(value: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

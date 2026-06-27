import { masterToday } from "@/lib/masters/common";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import {
  PENDING_APPROVAL_STATUSES,
  type CustomerType,
  type DiscountType,
  type SchemeRecord,
} from "@/app/(app)/masters/scheme/scheme-data";
import {
  computePotentialBenefit,
  daysUntilExpiry,
  formatBatchExpiryDate,
  formatSchemeRupee,
  getNearExpirySchemeLines,
  isNearExpiryRecord,
  isNearExpirySchemeExpired,
  loadConsolidatedSchemeRecords,
  resolveWarehouseState,
} from "@/app/(app)/masters/scheme/product-near-expiry-scheme";
import {
  mapCustomerMasterTypeToSchemeType,
  resolveDealerPriceForScheme,
} from "@/app/(app)/masters/scheme/product-discount-scheme";
import { getSellableQcPassedStockRecords } from "../stockoverview/services";
import type { DispatchNearExpirySchemeEntry } from "./types";

export interface BatchAllocation {
  batchNumber: string;
  expiryDate: string;
  allocatedQty: number;
}

export interface NearExpiryEligibilityResult {
  eligible: boolean;
  scheme?: SchemeRecord;
  schemeLine?: ReturnType<typeof getNearExpirySchemeLines>[number];
  batchNumber: string;
  batchExpiryDate: string;
  remainingExpiryDays: number;
  benefitType: DiscountType;
  benefitValue: number;
  benefitPerUnit: number;
  estimatedBenefitAmount: number;
  dealerPrice: number;
  productId: string;
}

export interface NearExpiryDispatchContext {
  productName: string;
  sku: string;
  warehouse: string;
  customerName: string;
  quantity: number;
  batchAllocations?: BatchAllocation[];
  asOn?: string;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

export function resolveProductIdByNameOrSku(
  productName: string,
  sku?: string,
): { productId: string; productName: string } | null {
  const products = loadProducts().filter((p) => p.status === "active");
  if (sku) {
    const bySku = products.find(
      (p) =>
        normalizeName(p.sku ?? "") === normalizeName(sku) ||
        normalizeName(p.productCode ?? "") === normalizeName(sku),
    );
    if (bySku) return { productId: String(bySku.id), productName: bySku.productName };
  }

  const normalized = normalizeName(productName);
  const exact = products.find((p) => normalizeName(p.productName) === normalized);
  if (exact) return { productId: String(exact.id), productName: exact.productName };

  const partial = products.find((p) => {
    const name = normalizeName(p.productName);
    return name.includes(normalized) || normalized.includes(name);
  });
  if (partial) return { productId: String(partial.id), productName: partial.productName };

  return null;
}

export function resolveCustomerSchemeType(customerName: string): CustomerType {
  const normalized = customerName.trim().toLowerCase();
  if (!normalized || normalized.startsWith("transfer to")) return "Distributor";

  const customer = loadCustomers().find(
    (c) => c.customerName.trim().toLowerCase() === normalized,
  );
  if (customer?.customerType) {
    return mapCustomerMasterTypeToSchemeType(customer.customerType);
  }
  return "Distributor";
}

export const NEAR_EXPIRY_SCHEME_TYPE_LABEL = "Near Expiry";
export const NEAR_EXPIRY_SCHEME_STATUS_ACTIVE = "Active";
export const NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING = "Pending";
export const NEAR_EXPIRY_SETTLEMENT_STATUS_SETTLED = "Settled";
export const NEAR_EXPIRY_SETTLEMENT_METHOD = "Credit Note / Journal Voucher";
export const NEAR_EXPIRY_SETTLEMENT_REQUIRED_LABEL = "Settlement Required";
export const NEAR_EXPIRY_ELIGIBLE_LABEL = "Near Expiry Eligible";
export const NEAR_EXPIRY_SETTLEMENT_TOOLTIP =
  "Near Expiry Scheme is eligible. Financial settlement is pending through Credit Note / Journal Voucher.";

/** @deprecated Use NEAR_EXPIRY_SETTLEMENT_METHOD */
export const NEAR_EXPIRY_SETTLEMENT_LABEL = NEAR_EXPIRY_SETTLEMENT_METHOD;

export interface ProductBatchRow {
  batchNumber: string;
  availableQty: number;
  manufacturingDate: string;
  expiryDate: string;
  remainingDays: number;
}

export function getProductBatchRows(
  productName: string,
  warehouse: string,
  asOn = masterToday(),
): ProductBatchRow[] {
  return getSellableQcPassedStockRecords(asOn)
    .filter(
      (r) =>
        r.warehouse === warehouse &&
        normalizeName(r.product) === normalizeName(productName),
    )
    .sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
    )
    .map((r) => ({
      batchNumber: r.batchNumber,
      availableQty: r.availableQuantity,
      manufacturingDate: r.manufacturingDate,
      expiryDate: r.expiryDate,
      remainingDays: daysUntilExpiry(r.expiryDate, asOn),
    }));
}

export function distributeFefoBatchSelections(
  productName: string,
  warehouse: string,
  requiredQty: number,
): Record<string, number> {
  const selections: Record<string, number> = {};
  if (requiredQty <= 0) return selections;

  let remaining = requiredQty;
  for (const row of getProductBatchRows(productName, warehouse)) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, row.availableQty);
    if (take <= 0) continue;
    selections[row.batchNumber] = take;
    remaining -= take;
  }
  return selections;
}

/** Default allocation: pick the first sellable batch (FEFO order) for the full required qty. */
export function defaultSingleBatchSelection(
  productName: string,
  warehouse: string,
  requiredQty: number,
): Record<string, number> {
  if (requiredQty <= 0) return {};
  const rows = getProductBatchRows(productName, warehouse);
  if (!rows.length) return {};

  const preferred =
    rows.find((row) => row.availableQty >= requiredQty) ?? rows[0];
  return {
    [preferred.batchNumber]: Math.min(requiredQty, preferred.availableQty),
  };
}

export function selectSingleBatchAllocation(
  productName: string,
  warehouse: string,
  batchNumber: string,
  requiredQty: number,
): Record<string, number> {
  if (requiredQty <= 0) return {};
  const row = getProductBatchRows(productName, warehouse).find(
    (r) => r.batchNumber === batchNumber,
  );
  if (!row) return {};
  return {
    [batchNumber]: Math.min(requiredQty, row.availableQty),
  };
}

export function getActiveBatchSelection(
  selections: Record<string, number>,
): string | null {
  const active = Object.entries(selections).filter(([, qty]) => qty > 0);
  if (active.length === 0) return null;
  if (active.length === 1) return active[0][0];
  return active.reduce((best, [batch, qty]) =>
    qty > (selections[best] ?? 0) ? batch : best,
  active[0][0]);
}

export function batchSelectionsToAllocations(
  productName: string,
  warehouse: string,
  selections: Record<string, number>,
): BatchAllocation[] {
  const rows = getProductBatchRows(productName, warehouse);
  return Object.entries(selections)
    .map(([batchNumber, allocatedQty]) => {
      if (allocatedQty <= 0) return null;
      const row = rows.find((r) => r.batchNumber === batchNumber);
      if (!row) return null;
      return {
        batchNumber,
        expiryDate: row.expiryDate,
        allocatedQty,
      };
    })
    .filter((row): row is BatchAllocation => Boolean(row));
}

export function getBatchSchemeStatusLabel(
  context: Omit<NearExpiryDispatchContext, "quantity" | "batchAllocations">,
  batchNumber: string,
  selectedQty: number,
  asOn = masterToday(),
): typeof NEAR_EXPIRY_ELIGIBLE_LABEL | "No Scheme" {
  if (selectedQty <= 0) return "No Scheme";
  const rows = getProductBatchRows(context.productName, context.warehouse, asOn);
  const row = rows.find((r) => r.batchNumber === batchNumber);
  if (!row) return "No Scheme";
  const batch: BatchAllocation = {
    batchNumber: row.batchNumber,
    expiryDate: row.expiryDate,
    allocatedQty: selectedQty,
  };
  return evaluateNearExpiryEligibility(
    { ...context, quantity: selectedQty, batchAllocations: [batch], asOn },
    batch,
  )
    ? NEAR_EXPIRY_ELIGIBLE_LABEL
    : "No Scheme";
}

export function allocateFefoBatches(
  productName: string,
  warehouse: string,
  quantity: number,
): BatchAllocation[] {
  if (quantity <= 0) return [];

  const batches = getSellableQcPassedStockRecords()
    .filter(
      (r) =>
        r.warehouse === warehouse &&
        normalizeName(r.product) === normalizeName(productName),
    )
    .sort(
      (a, b) =>
        new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime(),
    );

  const allocations: BatchAllocation[] = [];
  let remaining = quantity;

  for (const batch of batches) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, batch.availableQuantity);
    if (take <= 0) continue;
    allocations.push({
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      allocatedQty: take,
    });
    remaining -= take;
  }

  return allocations;
}

export function isActiveNearExpiryScheme(
  record: SchemeRecord,
  asOn = masterToday(),
): boolean {
  if (!isNearExpiryRecord(record)) return false;
  if (record.status === "inactive") return false;
  if (record.approvalStatus === "draft" || record.approvalStatus === "rejected") return false;
  if (PENDING_APPROVAL_STATUSES.includes(record.approvalStatus)) return false;
  if (record.approvalStatus !== "active" || record.status !== "active") return false;
  if (isNearExpirySchemeExpired(record)) return false;
  if (record.startDate && record.startDate > asOn) return false;
  if (record.endDate && record.endDate < asOn) return false;
  return true;
}

export function filterActiveNearExpirySchemeEntries<
  T extends { schemeId: number },
>(entries: T[] | undefined, asOn = masterToday()): T[] {
  if (!entries?.length) return [];
  const activeSchemeIds = new Set(
    loadConsolidatedSchemeRecords()
      .filter((record) => isActiveNearExpiryScheme(record, asOn))
      .map((record) => record.id),
  );
  return entries.filter((entry) => activeSchemeIds.has(entry.schemeId));
}

function schemeCoversState(record: SchemeRecord, stateName: string): boolean {
  if (!record.stateName?.trim()) return true;
  const states = record.stateName.split(",").map((s) => s.trim().toLowerCase());
  return states.includes(stateName.trim().toLowerCase());
}

function schemeCoversCustomer(record: SchemeRecord, customerType: CustomerType): boolean {
  return record.customerType === "All" || record.customerType === customerType;
}

function schemeCoversProduct(record: SchemeRecord, productId: string): boolean {
  const lines = getNearExpirySchemeLines(record);
  if (!lines.length) return record.productId === productId;
  return lines.some((line) => line.productId === productId);
}

function resolveSchemeBenefit(
  record: SchemeRecord,
  productId: string,
  stateName: string,
  customerType: CustomerType,
): {
  benefitType: DiscountType;
  benefitValue: number;
  benefitPerUnit: number;
  dealerPrice: number;
  schemeLine?: ReturnType<typeof getNearExpirySchemeLines>[number];
} {
  const lines = getNearExpirySchemeLines(record);
  const line = lines.find((l) => l.productId === productId);
  const dealerPrice =
    line?.dealerPrice ??
    resolveDealerPriceForScheme(parseInt(productId, 10), stateName, customerType) ??
    record.dealerPrice ??
    0;

  const benefitType: DiscountType =
    line?.benefitType ??
    (record.discountType === "Fixed Amount" ? "Fixed Amount" : "Percentage");
  const benefitValue = line?.benefitValue ?? record.discountValue ?? 0;
  const benefitPerUnit =
    line?.benefitAmount ??
    computePotentialBenefit(
      dealerPrice,
      benefitType === "Fixed Amount" ? "Rupees" : "Percentage",
      benefitValue,
    );

  return { benefitType, benefitValue, benefitPerUnit, dealerPrice, schemeLine: line };
}

export function evaluateNearExpiryEligibility(
  context: NearExpiryDispatchContext,
  batch: BatchAllocation,
): NearExpiryEligibilityResult | null {
  const asOn = context.asOn ?? masterToday();
  const product = resolveProductIdByNameOrSku(context.productName, context.sku);
  if (!product) return null;

  const warehouseState = resolveWarehouseState(context.warehouse);
  const customerType = resolveCustomerSchemeType(context.customerName);
  const remainingExpiryDays = daysUntilExpiry(batch.expiryDate, asOn);
  if (remainingExpiryDays < 0) return null;

  const activeSchemes = loadConsolidatedSchemeRecords().filter((record) =>
    isActiveNearExpiryScheme(record, asOn),
  );

  for (const scheme of activeSchemes) {
    const expiryWithinDays = scheme.expiryWithinDays ?? 0;
    if (expiryWithinDays <= 0 || remainingExpiryDays > expiryWithinDays) continue;
    if (!schemeCoversState(scheme, warehouseState)) continue;
    if (!schemeCoversCustomer(scheme, customerType)) continue;
    if (!schemeCoversProduct(scheme, product.productId)) continue;

    const benefit = resolveSchemeBenefit(
      scheme,
      product.productId,
      warehouseState,
      customerType,
    );
    const estimatedBenefitAmount = benefit.benefitPerUnit * batch.allocatedQty;

    return {
      eligible: true,
      scheme,
      schemeLine: benefit.schemeLine,
      batchNumber: batch.batchNumber,
      batchExpiryDate: batch.expiryDate,
      remainingExpiryDays,
      benefitType: benefit.benefitType,
      benefitValue: benefit.benefitValue,
      benefitPerUnit: benefit.benefitPerUnit,
      estimatedBenefitAmount,
      dealerPrice: benefit.dealerPrice,
      productId: product.productId,
    };
  }

  return null;
}

export function evaluateProductNearExpiryEligibilities(
  context: Omit<NearExpiryDispatchContext, "batchAllocations"> & {
    batchAllocations: BatchAllocation[];
  },
): NearExpiryEligibilityResult[] {
  return context.batchAllocations
    .map((batch) =>
      evaluateNearExpiryEligibility({ ...context, batchAllocations: [batch] }, batch),
    )
    .filter((result): result is NearExpiryEligibilityResult => Boolean(result));
}

export function formatNearExpiryBenefitLabel(
  benefitType: DiscountType,
  benefitValue: number,
): string {
  return benefitType === "Fixed Amount"
    ? formatSchemeRupee(benefitValue)
    : `${benefitValue}%`;
}

export function buildDispatchNearExpiryEntries(
  context: NearExpiryDispatchContext,
): DispatchNearExpirySchemeEntry[] {
  const allocations =
    context.batchAllocations ??
    allocateFefoBatches(context.productName, context.warehouse, context.quantity);

  const results = evaluateProductNearExpiryEligibilities({
    ...context,
    batchAllocations: allocations,
  });

  return results.map((result) => {
    const scheme = result.scheme!;

    return {
      schemeId: scheme.id,
      schemeCode: scheme.schemeCode,
      schemeName: scheme.schemeName,
      schemeType: "Near Expiry" as const,
      schemeStatus: NEAR_EXPIRY_SCHEME_STATUS_ACTIVE,
      product: context.productName,
      productId: result.productId,
      sku: context.sku,
      batchNumber: result.batchNumber,
      batchExpiryDate: result.batchExpiryDate,
      remainingExpiryDays: result.remainingExpiryDays,
      dispatchQuantity: allocations.find((a) => a.batchNumber === result.batchNumber)?.allocatedQty ?? context.quantity,
      benefitType: result.benefitType,
      benefitValue: result.benefitValue,
      estimatedBenefitAmount: result.estimatedBenefitAmount,
      settlementMethod: NEAR_EXPIRY_SETTLEMENT_METHOD,
      settlementStatus: NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
      settlement: NEAR_EXPIRY_SETTLEMENT_METHOD,
      status: NEAR_EXPIRY_SETTLEMENT_STATUS_PENDING,
      pendingSettlement: true as const,
      dealerPrice: result.dealerPrice,
    };
  });
}

export function hasNearExpiryEligibility(
  context: NearExpiryDispatchContext,
): boolean {
  return buildDispatchNearExpiryEntries(context).length > 0;
}

export { formatBatchExpiryDate };

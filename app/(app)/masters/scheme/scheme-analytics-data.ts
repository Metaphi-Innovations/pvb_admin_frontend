import { loadInvoices, isSchemeSettlementPending, type InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  hydrateOrders,
  loadOrders,
  loadCustomers,
  getEligibleSchemesForSalesOrderLine,
} from "@/app/(app)/sales/orders/orders-data";
const getDispatchRecords = (): any[] => [];

import { SCHEME_EFFECT_MAP, type SchemeRecord } from "./scheme-data";
import { isProductDiscountRecord } from "./product-discount-scheme";
import { isNearExpiryRecord } from "./product-near-expiry-scheme";
import {
  getUtilizationBySchemeCode,
} from "./scheme-utilization-data";

export interface SchemeUtilizationStats {
  utilizedCount: number;
  eligibleCount: number | null;
  utilizationPercent: number;
  isUtilized: boolean;
  hasPendingSettlement: boolean;
  pendingSettlementCount: number;
  totalBenefitGiven: number;
  salesGenerated: number;
}

export interface SchemeListingSummaryKpis {
  totalSchemes: number;
  utilizedSchemes: number;
  utilizationPercent: number;
  pendingSettlementSchemes: number;
  totalBenefitGiven: number;
  salesGenerated: number;
}

export type SchemeUtilizationFilter = "all" | "utilized" | "not_utilized" | "pending";

export function formatSchemeAnalyticsRupee(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function formatUtilizationPercent(stats: SchemeUtilizationStats): string {
  return `${stats.utilizationPercent}%`;
}

function isGeneratedInvoice(invoice: InvoiceRecord): boolean {
  return invoice.invoiceStatus === "sent" && Boolean(invoice.invoiceNo?.trim());
}

function matchesSchemeRef(
  schemeCode: string,
  schemeId: number,
  refCode: string,
  refId: number,
): boolean {
  if (refCode.trim() === schemeCode.trim()) return true;
  return refId === schemeId;
}

function countEligibleUsageSlots(record: SchemeRecord): number | null {
  const schemeId = record.id;
  const schemeCode = record.schemeCode.trim();
  const customers = loadCustomers();
  const customerById = new Map(customers.map((c) => [c.id, c]));

  if (isProductDiscountRecord(record)) {
    let count = 0;
    for (const order of hydrateOrders(loadOrders())) {
      if (order.status === "draft" || order.status === "cancelled") continue;
      const customer = customerById.get(order.customerId);
      if (!customer?.stateName || !customer.customerType) continue;

      for (const line of order.lineItems) {
        if (!line.productId) continue;
        const offers = getEligibleSchemesForSalesOrderLine(line.productId, {
          stateName: customer.stateName,
          customerMasterType: customer.customerType,
          orderDate: order.orderDate,
        });
        if (
          offers.some(
            (offer) => offer.schemeId === schemeId || offer.schemeCode.trim() === schemeCode,
          )
        ) {
          count += 1;
          break;
        }
      }
    }
    return count > 0 ? count : null;
  }

  if (isNearExpiryRecord(record)) {
    let count = 0;
    for (const dispatch of getDispatchRecords()) {
      const entries = (dispatch.nearExpirySchemes ?? []).filter(
        (e: any) => e.schemeId === schemeId || e.schemeCode.trim() === schemeCode,
      );
      if (entries.length > 0) {
        count += entries.length;
        continue;
      }
      if (dispatch.products.some((p: any) => p.nearExpirySchemeEligible)) {
        count += 1;
      }
    }
    return count > 0 ? count : null;
  }

  return null;
}

function resolveUtilizationPercent(utilizedCount: number, eligibleCount: number | null): number {
  if (eligibleCount !== null && eligibleCount > 0) {
    return Math.min(100, Math.round((utilizedCount / eligibleCount) * 100));
  }
  return utilizedCount > 0 ? 100 : 0;
}

function productDiscountStats(record: SchemeRecord): Omit<
  SchemeUtilizationStats,
  "eligibleCount" | "utilizationPercent"
> {
  const records = getUtilizationBySchemeCode(record.schemeCode);
  const utilizedCount = records.length;
  let salesGenerated = 0;
  const countedInvoices = new Set<number>();

  for (const util of records) {
    const invoice = loadInvoices().find(
      (inv) =>
        isGeneratedInvoice(inv) &&
        (inv.salesOrderNo === util.salesOrderNumber || inv.referenceNo === util.salesOrderNumber),
    );
    if (invoice && !countedInvoices.has(invoice.id)) {
      countedInvoices.add(invoice.id);
      salesGenerated += invoice.grandTotal ?? invoice.subtotal ?? 0;
    }
  }

  const totalBenefitGiven = Math.round(
    records.reduce((sum, r) => sum + r.discountAmount * r.quantity, 0) * 100,
  ) / 100;

  if (salesGenerated === 0 && utilizedCount > 0) {
    salesGenerated = Math.round(
      records.reduce((sum, r) => sum + r.finalRate * r.quantity, 0) * 100,
    ) / 100;
  }

  return {
    utilizedCount,
    isUtilized: utilizedCount > 0,
    hasPendingSettlement: false,
    pendingSettlementCount: 0,
    totalBenefitGiven,
    salesGenerated: Math.round(salesGenerated),
  };
}

function nearExpiryAndSettlementStats(record: SchemeRecord): Omit<
  SchemeUtilizationStats,
  "eligibleCount" | "utilizationPercent"
> {
  const { schemeCode } = record;
  const schemeId = record.id;
  let utilizedCount = 0;
  let pendingSettlementCount = 0;
  let totalBenefitGiven = 0;
  let salesGenerated = 0;
  const countedInvoices = new Set<number>();

  for (const invoice of loadInvoices()) {
    for (const entry of invoice.nearExpirySchemeSettlements ?? []) {
      if (!matchesSchemeRef(schemeCode, schemeId, entry.schemeCode, entry.schemeId)) continue;
      utilizedCount += 1;
      totalBenefitGiven += entry.settlementAmount ?? entry.estimatedBenefitAmount;
      if (isSchemeSettlementPending(entry.settlementStatus)) {
        pendingSettlementCount += 1;
      }
      if (isGeneratedInvoice(invoice) && !countedInvoices.has(invoice.id)) {
        countedInvoices.add(invoice.id);
        salesGenerated += invoice.grandTotal ?? invoice.subtotal ?? 0;
      }
    }
  }

  for (const dispatch of getDispatchRecords()) {
    for (const entry of dispatch.nearExpirySchemes ?? []) {
      if (!matchesSchemeRef(schemeCode, schemeId, entry.schemeCode, entry.schemeId)) continue;
      const so = dispatch.salesOrderNumber || dispatch.source_document_no || "";
      const invoiced = so
        ? loadInvoices().some(
          (inv) =>
            isGeneratedInvoice(inv) &&
            (inv.salesOrderNo === so || inv.referenceNo === so),
        )
        : false;
      if (invoiced) continue;
      utilizedCount += 1;
      totalBenefitGiven += entry.estimatedBenefitAmount;
      pendingSettlementCount += 1;
    }
  }

  return {
    utilizedCount,
    isUtilized: utilizedCount > 0,
    hasPendingSettlement: pendingSettlementCount > 0,
    pendingSettlementCount,
    totalBenefitGiven: Math.round(totalBenefitGiven * 100) / 100,
    salesGenerated: Math.round(salesGenerated),
  };
}

function genericSettlementStats(record: SchemeRecord): Omit<
  SchemeUtilizationStats,
  "eligibleCount" | "utilizationPercent"
> {
  const effect = SCHEME_EFFECT_MAP[record.schemeType];
  if (effect?.effectType === "DIRECT_ORDER_DISCOUNT") {
    return productDiscountStats(record);
  }
  if (isNearExpiryRecord(record)) {
    return nearExpiryAndSettlementStats(record);
  }

  const { schemeCode } = record;
  const schemeId = record.id;
  let utilizedCount = 0;
  let pendingSettlementCount = 0;
  let totalBenefitGiven = 0;
  let salesGenerated = 0;

  for (const invoice of loadInvoices()) {
    for (const entry of invoice.nearExpirySchemeSettlements ?? []) {
      if (!matchesSchemeRef(schemeCode, schemeId, entry.schemeCode, entry.schemeId)) continue;
      utilizedCount += 1;
      totalBenefitGiven += entry.settlementAmount ?? entry.estimatedBenefitAmount;
      if (isSchemeSettlementPending(entry.settlementStatus)) {
        pendingSettlementCount += 1;
      }
      if (isGeneratedInvoice(invoice)) {
        salesGenerated += invoice.grandTotal ?? invoice.subtotal ?? 0;
      }
    }
  }

  return {
    utilizedCount,
    isUtilized: utilizedCount > 0,
    hasPendingSettlement: pendingSettlementCount > 0,
    pendingSettlementCount,
    totalBenefitGiven: Math.round(totalBenefitGiven * 100) / 100,
    salesGenerated: Math.round(salesGenerated),
  };
}

/** Scheme-level utilization for one scheme master record. */
export function getSchemeUtilizationStats(record: SchemeRecord): SchemeUtilizationStats {
  const base = isProductDiscountRecord(record)
    ? productDiscountStats(record)
    : isNearExpiryRecord(record)
      ? nearExpiryAndSettlementStats(record)
      : genericSettlementStats(record);

  const eligibleCount = countEligibleUsageSlots(record);
  const utilizationPercent = resolveUtilizationPercent(base.utilizedCount, eligibleCount);

  return {
    ...base,
    eligibleCount,
    utilizationPercent,
  };
}

/** Portfolio KPIs for Scheme Management listing. */
export function buildSchemeListingSummaryKpis(records: SchemeRecord[]): SchemeListingSummaryKpis {
  const totalSchemes = records.length;
  let utilizedSchemes = 0;
  let pendingSettlementSchemes = 0;
  let totalBenefitGiven = 0;
  let salesGenerated = 0;

  for (const record of records) {
    const stats = getSchemeUtilizationStats(record);
    if (stats.isUtilized) utilizedSchemes += 1;
    if (stats.hasPendingSettlement) pendingSettlementSchemes += 1;
    totalBenefitGiven += stats.totalBenefitGiven;
    salesGenerated += stats.salesGenerated;
  }

  const utilizationPercent =
    totalSchemes > 0 ? Math.round((utilizedSchemes / totalSchemes) * 100) : 0;

  return {
    totalSchemes,
    utilizedSchemes,
    utilizationPercent,
    pendingSettlementSchemes,
    totalBenefitGiven: Math.round(totalBenefitGiven),
    salesGenerated: Math.round(salesGenerated),
  };
}

export function matchesUtilizationFilter(
  record: SchemeRecord,
  filter: SchemeUtilizationFilter,
): boolean {
  if (filter === "all") return true;
  const stats = getSchemeUtilizationStats(record);
  if (filter === "utilized") return stats.isUtilized;
  if (filter === "not_utilized") return !stats.isUtilized;
  return stats.hasPendingSettlement;
}

/** @deprecated Use getSchemeUtilizationStats */
export function getSchemeAnalyticsKpis(record: SchemeRecord) {
  const s = getSchemeUtilizationStats(record);
  return {
    eligibleOrders: s.eligibleCount ?? 0,
    utilizedOrders: s.utilizedCount,
    pendingSettlement: s.pendingSettlementCount,
    settled: s.isUtilized ? s.utilizedCount - s.pendingSettlementCount : 0,
    totalBenefitGiven: s.totalBenefitGiven,
    salesGenerated: s.salesGenerated,
  };
}

/** @deprecated Use buildSchemeListingSummaryKpis */
export function aggregateSchemeKpis(records: SchemeRecord[]) {
  const k = buildSchemeListingSummaryKpis(records);
  return {
    eligibleOrders: 0,
    utilizedOrders: k.utilizedSchemes,
    pendingSettlement: k.pendingSettlementSchemes,
    settled: k.utilizedSchemes - k.pendingSettlementSchemes,
    totalBenefitGiven: k.totalBenefitGiven,
    salesGenerated: k.salesGenerated,
  };
}

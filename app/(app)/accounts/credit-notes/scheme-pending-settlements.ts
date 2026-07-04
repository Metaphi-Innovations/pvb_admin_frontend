/**
 * Pending standard scheme settlements for Credit Notes (read-only from Scheme Management data).
 * Does not modify scheme module storage — only reads scheme + invoice records.
 */

import { loadConsolidatedSchemeRecords } from "@/app/(app)/masters/scheme/product-discount-scheme";
import type { SchemeRecord, TurnoverSlab } from "@/app/(app)/masters/scheme/scheme-data";
import { SCHEME_EFFECT_MAP } from "@/app/(app)/masters/scheme/scheme-data";
import { loadInvoices, type InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";
import {
  findPendingSchemeSettlement,
  listPendingSchemeSettlementOptions,
  type PendingSchemeSettlementOption,
} from "@/lib/accounts/scheme-settlement-data";
import {
  schemeKindFromSchemeType,
  type CreditNoteSourceKind,
} from "./credit-note-source-types";
import { loadCreditNotes } from "./credit-notes-data";
import {
  invalidateModuleDataCache,
  MODULE_CACHE_KEYS,
  readThroughModuleCache,
} from "@/lib/accounts/module-data-cache";

export interface SchemeSettlementDetailBase {
  schemeName: string;
  schemeCode: string;
  eligibleAmount: number;
  discountPercent: number;
  linkedInvoiceIds: number[];
  linkedInvoiceNos: string[];
}

export interface SalesReturnSettlementDetail {
  kind: "sales_return";
  salesReturnNo: string;
  returnDate: string;
  originalInvoiceNo: string;
  originalInvoiceId: number | null;
}

export interface CashDiscountSettlementDetail extends SchemeSettlementDetailBase {
  kind: "cash_discount";
  invoiceDate: string;
  paymentDate: string;
  daysTaken: number;
  applicableSlab: string;
}

export interface NearExpirySettlementDetail extends SchemeSettlementDetailBase {
  kind: "near_expiry";
  product: string;
  batch: string;
  expiryDate: string;
  daysRemaining: number;
  eligibleQty: number;
}

export interface FestiveSchemeSettlementDetail extends SchemeSettlementDetailBase {
  kind: "festive_scheme";
  schemePeriod: string;
  targetQty: number;
  achievedQty: number;
  achievementPercent: number;
}

export interface PaymentDiscountSettlementDetail extends SchemeSettlementDetailBase {
  kind: "payment_discount";
  invoiceDate: string;
  paymentDate: string;
  creditDays: number;
  actualDaysTaken: number;
  applicableSlab: string;
}

export interface TurnoverDiscountSettlementDetail extends SchemeSettlementDetailBase {
  kind: "turnover_discount";
  schemePeriod: string;
  targetTurnover: number;
  achievedTurnover: number;
}

export type CreditNoteSettlementDetail =
  | SalesReturnSettlementDetail
  | CashDiscountSettlementDetail
  | NearExpirySettlementDetail
  | FestiveSchemeSettlementDetail
  | PaymentDiscountSettlementDetail
  | TurnoverDiscountSettlementDetail;

export interface UnifiedSchemePendingRow {
  key: string;
  sourceKind: CreditNoteSourceKind;
  customerName: string;
  customerId: number | null;
  referenceNo: string;
  linkedInvoiceIds: number[];
  linkedInvoiceNos: string[];
  eligibleAmount: number;
  settlementDetail: CreditNoteSettlementDetail;
  /** For near-expiry compatibility with existing scheme settlement key format */
  schemeSettlementKey?: string;
  schemeCode?: string;
  schemeName?: string;
  returnId?: string;
  returnDate?: string;
}

function isActiveScheme(scheme: SchemeRecord): boolean {
  return (
    (scheme.approvalStatus === "active" || scheme.status === "active") &&
    scheme.approvalStatus !== "draft"
  );
}

function isPostedInvoice(inv: InvoiceRecord): boolean {
  return inv.invoiceStatus === "sent" && Boolean(inv.invoiceNo?.trim());
}

function daysBetween(start: string, end: string): number {
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

function hasCreditNoteForKey(key: string): boolean {
  return loadCreditNotes().some(
    (cn) => cn.status !== "cancelled" && cn.schemeSettlementKey === key,
  );
}

function resolveDiscountPercent(scheme: SchemeRecord): number {
  if (scheme.discountValue && scheme.discountType === "Percentage") return scheme.discountValue;
  if (scheme.waiverPercent) return scheme.waiverPercent;
  if (scheme.discountValue) return scheme.discountValue;
  return 0;
}

function computeEligibleFromInvoice(inv: InvoiceRecord, pct: number): number {
  if (pct > 0) return Math.round(inv.grandTotal * (pct / 100) * 100) / 100;
  return Math.round(inv.grandTotal * 0.02 * 100) / 100;
}

function pickInvoicesForScheme(scheme: SchemeRecord, limit = 2): InvoiceRecord[] {
  const invoices = loadInvoices().filter(isPostedInvoice);
  const customerIds = scheme.customerIds ?? [];
  return invoices
    .filter((inv) => {
      if (customerIds.length === 0) return true;
      const custCode = inv.customerId ? `CUST-${String(inv.customerId).padStart(3, "0")}` : "";
      return customerIds.some(
        (id) =>
          id === custCode ||
          id === String(inv.customerId) ||
          inv.customerName.toLowerCase().includes(id.replace("CUST-", "").toLowerCase()),
      );
    })
    .slice(0, limit);
}

function resolveTurnoverSlab(scheme: SchemeRecord, achieved: number): TurnoverSlab | null {
  const slabs = scheme.turnoverSlabs ?? [];
  for (const slab of slabs) {
    const from = slab.fromTurnover ?? 0;
    const to = slab.toTurnover ?? Number.POSITIVE_INFINITY;
    if (achieved >= from && achieved < to) return slab;
  }
  return slabs.length ? slabs[slabs.length - 1] : null;
}

function nearExpiryToUnified(opt: PendingSchemeSettlementOption): UnifiedSchemePendingRow {
  const pct = opt.benefitType?.toLowerCase().includes("percent") ? opt.benefitValue : 0;
  return {
    key: opt.key,
    sourceKind: "near_expiry",
    customerName: opt.customerName,
    customerId: opt.customerId,
    referenceNo: opt.schemeCode,
    linkedInvoiceIds: [opt.invoiceId],
    linkedInvoiceNos: [opt.invoiceNo],
    eligibleAmount: opt.estimatedBenefitAmount,
    schemeSettlementKey: opt.key,
    schemeCode: opt.schemeCode,
    schemeName: opt.schemeName,
    settlementDetail: {
      kind: "near_expiry",
      schemeName: opt.schemeName,
      schemeCode: opt.schemeCode,
      product: opt.product,
      batch: opt.batchNumber,
      expiryDate: opt.batchExpiryDate,
      daysRemaining: opt.remainingExpiryDays,
      eligibleQty: 1,
      discountPercent: pct,
      eligibleAmount: opt.estimatedBenefitAmount,
      linkedInvoiceIds: [opt.invoiceId],
      linkedInvoiceNos: [opt.invoiceNo],
    },
  };
}

function buildCashDiscountPending(scheme: SchemeRecord, inv: InvoiceRecord): UnifiedSchemePendingRow | null {
  const key = `cash:${scheme.id}:${inv.id}`;
  if (hasCreditNoteForKey(key)) return null;
  const pct = resolveDiscountPercent(scheme);
  const paymentDate = inv.collections?.[0]?.paymentDate ?? inv.invoiceDate;
  const daysTaken = daysBetween(inv.invoiceDate, paymentDate);
  const eligible = computeEligibleFromInvoice(inv, pct);
  return {
    key,
    sourceKind: "cash_discount",
    customerName: inv.customerName,
    customerId: inv.customerId,
    referenceNo: scheme.schemeCode,
    linkedInvoiceIds: [inv.id],
    linkedInvoiceNos: [inv.invoiceNo],
    eligibleAmount: eligible,
    schemeSettlementKey: key,
    schemeCode: scheme.schemeCode,
    schemeName: scheme.schemeName,
    settlementDetail: {
      kind: "cash_discount",
      schemeName: scheme.schemeName,
      schemeCode: scheme.schemeCode,
      invoiceDate: inv.invoiceDate,
      paymentDate,
      daysTaken,
      applicableSlab: `${pct}% on invoice value`,
      discountPercent: pct,
      eligibleAmount: eligible,
      linkedInvoiceIds: [inv.id],
      linkedInvoiceNos: [inv.invoiceNo],
    },
  };
}

function buildFestivePending(scheme: SchemeRecord, inv: InvoiceRecord): UnifiedSchemePendingRow | null {
  const key = `festive:${scheme.id}:${inv.id}`;
  if (hasCreditNoteForKey(key)) return null;
  const pct = resolveDiscountPercent(scheme);
  const targetQty = 100;
  const achievedQty = inv.lineItems.reduce((s, l) => s + l.qty, 0);
  const achievementPercent = Math.min(100, Math.round((achievedQty / targetQty) * 100));
  const eligible = computeEligibleFromInvoice(inv, pct);
  return {
    key,
    sourceKind: "festive_scheme",
    customerName: inv.customerName,
    customerId: inv.customerId,
    referenceNo: scheme.schemeCode,
    linkedInvoiceIds: [inv.id],
    linkedInvoiceNos: [inv.invoiceNo],
    eligibleAmount: eligible,
    schemeSettlementKey: key,
    schemeCode: scheme.schemeCode,
    schemeName: scheme.schemeName,
    settlementDetail: {
      kind: "festive_scheme",
      schemeName: scheme.schemeName,
      schemeCode: scheme.schemeCode,
      schemePeriod: `${scheme.startDate ?? "—"} to ${scheme.endDate ?? "—"}`,
      targetQty,
      achievedQty,
      achievementPercent,
      discountPercent: pct,
      eligibleAmount: eligible,
      linkedInvoiceIds: [inv.id],
      linkedInvoiceNos: [inv.invoiceNo],
    },
  };
}

function buildPaymentDiscountPending(scheme: SchemeRecord, inv: InvoiceRecord): UnifiedSchemePendingRow | null {
  const key = `payment:${scheme.id}:${inv.id}`;
  if (hasCreditNoteForKey(key)) return null;
  const pct = scheme.waiverPercent ?? resolveDiscountPercent(scheme);
  const paymentDate = inv.collections?.[0]?.paymentDate ?? new Date().toISOString().slice(0, 10);
  const creditDays = scheme.paymentWithinDays ?? scheme.outstandingDays ?? 30;
  const daysTaken = daysBetween(inv.invoiceDate, paymentDate);
  const eligible =
    scheme.waiverAmount && scheme.waiverAmount > 0
      ? Math.min(scheme.waiverAmount, inv.balanceAmount || inv.grandTotal)
      : computeEligibleFromInvoice(inv, pct);
  return {
    key,
    sourceKind: "payment_discount",
    customerName: inv.customerName,
    customerId: inv.customerId,
    referenceNo: scheme.schemeCode,
    linkedInvoiceIds: [inv.id],
    linkedInvoiceNos: [inv.invoiceNo],
    eligibleAmount: eligible,
    schemeSettlementKey: key,
    schemeCode: scheme.schemeCode,
    schemeName: scheme.schemeName,
    settlementDetail: {
      kind: "payment_discount",
      schemeName: scheme.schemeName,
      schemeCode: scheme.schemeCode,
      invoiceDate: inv.invoiceDate,
      paymentDate,
      creditDays,
      actualDaysTaken: daysTaken,
      applicableSlab: pct > 0 ? `${pct}% within ${creditDays} days` : "Fixed waiver",
      discountPercent: pct,
      eligibleAmount: eligible,
      linkedInvoiceIds: [inv.id],
      linkedInvoiceNos: [inv.invoiceNo],
    },
  };
}

function buildTurnoverPending(scheme: SchemeRecord, invoices: InvoiceRecord[]): UnifiedSchemePendingRow | null {
  const key = `turnover:${scheme.id}`;
  if (hasCreditNoteForKey(key)) return null;
  const achieved = invoices.reduce((s, inv) => s + inv.grandTotal, 0);
  const slab = resolveTurnoverSlab(scheme, achieved);
  const pct = slab?.benefitPercent ?? resolveDiscountPercent(scheme);
  const eligible = Math.round(achieved * (pct / 100) * 100) / 100;
  const linkedIds = invoices.map((i) => i.id);
  const linkedNos = invoices.map((i) => i.invoiceNo);
  const cust = invoices[0];
  if (!cust) return null;
  const target = scheme.turnoverSlabs?.[0]?.fromTurnover ?? 500000;
  return {
    key,
    sourceKind: "turnover_discount",
    customerName: cust.customerName,
    customerId: cust.customerId,
    referenceNo: scheme.schemeCode,
    linkedInvoiceIds: linkedIds,
    linkedInvoiceNos: linkedNos,
    eligibleAmount: eligible,
    schemeSettlementKey: key,
    schemeCode: scheme.schemeCode,
    schemeName: scheme.schemeName,
    settlementDetail: {
      kind: "turnover_discount",
      schemeName: scheme.schemeName,
      schemeCode: scheme.schemeCode,
      schemePeriod: `${scheme.startDate ?? "—"} to ${scheme.endDate ?? "—"}`,
      targetTurnover: target,
      achievedTurnover: achieved,
      discountPercent: pct,
      eligibleAmount: eligible,
      linkedInvoiceIds: linkedIds,
      linkedInvoiceNos: linkedNos,
    },
  };
}

function listStandardSchemePending(): UnifiedSchemePendingRow[] {
  const rows: UnifiedSchemePendingRow[] = [];
  const schemes = loadConsolidatedSchemeRecords().filter(isActiveScheme);

  for (const scheme of schemes) {
    const effect = SCHEME_EFFECT_MAP[scheme.schemeType as keyof typeof SCHEME_EFFECT_MAP];
    if (!effect || effect.effectType === "DIRECT_ORDER_DISCOUNT") continue;
    const kind = schemeKindFromSchemeType(scheme.schemeType);
    if (!kind || kind === "near_expiry") continue;

    if (kind === "turnover_discount") {
      const invs = pickInvoicesForScheme(scheme, 3);
      const row = buildTurnoverPending(scheme, invs);
      if (row) rows.push(row);
      continue;
    }

    const invoices = pickInvoicesForScheme(scheme, 1);
    for (const inv of invoices) {
      let row: UnifiedSchemePendingRow | null = null;
      if (kind === "cash_discount") row = buildCashDiscountPending(scheme, inv);
      else if (kind === "festive_scheme") row = buildFestivePending(scheme, inv);
      else if (kind === "payment_discount") row = buildPaymentDiscountPending(scheme, inv);
      if (row) rows.push(row);
    }
  }

  return rows;
}

function buildAllSchemePendingSettlements(): UnifiedSchemePendingRow[] {
  const nearExpiry = listPendingSchemeSettlementOptions()
    .filter((opt) => !hasCreditNoteForKey(opt.key))
    .map(nearExpiryToUnified);
  const standard = listStandardSchemePending();
  return [...nearExpiry, ...standard].sort((a, b) => b.referenceNo.localeCompare(a.referenceNo));
}

export function invalidateSchemePendingSettlementsCache(): void {
  invalidateModuleDataCache(MODULE_CACHE_KEYS.schemePendingAll);
}

export function listAllSchemePendingSettlements(): UnifiedSchemePendingRow[] {
  return readThroughModuleCache(MODULE_CACHE_KEYS.schemePendingAll, buildAllSchemePendingSettlements);
}

export function findSchemePendingSettlement(key: string): UnifiedSchemePendingRow | undefined {
  if (hasCreditNoteForKey(key)) return undefined;

  const parts = key.split(":");
  const firstPart = parts[0];
  if (parts.length >= 3 && Number.isFinite(Number(firstPart))) {
    const opt = findPendingSchemeSettlement(key);
    if (opt) return nearExpiryToUnified(opt);
  }

  if (key.startsWith("cash:") || key.startsWith("festive:") || key.startsWith("payment:")) {
    const [, schemeIdStr, invIdStr] = key.split(":");
    const schemeId = Number(schemeIdStr);
    const invId = Number(invIdStr);
    if (Number.isFinite(schemeId) && Number.isFinite(invId)) {
      const scheme = loadConsolidatedSchemeRecords().find((s) => s.id === schemeId);
      const inv = loadInvoices().find((i) => i.id === invId);
      if (scheme && inv && isActiveScheme(scheme) && isPostedInvoice(inv)) {
        if (key.startsWith("cash:")) return buildCashDiscountPending(scheme, inv) ?? undefined;
        if (key.startsWith("festive:")) return buildFestivePending(scheme, inv) ?? undefined;
        return buildPaymentDiscountPending(scheme, inv) ?? undefined;
      }
    }
  }

  if (key.startsWith("turnover:")) {
    const schemeId = Number(key.split(":")[1]);
    if (Number.isFinite(schemeId)) {
      const scheme = loadConsolidatedSchemeRecords().find((s) => s.id === schemeId);
      if (scheme && isActiveScheme(scheme)) {
        return buildTurnoverPending(scheme, pickInvoicesForScheme(scheme, 3)) ?? undefined;
      }
    }
  }

  return undefined;
}

export function nearExpiryOptionFromUnified(row: UnifiedSchemePendingRow): PendingSchemeSettlementOption | undefined {
  if (row.sourceKind !== "near_expiry") return undefined;
  const detail = row.settlementDetail;
  if (detail.kind !== "near_expiry") return undefined;
  const invId = row.linkedInvoiceIds[0];
  if (!invId) return undefined;
  return {
    key: row.key,
    invoiceId: invId,
    schemeId: 0,
    schemeCode: row.schemeCode ?? detail.schemeCode,
    schemeName: row.schemeName ?? detail.schemeName,
    schemeType: "Near Expiry",
    schemeStatus: "active",
    customerId: row.customerId,
    customerName: row.customerName,
    invoiceNo: row.linkedInvoiceNos[0] ?? "",
    salesOrderNo: "",
    product: detail.product,
    productId: "",
    batchNumber: detail.batch,
    batchExpiryDate: detail.expiryDate,
    remainingExpiryDays: detail.daysRemaining,
    benefitType: "Percentage",
    benefitValue: detail.discountPercent,
    estimatedBenefitAmount: detail.eligibleAmount,
  };
}

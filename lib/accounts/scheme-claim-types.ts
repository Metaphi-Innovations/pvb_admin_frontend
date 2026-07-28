/**
 * Generic Scheme Claim types — ERP-calculated payload consumed by Accounts.
 * Accounts must NOT recalculate eligibility; display + review only.
 */

export type SchemeCalculationType =
  | "QUANTITY_BASED"
  | "TURNOVER_BASED"
  | "PAYMENT_BASED"
  | "NEAR_EXPIRY"
  | "PERIOD_PROMOTIONAL"
  | "PRODUCT_DISCOUNT";

export interface SchemeClaimRuleApplied {
  targetQuantity?: number;
  achievedQuantity?: number;
  eligibleQuantity?: number;
  uom?: string;
  appliedRate?: number | string;
  calculationBasis?: string;
  eligibleTurnover?: number;
  excludedTurnover?: number;
  exclusionReason?: string;
  appliedSlab?: string;
  requiredPaymentDays?: number;
  invoiceDate?: string;
  dueDate?: string;
  receiptDate?: string;
  receiptNumber?: string;
  actualPaymentDays?: number;
  eligiblePaidAmount?: number;
  paymentStatus?: "Full" | "Partial";
  configuredExpiryWindowDays?: number;
  eligibleLineCount?: number;
  eligibleTaxableValue?: number;
  referenceDate?: string;
  schemeValidityStart?: string;
  schemeValidityEnd?: string;
  eligibleTransactionStart?: string;
  eligibleTransactionEnd?: string;
  displaySummary?: string;
}

export interface SchemeClaimIncludedRecord {
  invoiceId: number;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceLineId?: string;
  productId?: number;
  productName?: string;
  sku?: string;
  batchNumber?: string;
  mfgDate?: string;
  expiryDate?: string;
  dispatchDate?: string;
  invoicedQuantity?: number;
  eligibleQuantity?: number;
  uom?: string;
  rate?: number;
  taxableValue: number;
  appliedRate?: number | string;
  calculatedBenefit?: number;
  eligibilityStatus: "Eligible" | "Excluded";
  eligibilityReason?: string;
}

export interface SchemeClaimExcludedRecord {
  invoiceId?: number;
  invoiceNumber?: string;
  productName?: string;
  batchNumber?: string;
  quantity?: number;
  uom?: string;
  exclusionReason: string;
}

export interface SchemeClaimInvoiceSummary {
  invoiceId: number;
  invoiceNumber: string;
  invoiceDate: string;
  totalLines: number;
  eligibleLines: number;
  eligibleQuantity: number;
  eligibleTaxableValue: number;
  calculatedBenefit: number;
  lines: SchemeClaimIncludedRecord[];
}

/** Legacy invoice-level breakdown row (backward compatible). */
export interface SchemeClaimLegacyBreakdownRow {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  taxableValue: number;
  appliedSchemeId: string | null;
  appliedSchemeName: string | null;
  includedInCalculation: boolean;
  exclusionReason: string;
}

export interface SchemeClaimSupportingRef {
  label: string;
  value: string;
}

/** Minimal claim shape for display helpers — satisfied by SchemeEntitlement. */
export interface SchemeClaimDisplaySource {
  id: string;
  claimNumber?: string;
  schemeCode: string;
  schemeName: string;
  schemeType: string;
  calculationType?: SchemeCalculationType;
  calculationBasis: string;
  discountType: "Percentage" | "Amount";
  discountRate: number;
  eligibleBaseAmount: number;
  calculatedBenefit: number;
  creditNoteAmount?: number;
  excludedSchemeAmount: number;
  otherExclusionAmount: number;
  appliedSlab?: string;
  periodStart: string;
  periodEnd: string;
  settlementPeriodStart?: string;
  settlementPeriodEnd?: string;
  includedRecords?: SchemeClaimIncludedRecord[];
  excludedRecords?: SchemeClaimExcludedRecord[];
  ruleApplied?: SchemeClaimRuleApplied;
  invoiceBreakdown: SchemeClaimLegacyBreakdownRow[];
  supportingReferences: SchemeClaimSupportingRef[];
}

const EM_DASH = "—";

export function formatClaimDisplay(value: unknown): string {
  if (value == null || value === "") return EM_DASH;
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return String(value);
}

export function getEntitlementClaimNumber(ent: SchemeClaimDisplaySource): string {
  return ent.claimNumber?.trim() || ent.schemeCode || ent.id;
}

export function getEntitlementCalculationType(
  ent: SchemeClaimDisplaySource,
): SchemeCalculationType {
  if (ent.calculationType) return ent.calculationType;
  switch (ent.schemeType) {
    case "Turnover Discount":
      return "TURNOVER_BASED";
    case "Cash Discount":
    case "Payment Discount":
      return "PAYMENT_BASED";
    case "Near Expiry Discount":
      return "NEAR_EXPIRY";
    case "Festive Discount":
    case "Loyalty Discount":
      return "PERIOD_PROMOTIONAL";
    default:
      if (/quantity|monsoon|volume/i.test(ent.schemeName + ent.calculationBasis)) {
        return "QUANTITY_BASED";
      }
      return "PERIOD_PROMOTIONAL";
  }
}

export function getEntitlementIncludedRecords(
  ent: SchemeClaimDisplaySource,
): SchemeClaimIncludedRecord[] {
  if (ent.includedRecords?.length) {
    return ent.includedRecords.filter((r) => r.eligibilityStatus === "Eligible");
  }
  return ent.invoiceBreakdown
    .filter((b) => b.includedInCalculation)
    .map((b) => breakdownToIncludedRecord(b));
}

export function getEntitlementExcludedRecords(
  ent: SchemeClaimDisplaySource,
): SchemeClaimExcludedRecord[] {
  if (ent.excludedRecords?.length) return ent.excludedRecords;
  return ent.invoiceBreakdown
    .filter((b) => !b.includedInCalculation)
    .map((b) => ({
      invoiceId: b.invoiceId,
      invoiceNumber: b.invoiceNo,
      exclusionReason: b.exclusionReason?.trim() || "Excluded from calculation",
    }));
}

function breakdownToIncludedRecord(
  b: SchemeClaimLegacyBreakdownRow,
): SchemeClaimIncludedRecord {
  return {
    invoiceId: b.invoiceId,
    invoiceNumber: b.invoiceNo,
    invoiceDate: b.invoiceDate,
    taxableValue: b.taxableValue,
    eligibilityStatus: "Eligible",
    eligibilityReason: "",
  };
}

export function groupIncludedRecordsByInvoice(
  records: SchemeClaimIncludedRecord[],
): SchemeClaimInvoiceSummary[] {
  const byInvoice = new Map<number, SchemeClaimIncludedRecord[]>();
  for (const row of records) {
    const list = byInvoice.get(row.invoiceId) ?? [];
    list.push(row);
    byInvoice.set(row.invoiceId, list);
  }
  return Array.from(byInvoice.entries()).map(([invoiceId, lines]) => {
    const eligibleLines = lines.filter((l) => l.eligibilityStatus === "Eligible");
    const first = lines[0];
    return {
      invoiceId,
      invoiceNumber: first.invoiceNumber,
      invoiceDate: first.invoiceDate,
      totalLines: lines.length,
      eligibleLines: eligibleLines.length,
      eligibleQuantity: eligibleLines.reduce(
        (s, l) => s + (l.eligibleQuantity ?? l.invoicedQuantity ?? 0),
        0,
      ),
      eligibleTaxableValue: eligibleLines.reduce((s, l) => s + l.taxableValue, 0),
      calculatedBenefit: eligibleLines.reduce(
        (s, l) => s + (l.calculatedBenefit ?? 0),
        0,
      ),
      lines,
    };
  });
}

export function daysBetweenIso(start: string, end: string): number | undefined {
  if (!start || !end) return undefined;
  const a = new Date(start);
  const b = new Date(end);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return undefined;
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function migrateSchemeClaimFields<T extends SchemeClaimDisplaySource>(
  ent: T,
): T {
  let next = { ...ent } as T;

  if (!next.claimNumber?.trim()) {
    next = { ...next, claimNumber: next.schemeCode || next.id };
  }
  if (!next.calculationType) {
    next = { ...next, calculationType: getEntitlementCalculationType(next) };
  }
  if (next.creditNoteAmount == null) {
    next = { ...next, creditNoteAmount: next.calculatedBenefit };
  }
  if (!next.settlementPeriodStart) {
    next = { ...next, settlementPeriodStart: next.periodStart };
  }
  if (!next.settlementPeriodEnd) {
    next = { ...next, settlementPeriodEnd: next.periodEnd };
  }

  if (!next.includedRecords?.length && next.invoiceBreakdown.length > 0) {
    next = {
      ...next,
      includedRecords: next.invoiceBreakdown.map((b) => ({
        invoiceId: b.invoiceId,
        invoiceNumber: b.invoiceNo,
        invoiceDate: b.invoiceDate,
        taxableValue: b.taxableValue,
        eligibilityStatus: b.includedInCalculation
          ? ("Eligible" as const)
          : ("Excluded" as const),
        eligibilityReason: b.exclusionReason || undefined,
      })),
    };
  }

  if (!next.excludedRecords?.length) {
    const excluded = next.invoiceBreakdown.filter((b) => !b.includedInCalculation);
    if (excluded.length > 0) {
      next = {
        ...next,
        excludedRecords: excluded.map((b) => ({
          invoiceId: b.invoiceId,
          invoiceNumber: b.invoiceNo,
          exclusionReason: b.exclusionReason?.trim() || "Excluded from calculation",
        })),
      };
    }
  }

  if (!next.ruleApplied) {
    next = { ...next, ruleApplied: deriveRuleAppliedFromLegacy(next) };
  }

  return next;
}

function deriveRuleAppliedFromLegacy(
  ent: SchemeClaimDisplaySource,
): SchemeClaimRuleApplied {
  const calcType = getEntitlementCalculationType(ent);
  const rate =
    ent.discountType === "Percentage"
      ? `${ent.discountRate}%`
      : ent.discountRate;

  const base: SchemeClaimRuleApplied = {
    appliedRate: rate,
    calculationBasis: ent.calculationBasis,
    eligibleTaxableValue: ent.eligibleBaseAmount,
    displaySummary: ent.calculationBasis,
  };

  if (calcType === "TURNOVER_BASED") {
    return {
      ...base,
      eligibleTurnover: ent.eligibleBaseAmount,
      excludedTurnover: ent.excludedSchemeAmount + ent.otherExclusionAmount,
      appliedSlab: ent.appliedSlab,
    };
  }

  if (calcType === "PAYMENT_BASED") {
    const rcptDate = refFromSupporting(ent, "Receipt Date") || undefined;
    const invDate =
      ent.includedRecords?.[0]?.invoiceDate ??
      ent.invoiceBreakdown.find((b) => b.includedInCalculation)?.invoiceDate;
    return {
      ...base,
      invoiceDate: invDate,
      dueDate: refFromSupporting(ent, "Due Date") || undefined,
      receiptDate: rcptDate,
      receiptNumber: refFromSupporting(ent, "Receipt Voucher") || undefined,
      actualPaymentDays:
        invDate && rcptDate ? daysBetweenIso(invDate, rcptDate) : undefined,
      eligiblePaidAmount: ent.eligibleBaseAmount,
      paymentStatus: "Full",
    };
  }

  if (calcType === "NEAR_EXPIRY") {
    const eligibleLines = getEntitlementIncludedRecords(ent);
    return {
      ...base,
      eligibleLineCount: eligibleLines.length,
      referenceDate: refFromSupporting(ent, "Expiry Date") || undefined,
    };
  }

  return base;
}

function refFromSupporting(ent: SchemeClaimDisplaySource, label: string): string {
  const hit = ent.supportingReferences.find(
    (r) => r.label.toLowerCase() === label.toLowerCase(),
  );
  return hit?.value?.trim() ?? "";
}

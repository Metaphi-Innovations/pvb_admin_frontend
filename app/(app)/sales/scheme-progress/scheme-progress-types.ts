/**
 * Sales — Scheme Progress (operational dashboard).
 * Read-only aggregation of schemes, customers, invoices, and returns.
 * Does NOT create Credit Notes or post accounting.
 */

export type SchemeProgressStatus =
  | "Running"
  | "Target Achieved"
  | "Settled"
  | "Expired"
  | "Cancelled";

export type SchemeProgressSettlementHint =
  | "none"
  | "pending_settlement"
  | "settlement_generated";

export type SchemeProgressSlabState = "completed" | "current" | "upcoming";

export interface SchemeProgressSlabView {
  fromTurnover: number;
  toTurnover: number | null;
  benefitPercent: number;
  label: string;
  state: SchemeProgressSlabState;
  progressAmount?: number;
  needAmount?: number;
}

export interface SchemeProgressInvoiceRow {
  invoiceId: number;
  invoiceNo: string;
  invoiceDate: string;
  invoiceAmount: number;
  taxableValue: number;
  salesReturnAmount: number;
  eligible: boolean;
  excluded: boolean;
  reason: string;
  schemeApplied: string;
  status: string;
}

export interface SchemeProgressReturnRow {
  returnId: string;
  invoiceNo: string;
  returnedQty: string;
  returnAmount: number;
  returnDate: string;
  adjustedTurnover: number;
}

export interface SchemeProgressExclusionRow {
  invoiceNo: string;
  reason: string;
  excludedAmount: number;
}

export interface SchemeProgressRow {
  id: string;
  customerId: number | null;
  customerName: string;
  customerCode: string;
  customerType: string;
  schemeId: string;
  schemeCode: string;
  schemeName: string;
  schemeType: string;
  periodStart: string;
  periodEnd: string;
  periodReference: string;
  salesperson: string;
  territory: string;
  region: string;
  financialYear: string;
  invoiceCount: number;
  currentTurnover: number;
  excludedTurnover: number;
  salesReturnAmount: number;
  eligibleTurnover: number;
  currentSlabLabel: string;
  nextSlabLabel: string;
  gapToNextSlab: number;
  currentRate: number;
  projectedCreditNote: number;
  achievementPct: number;
  status: SchemeProgressStatus;
  settlementHint: SchemeProgressSettlementHint;
  slabs: SchemeProgressSlabView[];
  invoices: SchemeProgressInvoiceRow[];
  returns: SchemeProgressReturnRow[];
  exclusions: SchemeProgressExclusionRow[];
}

export function formatProgressMoney(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 10000000) {
    const cr = abs / 10000000;
    return `${sign}₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  if (abs >= 100000) {
    const L = abs / 100000;
    return `${sign}₹${L % 1 === 0 ? L.toFixed(0) : L.toFixed(2)} L`;
  }
  return (
    sign +
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(abs)
  );
}

export function formatSlabRange(from: number, to: number | null): string {
  if (to == null) return `${formatProgressMoney(from)}+`;
  return `${formatProgressMoney(from)} – ${formatProgressMoney(to)}`;
}

import type { BankCategorization } from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-data";
import {
  getAdjustmentType,
  type BankReconAdjustmentRow,
} from "@/lib/accounts/bank-recon-adjustments";

export type ReconUiStatus = "uncategorized" | "partial" | "matched";

export interface InvoiceAllocationInput {
  invoiceId: number;
  outstanding: number;
  grandTotal: number;
  taxableAmount: number;
  taxAmount: number;
  appliedAmount: number;
}

export interface ReconciliationBreakdown {
  bankAmount: number;
  documentCashApplied: number;
  documentOutstandingTarget: number;
  documentShortfall: number;
  shortfallAdjustments: number;
  surplusAdjustments: number;
  totalAccounted: number;
  bankUnaccounted: number;
  documentUnsettled: number;
}

export interface ReconciliationValidationResult {
  status: ReconUiStatus;
  canSave: boolean;
  canReconcile: boolean;
  error: string | null;
  breakdown: ReconciliationBreakdown;
}

const AMOUNT_TOLERANCE = 0.01;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sumAmounts(values: number[]): number {
  return round2(values.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0));
}

export function computeInvoiceTaxBreakup(
  appliedAmount: number,
  outstanding: number,
  grandTotal: number,
  taxableAmount: number,
  taxAmount: number,
): { taxableApplied: number; taxApplied: number } {
  if (appliedAmount <= 0 || grandTotal <= 0) {
    return { taxableApplied: 0, taxApplied: 0 };
  }

  const settleRatio = Math.min(1, appliedAmount / outstanding);
  const fullSettle = Math.abs(appliedAmount - outstanding) <= AMOUNT_TOLERANCE;

  if (fullSettle && Math.abs(outstanding - grandTotal) <= AMOUNT_TOLERANCE) {
    return { taxableApplied: taxableAmount, taxApplied: taxAmount };
  }

  const ratio = appliedAmount / grandTotal;
  return {
    taxableApplied: round2(taxableAmount * ratio),
    taxApplied: round2(taxAmount * ratio),
  };
}

export function validateDocumentReconciliation(input: {
  bankAmount: number;
  direction: "receipt" | "payment";
  category: BankCategorization | "";
  allocations: InvoiceAllocationInput[];
  adjustments: BankReconAdjustmentRow[];
  directLedgerId?: number | null;
  requiresDocument?: boolean;
}): ReconciliationValidationResult {
  const {
    bankAmount,
    direction,
    category,
    allocations,
    adjustments,
    directLedgerId,
    requiresDocument = false,
  } = input;

  const activeAllocations = allocations.filter((a) => a.appliedAmount > 0.009);
  const documentCashApplied = sumAmounts(activeAllocations.map((a) => a.appliedAmount));

  const documentOutstandingTarget = sumAmounts(
    activeAllocations.map((a) => a.outstanding),
  );

  const documentShortfall = round2(
    Math.max(0, documentOutstandingTarget - documentCashApplied),
  );

  const shortfallAdjustments = round2(
    adjustments
      .filter((a) => getAdjustmentType(a.adjustmentTypeId)?.resolvesDocumentShortfall)
      .reduce((s, a) => s + a.amount, 0),
  );

  const surplusAdjustments = round2(
    adjustments
      .filter((a) => getAdjustmentType(a.adjustmentTypeId)?.absorbsBankSurplus)
      .reduce((s, a) => s + a.amount, 0),
  );

  const bankSurplus = round2(Math.max(0, bankAmount - documentCashApplied));
  const bankUnaccounted = round2(Math.max(0, bankAmount - documentCashApplied - surplusAdjustments));

  const documentUnsettled = round2(Math.max(0, documentShortfall - shortfallAdjustments));

  const totalAccounted = round2(documentCashApplied + shortfallAdjustments + surplusAdjustments);

  const breakdown: ReconciliationBreakdown = {
    bankAmount,
    documentCashApplied,
    documentOutstandingTarget,
    documentShortfall,
    shortfallAdjustments,
    surplusAdjustments,
    totalAccounted,
    bankUnaccounted,
    documentUnsettled,
  };

  const isDirectCategory =
    category === "expense" ||
    category === "bank_charges" ||
    category === "interest_income" ||
    category === "employee_claim_payment" ||
    category === "transfer";

  if (isDirectCategory) {
    const hasLedger = !!directLedgerId;
    const status: ReconUiStatus = hasLedger ? "matched" : "uncategorized";
    return {
      status,
      canSave: hasLedger,
      canReconcile: hasLedger,
      error: hasLedger ? null : "Select an account before saving.",
      breakdown,
    };
  }

  if (documentCashApplied <= 0 && adjustments.length === 0) {
    return {
      status: "uncategorized",
      canSave: false,
      canReconcile: false,
      error: requiresDocument ? "Select and apply amount to invoice/bill." : null,
      breakdown,
    };
  }

  let error: string | null = null;

  if (documentCashApplied > bankAmount + AMOUNT_TOLERANCE) {
    error = "Applied amount exceeds bank transaction amount.";
  } else if (bankUnaccounted > AMOUNT_TOLERANCE) {
    error =
      "Amount is not fully accounted. Please map the remaining difference before reconciliation.";
  } else if (documentUnsettled > AMOUNT_TOLERANCE) {
    error =
      "Amount is not fully accounted. Please map the remaining difference before reconciliation.";
  } else if (bankSurplus > AMOUNT_TOLERANCE && surplusAdjustments <= AMOUNT_TOLERANCE) {
    error =
      "Amount is not fully accounted. Please map the remaining difference before reconciliation.";
  }

  for (const adj of adjustments) {
    if (!adj.ledgerId || adj.amount <= 0) {
      error = "Each adjustment must have a type, ledger, and amount.";
      break;
    }
  }

  const fullyAccounted =
    !error &&
    bankUnaccounted <= AMOUNT_TOLERANCE &&
    documentUnsettled <= AMOUNT_TOLERANCE &&
    (documentCashApplied > 0 || adjustments.length > 0);

  const status: ReconUiStatus = fullyAccounted
    ? "matched"
    : documentCashApplied > 0 || adjustments.length > 0
      ? "partial"
      : "uncategorized";

  return {
    status,
    canSave: fullyAccounted,
    canReconcile: fullyAccounted,
    error: fullyAccounted ? null : error,
    breakdown,
  };
}

export function mapUiStatusToMatchStatus(
  status: ReconUiStatus,
): "unmatched" | "partial" | "matched" {
  if (status === "matched") return "matched";
  if (status === "partial") return "partial";
  return "unmatched";
}

export const RECON_VALIDATION_ERROR =
  "Amount is not fully accounted. Please map the remaining difference before reconciliation.";

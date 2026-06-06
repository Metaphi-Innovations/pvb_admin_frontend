import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import type { ClaimApprovalTrailEntry, ClaimAttachment } from "@/app/(app)/hr/claims/tada/tada-claim-data";
import type { PaymentMode } from "./expense-data";
import {
  addPaymentInstallment,
  cancelCompanyPayment,
  computePaymentTabCounts as computeCompanyTabCounts,
  filterCompanyPayments,
  getCompanyPaymentById,
  loadAccountPaymentsFromCompany,
  loadCompanyPayments,
  type PaymentExecutionStatus,
} from "../payments/payments-data";

export type FinancePaymentStatus = PaymentExecutionStatus;

export interface AccountPaymentRecord {
  id: number;
  referenceNo: string;
  sourceModule: "hr_tada_claim" | "hr_expense" | "mobile_expense";
  sourceModuleLabel: string;
  hrClaimId: number | null;
  employeeName: string;
  employeeCode: string;
  department: string;
  claimDate: string;
  categoryName: string;
  description: string;
  claimedAmount: number;
  approvedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  pendingPaymentAmount: number;
  paymentStatus: FinancePaymentStatus;
  paymentMode?: PaymentMode;
  paymentDate?: string;
  paymentReferenceNo?: string;
  paymentRemarks?: string;
  approvedBy?: string;
  paidBy?: string;
  approvalTrail: ClaimApprovalTrailEntry[];
  attachments: ClaimAttachment[];
  approvalRemarks?: string;
  createdAt: string;
  updatedAt: string;
}

export function getRejectedAmount(rec: AccountPaymentRecord): number {
  return Math.max(0, rec.claimedAmount - rec.approvedAmount);
}

export function getPendingPaymentAmount(rec: AccountPaymentRecord): number {
  return Math.max(0, rec.approvedAmount - rec.paidAmount);
}

export function computeRemaining(rec: AccountPaymentRecord): number {
  return getPendingPaymentAmount(rec);
}

export function derivePaymentStatus(
  approvedAmount: number,
  paidAmount: number,
  cancelled?: boolean,
): FinancePaymentStatus {
  if (cancelled) return "cancelled";
  if (approvedAmount <= 0) return "payment_pending";
  if (paidAmount <= 0) return "payment_pending";
  if (paidAmount >= approvedAmount) return "payment_done";
  if (paidAmount > 0 && paidAmount < approvedAmount) return "partially_paid";
  return "payment_pending";
}

export function normalizePaymentRecord(rec: AccountPaymentRecord): AccountPaymentRecord {
  const pendingPaymentAmount = getPendingPaymentAmount(rec);
  const paymentStatus = derivePaymentStatus(
    rec.approvedAmount,
    rec.paidAmount,
    rec.paymentStatus === "cancelled",
  );
  return {
    ...rec,
    pendingPaymentAmount,
    remainingAmount: pendingPaymentAmount,
    paymentStatus,
  };
}

export function loadAccountPayments(): AccountPaymentRecord[] {
  return loadAccountPaymentsFromCompany().map(normalizePaymentRecord);
}

/** @deprecated Bulk save — installments are persisted via payments-data APIs */
export function saveAccountPayments(_records: AccountPaymentRecord[]): void {
  // No-op: markPaymentPaid / cancelPaymentRecord update company payments directly.
}

export function getPaymentById(id: number): AccountPaymentRecord | undefined {
  const cp = getCompanyPaymentById(id);
  if (!cp) return undefined;
  const list = loadAccountPayments();
  return list.find((p) => p.id === id);
}

export interface PaymentListFilters {
  tab: string;
  search: string;
  source: string;
  dateFrom: string;
  dateTo: string;
}

export function tabMatchesPayment(rec: AccountPaymentRecord, tab: string): boolean {
  const pending = getPendingPaymentAmount(rec);
  const { paidAmount, approvedAmount } = rec;
  if (tab === "all") return rec.paymentStatus !== "cancelled";
  if (tab === "cancelled") return rec.paymentStatus === "cancelled";
  if (tab === "payment_pending") return pending > 0 && paidAmount === 0;
  if (tab === "partially_paid") return paidAmount > 0 && paidAmount < approvedAmount;
  if (tab === "payment_done") return approvedAmount > 0 && paidAmount >= approvedAmount;
  return true;
}

export function filterPayments(
  records: AccountPaymentRecord[],
  filters: PaymentListFilters,
): AccountPaymentRecord[] {
  const company = loadCompanyPayments();
  const filtered = filterCompanyPayments(company, {
    tab: filters.tab,
    search: filters.search,
    paymentMode: "all",
    sourceType: filters.source === "all" ? "all" : filters.source === "hr_tada_claim" ? "tada_claim" : filters.source,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    statusFilter: "all",
  });
  const ids = new Set(filtered.map((f) => f.id));
  return records.map(normalizePaymentRecord).filter((r) => ids.has(r.id));
}

export function computePaymentTabCounts(records: AccountPaymentRecord[]): Record<string, number> {
  return computeCompanyTabCounts(loadCompanyPayments());
}

export function markPaymentPaid(
  record: AccountPaymentRecord,
  payload: {
    paymentDate: string;
    paymentMode: PaymentMode;
    paymentReferenceNo: string;
    paidAmount: number;
    paymentRemarks: string;
  },
): AccountPaymentRecord {
  addPaymentInstallment(record.id, {
    paymentDate: payload.paymentDate,
    amount: payload.paidAmount,
    paymentMode: payload.paymentMode,
    paymentReferenceNo: payload.paymentReferenceNo,
    remarks: payload.paymentRemarks,
  });
  return getPaymentById(record.id)!;
}

export function cancelPaymentRecord(record: AccountPaymentRecord): AccountPaymentRecord {
  cancelCompanyPayment(record.id);
  return getPaymentById(record.id)!;
}

export function getPaymentActions(rec: AccountPaymentRecord): ("view" | "mark_paid")[] {
  const pending = getPendingPaymentAmount(rec);
  if (rec.paymentStatus !== "cancelled" && pending > 0) {
    return ["view", "mark_paid"];
  }
  return ["view"];
}

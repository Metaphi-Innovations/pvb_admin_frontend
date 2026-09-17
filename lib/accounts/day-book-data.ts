/**
 * Shared Day Book types and financial-year helpers.
 * Report rows come from the Day Book API, not local vouchers.
 */

import {
  ensureFinancialYearsCurrent,
  loadFinancialYears,
} from "@/app/(app)/accounts/masters/masters-data";
import { demoFinancialYearStart } from "@/lib/accounts/demo-date-utils";

export type DayBookVoucherType =
  | "sales_invoice"
  | "purchase_invoice"
  | "journal"
  | "receipt"
  | "payment"
  | "contra"
  | "credit_note"
  | "debit_note";

export type DayBookStatus = "posted";

export interface DayBookLedgerLine {
  id: string;
  ledgerId: number | null;
  ledgerName: string;
  particulars: string;
  narration: string;
  debit: number;
  credit: number;
  lineOrder: number;
  voucherId: number;
  generalLedgerHref: string;
}

export interface DayBookVoucherGroup {
  id: string;
  voucherId: number;
  sourceId: number;
  date: string;
  voucherNo: string;
  voucherType: DayBookVoucherType;
  voucherTypeLabel: string;
  partyLedger: string;
  narration: string;
  lines: DayBookLedgerLine[];
  totalDebit: number;
  totalCredit: number;
  isUnbalanced: boolean;
  createdBy: string;
  status: DayBookStatus;
  branch: string;
  financialYearId: number | null;
  financialYearName: string;
  viewHref: string;
  createdAt: string;
}

export const DAY_BOOK_VOUCHER_TYPE_OPTIONS: { value: DayBookVoucherType | "all"; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "sales_invoice", label: "Sales Invoice" },
  { value: "purchase_invoice", label: "Purchase Invoice" },
  { value: "receipt", label: "Receipt Voucher" },
  { value: "payment", label: "Payment Voucher" },
  { value: "journal", label: "Journal Voucher" },
  { value: "contra", label: "Contra Voucher" },
  { value: "credit_note", label: "Credit Note" },
  { value: "debit_note", label: "Debit Note" },
];

export function getActiveFinancialYearId(): number | null {
  return loadFinancialYears().find((fy) => fy.status === "active")?.id ?? null;
}

/** Default FY + date range used by reports that still resolve the active year locally. */
export function defaultDayBookFyDateRange(ref = new Date()): {
  from: string;
  to: string;
  fyId: string;
} {
  ensureFinancialYearsCurrent(ref);
  const activeFyId = getActiveFinancialYearId();
  const fy = loadFinancialYears().find((f) => f.id === activeFyId);
  const today = ref.toISOString().slice(0, 10);
  if (!fy) {
    return { from: demoFinancialYearStart(ref), to: today, fyId: "all" };
  }
  return {
    from: fy.startDate,
    to: today < fy.endDate ? today : fy.endDate,
    fyId: String(fy.id),
  };
}

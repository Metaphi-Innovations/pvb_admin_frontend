/**
 * Bank reconciliation Step 5 — categorization types.
 */

export type BankReconDepositCategory =
  | "customer_receipt"
  | "customer_advance"
  | "vendor_refund"
  | "interest_income"
  | "loan_received"
  | "capital_introduced"
  | "gst_refund"
  | "tds_refund"
  | "other_income"
  | "other_receipt";

export type BankReconWithdrawalCategory =
  | "vendor_payment"
  | "expense"
  | "employee_payment"
  | "bank_charges"
  | "interest_expense"
  | "gst_payment"
  | "tds_payment"
  | "loan_repayment"
  | "customer_refund"
  | "bank_transfer"
  | "other_payment";

export type BankReconCategorizeCategory = BankReconDepositCategory | BankReconWithdrawalCategory;

export type GstTaxComponent = "CGST" | "SGST" | "IGST" | "CESS";

export type AdvanceHandling = "keep_advance" | "apply_later";

export interface CategorizeAllocationLine {
  invoiceId?: number;
  billId?: number;
  amount: number;
  documentNo?: string;
}

export interface BankReconCategorizeFormInput {
  statementTransactionId: string;
  bankAccountId: string;
  category: BankReconCategorizeCategory;
  /** Receipt / payment date (defaults to statement date) */
  transactionDate: string;
  referenceNo?: string;
  narration?: string;
  remarks?: string;
  /** Customer master id */
  customerId?: number | null;
  /** Vendor master id */
  vendorId?: number | null;
  /** COA ledger for income/expense/GST/TDS/loan/capital/other */
  ledgerId?: number | null;
  /** Transfer destination bank ledger */
  toBankLedgerId?: number | null;
  /** Gross receipt/payment amount (customer/vendor side) */
  accountAmount: number;
  /** Net bank statement amount (may differ when bank charges apply) */
  bankAmount: number;
  bankChargesAmount?: number;
  bankChargesLedgerId?: number | null;
  tdsAmount?: number;
  tdsSectionMasterId?: number | null;
  tdsLedgerId?: number | null;
  gstComponent?: GstTaxComponent;
  challanNo?: string;
  gstPeriod?: string;
  tdsFinancialYear?: string;
  tdsQuarter?: string;
  tdsNature?: string;
  costCentre?: string;
  department?: string;
  advanceHandling?: AdvanceHandling;
  allocations?: CategorizeAllocationLine[];
}

export interface AccountingPreviewLine {
  ledgerName: string;
  debit: number;
  credit: number;
  note?: string;
}

export interface CategorizeResult {
  ok: boolean;
  error?: string;
  voucherId?: number;
  voucherNumber?: string;
  voucherType?: string;
}

export interface CategorizeAuditEntry {
  id: string;
  timestamp: string;
  user: string;
  bankAccountId: string;
  statementTransactionId: string;
  action: string;
  category?: string;
  voucherNumber?: string;
  details?: string;
  reason?: string;
}

export const DEPOSIT_CATEGORIZE_OPTIONS: { value: BankReconDepositCategory; label: string }[] = [
  { value: "customer_receipt", label: "Customer Receipt" },
  { value: "customer_advance", label: "Customer Advance" },
  { value: "vendor_refund", label: "Vendor Refund" },
  { value: "interest_income", label: "Interest Income" },
  { value: "loan_received", label: "Loan Received" },
  { value: "capital_introduced", label: "Capital Introduced" },
  { value: "gst_refund", label: "GST Refund" },
  { value: "tds_refund", label: "TDS Refund" },
  { value: "other_income", label: "Other Income" },
  { value: "other_receipt", label: "Other Receipt" },
];

export const WITHDRAWAL_CATEGORIZE_OPTIONS: { value: BankReconWithdrawalCategory; label: string }[] = [
  { value: "vendor_payment", label: "Vendor Payment" },
  { value: "expense", label: "Expense" },
  { value: "employee_payment", label: "Employee Payment" },
  { value: "bank_charges", label: "Bank Charges" },
  { value: "interest_expense", label: "Interest Expense" },
  { value: "gst_payment", label: "GST Payment" },
  { value: "tds_payment", label: "TDS Payment" },
  { value: "loan_repayment", label: "Loan Repayment" },
  { value: "customer_refund", label: "Customer Refund" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other_payment", label: "Other Payment" },
];

export function categorizeCategoryLabel(cat: BankReconCategorizeCategory | ""): string {
  if (!cat) return "—";
  const all = [...DEPOSIT_CATEGORIZE_OPTIONS, ...WITHDRAWAL_CATEGORIZE_OPTIONS];
  return all.find((o) => o.value === cat)?.label ?? cat;
}

export function isDepositCategory(cat: BankReconCategorizeCategory): boolean {
  return DEPOSIT_CATEGORIZE_OPTIONS.some((o) => o.value === cat);
}

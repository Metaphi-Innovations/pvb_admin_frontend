/**
 * Manual bank transaction types and constants — Step 3.
 */

export type ManualEntryStatus = "Draft" | "Recorded" | "Cancelled";

export type ReferenceStatus = "Pending" | "Available";

export type ManualTransactionDirection = "Deposit" | "Withdrawal";

export type ManualPartyType =
  | "Customer"
  | "Vendor"
  | "Employee"
  | "Bank"
  | "Government"
  | "Expense Ledger"
  | "Income Ledger"
  | "Other Ledger"
  | "Unknown";

export type ExpectedVoucherType =
  | "Receipt Voucher"
  | "Payment Voucher"
  | "Contra Voucher"
  | "Journal Voucher"
  | "Customer Receipt"
  | "Vendor Payment"
  | "Expense"
  | "Income"
  | "Bank Charges"
  | "Interest"
  | "GST Payment"
  | "TDS Payment"
  | "Bank Transfer"
  | "Unknown";

export type TransactionMode =
  | "NEFT"
  | "RTGS"
  | "IMPS"
  | "UPI"
  | "Cheque"
  | "Cash Deposit"
  | "Demand Draft"
  | "Bank Transfer"
  | "ECS"
  | "NACH"
  | "Card"
  | "Other";

export interface ManualAttachmentMeta {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: "Deposit Slip" | "Cheque Copy" | "Payment Advice" | "Customer Email" | "Bank Acknowledgement" | "Other Supporting Document";
  uploadedBy: string;
  uploadedOn: string;
}

export interface ManualTransactionFormState {
  bankAccountId: string;
  direction: ManualTransactionDirection;
  transactionMode: TransactionMode;
  amount: string;
  currency: string;
  referenceNumber: string;
  utrNumber: string;
  transactionIdRef: string;
  chequeNumber: string;
  instrumentNumber: string;
  bankSlipNumber: string;
  externalReference: string;
  narration: string;
  partyType: ManualPartyType;
  partyLedger: string;
  expectedVoucherType: ExpectedVoucherType;
  existingVoucherRef: string;
  customerVendorRef: string;
  invoiceReference: string;
  purposeCategory: string;
  costCentre: string;
  bookDate: string;
  transactionDate: string;
  expectedClearingDate: string;
  chequeDate: string;
  depositedDate: string;
  drawerBank: string;
  drawerBranch: string;
  internalRemarks: string;
  bankNarration: string;
  followUpNote: string;
  attachments: ManualAttachmentMeta[];
}

export const TRANSACTION_MODE_OPTIONS: TransactionMode[] = [
  "NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash Deposit", "Demand Draft",
  "Bank Transfer", "ECS", "NACH", "Card", "Other",
];

export const PARTY_TYPE_OPTIONS: ManualPartyType[] = [
  "Customer", "Vendor", "Employee", "Bank", "Government",
  "Expense Ledger", "Income Ledger", "Other Ledger", "Unknown",
];

export const EXPECTED_VOUCHER_TYPE_OPTIONS: ExpectedVoucherType[] = [
  "Receipt Voucher", "Payment Voucher", "Contra Voucher", "Journal Voucher",
  "Customer Receipt", "Vendor Payment", "Expense", "Income", "Bank Charges",
  "Interest", "GST Payment", "TDS Payment", "Bank Transfer", "Unknown",
];

export const ATTACHMENT_CATEGORY_OPTIONS = [
  "Deposit Slip", "Cheque Copy", "Payment Advice", "Customer Email",
  "Bank Acknowledgement", "Other Supporting Document",
] as const;

export function emptyManualForm(bankAccountId = ""): ManualTransactionFormState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    bankAccountId,
    direction: "Deposit",
    transactionMode: "NEFT",
    amount: "",
    currency: "INR",
    referenceNumber: "",
    utrNumber: "",
    transactionIdRef: "",
    chequeNumber: "",
    instrumentNumber: "",
    bankSlipNumber: "",
    externalReference: "",
    narration: "",
    partyType: "Unknown",
    partyLedger: "",
    expectedVoucherType: "Unknown",
    existingVoucherRef: "",
    customerVendorRef: "",
    invoiceReference: "",
    purposeCategory: "",
    costCentre: "",
    bookDate: today,
    transactionDate: today,
    expectedClearingDate: "",
    chequeDate: "",
    depositedDate: "",
    drawerBank: "",
    drawerBranch: "",
    internalRemarks: "",
    bankNarration: "",
    followUpNote: "",
    attachments: [],
  };
}

export type DuplicateCheckResult =
  | { type: "none" }
  | { type: "exact"; existingId: string; summary: string }
  | { type: "possible"; existingId: string; summary: string; reason: string };

export function normalizeReferenceForCompare(ref: string): string {
  return ref.trim().toUpperCase().replace(/[\s\-/]/g, "");
}

export function hasBankReference(form: Pick<ManualTransactionFormState, "referenceNumber" | "utrNumber" | "transactionIdRef" | "chequeNumber">): boolean {
  return Boolean(
    form.referenceNumber.trim() ||
    form.utrNumber.trim() ||
    form.transactionIdRef.trim() ||
    form.chequeNumber.trim(),
  );
}

export function primaryReferenceDisplay(form: Pick<ManualTransactionFormState, "referenceNumber" | "utrNumber" | "transactionIdRef" | "chequeNumber">): string {
  return form.referenceNumber.trim() || form.utrNumber.trim() || form.transactionIdRef.trim() || form.chequeNumber.trim() || "";
}

/**
 * Bank Reconciliation v2 — UI-only demo data and types.
 * No reconciliation logic, posting, or backend integration in this phase.
 */

export type BankReconAccountType = "Current" | "Cash Credit" | "Overdraft" | "Savings";

export type BankReconAccountStatus =
  | "Reconciled"
  | "Partially Reconciled"
  | "Pending"
  | "Statement Not Uploaded";

export type BankReconTransactionSource =
  | "Manual"
  | "Statement Upload"
  | "Manual + Statement"
  | "Bank Feed";

export type BankReconMatchStatus =
  | "Matched"
  | "Suggested Match"
  | "Pending"
  | "Uncategorized"
  | "Possible Duplicate"
  | "Excluded";

export type BankReconVerificationStatus =
  | "Awaiting Statement"
  | "Verified"
  | "Verified Statement Entry"
  | "Review Required"
  | "Reference Pending"
  | "Duplicate Skipped"
  | "Not Applicable";

export interface BankReconActivityEvent {
  id: string;
  label: string;
  detail: string;
  actor: string;
  timestamp: string;
  tone: "blue" | "amber" | "emerald" | "slate" | "purple";
}

export interface BankReconRelatedRecord {
  voucherType: string;
  voucherNumber: string;
  customer: string;
  invoiceReference: string;
  matchConfidence: string;
  bookRowKey?: string;
  matchMethod?: string;
  matchedBy?: string;
  matchedOn?: string;
  bookDate?: string;
  partyLedger?: string;
  reference?: string;
  manualTransactionId?: string;
}

export interface BankReconBankAccount {
  id: string;
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  accountType: BankReconAccountType;
  bookBalance: number;
  statementBalance: number;
  pendingTransactions: number;
  lastReconciledDate: string | null;
  status: BankReconAccountStatus;
  statementPeriodFrom: string;
  statementPeriodTo: string;
  reconciledThisMonth: number;
  /** Last date covered by a successful statement import */
  lastStatementImportedUntil?: string | null;
}

export interface BankReconTransaction {
  id: string;
  bankAccountId: string;
  statementDate: string;
  valueDate: string;
  bookDate: string | null;
  reference: string;
  chequeNo: string | null;
  narration: string;
  partyLedger: string;
  deposit: number;
  withdrawal: number;
  source: BankReconTransactionSource;
  matchStatus: BankReconMatchStatus;
  verificationStatus: BankReconVerificationStatus;
  reconciliationDate: string | null;
  relatedRecord: BankReconRelatedRecord | null;
  activity: BankReconActivityEvent[];
  /** Step 3 manual fields (optional on statement-only rows) */
  manualTransactionNumber?: string | null;
  manualEntryStatus?: import("@/lib/accounts/bank-recon-manual-types").ManualEntryStatus | null;
  transactionMode?: import("@/lib/accounts/bank-recon-manual-types").TransactionMode | null;
  transactionDate?: string | null;
  expectedClearingDate?: string | null;
  utrNumber?: string | null;
  referenceStatus?: import("@/lib/accounts/bank-recon-manual-types").ReferenceStatus | null;
  expectedVoucherType?: import("@/lib/accounts/bank-recon-manual-types").ExpectedVoucherType | null;
  partyType?: string | null;
  internalRemarks?: string | null;
  bankNarration?: string | null;
  importedNarration?: string | null;
  followUpNote?: string | null;
  attachments?: import("@/lib/accounts/bank-recon-manual-types").ManualAttachmentMeta[];
  createdBy?: string | null;
  createdOn?: string | null;
  updatedBy?: string | null;
  updatedOn?: string | null;
  cancelReason?: string | null;
}

export function maskAccountNumber(accountNumber: string): string {
  const digits = accountNumber.replace(/\s/g, "");
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

export function computeAccountDifference(account: Pick<BankReconBankAccount, "bookBalance" | "statementBalance">): number {
  return Math.round((account.bookBalance - account.statementBalance) * 100) / 100;
}

export function computeListingSummary(accounts: BankReconBankAccount[]) {
  const totalBookBalance = accounts.reduce((s, a) => s + a.bookBalance, 0);
  const totalStatementBalance = accounts.reduce((s, a) => s + a.statementBalance, 0);
  const totalDifference = totalBookBalance - totalStatementBalance;
  const pendingReconciliation = accounts.reduce((s, a) => s + a.pendingTransactions, 0);
  const reconciledThisMonth = accounts.reduce((s, a) => s + a.reconciledThisMonth, 0);

  return {
    totalAccounts: accounts.length,
    totalBookBalance,
    totalStatementBalance,
    totalDifference,
    pendingReconciliation,
    reconciledThisMonth,
  };
}

export function computeWorkspaceSummary(
  account: BankReconBankAccount,
  transactions: BankReconTransaction[],
) {
  const difference = computeAccountDifference(account);
  const matched = transactions.filter((t) => t.matchStatus === "Matched");
  const pending = transactions.filter(
    (t) => t.matchStatus === "Pending" || t.matchStatus === "Suggested Match" || t.matchStatus === "Uncategorized",
  );
  const suggested = transactions.filter((t) => t.matchStatus === "Suggested Match");

  const reconciledAmount = matched.reduce(
    (s, t) => s + (t.deposit || t.withdrawal),
    0,
  );
  const pendingAmount = pending.reduce(
    (s, t) => s + (t.deposit || t.withdrawal),
    0,
  );

  return {
    bookBalance: account.bookBalance,
    statementBalance: account.statementBalance,
    difference,
    reconciledAmount,
    pendingAmount,
    pendingTransactions: account.pendingTransactions,
    suggestedMatches: suggested.length,
    statementPeriod: `${account.statementPeriodFrom} — ${account.statementPeriodTo}`,
  };
}

const DEMO_ACCOUNTS: BankReconBankAccount[] = [
  {
    id: "hdfc-current",
    bankName: "HDFC Bank",
    accountNickname: "HDFC Current Account",
    accountNumber: "50100123456789",
    accountType: "Current",
    bookBalance: 2847650.45,
    statementBalance: 2839120.45,
    pendingTransactions: 8,
    lastReconciledDate: "2026-06-28",
    status: "Partially Reconciled",
    statementPeriodFrom: "2026-06-01",
    statementPeriodTo: "2026-06-30",
    reconciledThisMonth: 142,
  },
  {
    id: "icici-collection",
    bankName: "ICICI Bank",
    accountNickname: "ICICI Collection Account",
    accountNumber: "006701234567",
    accountType: "Current",
    bookBalance: 956780.0,
    statementBalance: 956780.0,
    pendingTransactions: 3,
    lastReconciledDate: "2026-06-30",
    status: "Reconciled",
    statementPeriodFrom: "2026-06-01",
    statementPeriodTo: "2026-06-30",
    reconciledThisMonth: 87,
  },
  {
    id: "sbi-cash-credit",
    bankName: "State Bank of India",
    accountNickname: "SBI Cash Credit",
    accountNumber: "30012345678",
    accountType: "Cash Credit",
    bookBalance: 1250000.0,
    statementBalance: 1241850.0,
    pendingTransactions: 12,
    lastReconciledDate: "2026-05-31",
    status: "Pending",
    statementPeriodFrom: "2026-06-01",
    statementPeriodTo: "2026-06-30",
    reconciledThisMonth: 54,
  },
];

function activity(
  id: string,
  label: string,
  detail: string,
  actor: string,
  timestamp: string,
  tone: BankReconActivityEvent["tone"] = "slate",
): BankReconActivityEvent {
  return { id, label, detail, actor, timestamp, tone };
}

const DEMO_TRANSACTIONS: BankReconTransaction[] = [
  // HDFC — matched & varied
  {
    id: "txn-001",
    bankAccountId: "hdfc-current",
    statementDate: "2026-06-02",
    valueDate: "2026-06-02",
    bookDate: "2026-06-02",
    reference: "UTR HDFC240602001",
    chequeNo: null,
    narration: "NEFT CR — KRISHNA AGRO INPUTS PVT LTD — INV PYMT",
    partyLedger: "Krishna Agro Inputs Pvt Ltd",
    deposit: 185000,
    withdrawal: 0,
    source: "Statement Upload",
    matchStatus: "Matched",
    verificationStatus: "Verified",
    reconciliationDate: "2026-06-03",
    relatedRecord: {
      voucherType: "Receipt",
      voucherNumber: "RCP-2026-0142",
      customer: "Krishna Agro Inputs Pvt Ltd",
      invoiceReference: "SI-2026-0089",
      matchConfidence: "100% — Exact amount & reference",
    },
    activity: [
      activity("a1", "Statement Imported", "Line imported from June 2026 bank statement", "System", "2026-06-03 09:12", "blue"),
      activity("a2", "Auto Match Suggested", "Matched to Receipt RCP-2026-0142", "System", "2026-06-03 09:13", "amber"),
      activity("a3", "Reconciled", "Marked as matched by Finance User", "Priya Sharma", "2026-06-03 10:05", "emerald"),
    ],
  },
  {
    id: "txn-002",
    bankAccountId: "hdfc-current",
    statementDate: "2026-06-03",
    valueDate: "2026-06-03",
    bookDate: "2026-06-03",
    reference: "CHQ 482901",
    chequeNo: "482901",
    narration: "CHQ PAID — MAHARASHTRA SEEDS CORPORATION",
    partyLedger: "Maharashtra Seeds Corporation",
    deposit: 0,
    withdrawal: 245000,
    source: "Manual + Statement",
    matchStatus: "Matched",
    verificationStatus: "Verified",
    reconciliationDate: "2026-06-04",
    relatedRecord: {
      voucherType: "Payment",
      voucherNumber: "PAY-2026-0098",
      customer: "Maharashtra Seeds Corporation",
      invoiceReference: "PI-2026-0045",
      matchConfidence: "98% — Cheque no. matched",
    },
    activity: [
      activity("b1", "Manual Entry Created", "Payment voucher recorded in books", "Rajesh Kumar", "2026-06-03 14:20", "purple"),
      activity("b2", "Statement Line Matched", "Cheque 482901 cleared in statement", "System", "2026-06-04 08:00", "emerald"),
    ],
  },
  {
    id: "txn-003",
    bankAccountId: "hdfc-current",
    statementDate: "2026-06-05",
    valueDate: "2026-06-05",
    bookDate: null,
    reference: "UTR ICIC240605882",
    chequeNo: null,
    narration: "IMPS CR — GREENFIELD DISTRIBUTORS — PART PYMT",
    partyLedger: "Greenfield Distributors",
    deposit: 72500,
    withdrawal: 0,
    source: "Statement Upload",
    matchStatus: "Suggested Match",
    verificationStatus: "Review Required",
    reconciliationDate: null,
    relatedRecord: {
      voucherType: "Receipt",
      voucherNumber: "RCP-2026-0156",
      customer: "Greenfield Distributors",
      invoiceReference: "SI-2026-0112",
      matchConfidence: "87% — Amount within ₹500 tolerance",
    },
    activity: [
      activity("c1", "Statement Imported", "IMPS credit line from HDFC statement", "System", "2026-06-06 09:00", "blue"),
      activity("c2", "Match Suggested", "Possible match to RCP-2026-0156", "System", "2026-06-06 09:01", "amber"),
    ],
  },
  {
    id: "txn-004",
    bankAccountId: "hdfc-current",
    statementDate: "2026-06-06",
    valueDate: "2026-06-06",
    bookDate: "2026-06-06",
    reference: "",
    chequeNo: null,
    narration: "BANK CHARGES — MONTHLY A/C MAINTENANCE JUN-2026",
    partyLedger: "Bank Charges",
    deposit: 0,
    withdrawal: 590,
    source: "Bank Feed",
    matchStatus: "Pending",
    verificationStatus: "Awaiting Statement",
    reconciliationDate: null,
    relatedRecord: null,
    activity: [
      activity("d1", "Bank Feed Sync", "Charge synced from bank feed", "System", "2026-06-06 23:00", "blue"),
    ],
  },
  {
    id: "txn-005",
    bankAccountId: "hdfc-current",
    statementDate: "2026-06-07",
    valueDate: "2026-06-07",
    bookDate: null,
    reference: "NEFT CR REF 998877",
    chequeNo: null,
    narration: "NEFT CR — UNIDENTIFIED REMITTER — REF 998877",
    partyLedger: "—",
    deposit: 42000,
    withdrawal: 0,
    source: "Statement Upload",
    matchStatus: "Uncategorized",
    verificationStatus: "Review Required",
    reconciliationDate: null,
    relatedRecord: null,
    activity: [
      activity("e1", "Statement Imported", "Unidentified NEFT credit", "System", "2026-06-08 09:00", "blue"),
    ],
  },
  {
    id: "txn-006",
    bankAccountId: "hdfc-current",
    statementDate: "2026-06-08",
    valueDate: "2026-06-08",
    bookDate: "2026-06-08",
    reference: "GSTN CPIN 8829100022",
    chequeNo: null,
    narration: "GST PAYMENT — CGST SGST IGST — JUN-2026 RETURN",
    partyLedger: "GST Payable",
    deposit: 0,
    withdrawal: 312450,
    source: "Manual",
    matchStatus: "Matched",
    verificationStatus: "Verified",
    reconciliationDate: "2026-06-09",
    relatedRecord: {
      voucherType: "Payment",
      voucherNumber: "PAY-2026-0105",
      customer: "—",
      invoiceReference: "GSTR-3B Jun-2026",
      matchConfidence: "100% — CPIN matched",
    },
    activity: [
      activity("f1", "Manual Entry", "GST payment recorded", "Priya Sharma", "2026-06-08 16:30", "purple"),
      activity("f2", "Reconciled", "Matched with statement debit", "Priya Sharma", "2026-06-09 11:00", "emerald"),
    ],
  },
  {
    id: "txn-007",
    bankAccountId: "hdfc-current",
    statementDate: "2026-06-09",
    valueDate: "2026-06-09",
    bookDate: "2026-06-09",
    reference: "UTR HDFC240609331",
    chequeNo: null,
    narration: "NEFT CR — KRISHNA AGRO INPUTS PVT LTD — INV PYMT",
    partyLedger: "Krishna Agro Inputs Pvt Ltd",
    deposit: 185000,
    withdrawal: 0,
    source: "Statement Upload",
    matchStatus: "Possible Duplicate",
    verificationStatus: "Duplicate Skipped",
    reconciliationDate: null,
    relatedRecord: {
      voucherType: "Receipt",
      voucherNumber: "RCP-2026-0142",
      customer: "Krishna Agro Inputs Pvt Ltd",
      invoiceReference: "SI-2026-0089",
      matchConfidence: "92% — Same party & amount as txn-001",
    },
    activity: [
      activity("g1", "Duplicate Flagged", "Similar to reconciled entry on 02-Jun", "System", "2026-06-10 09:00", "amber"),
    ],
  },
  {
    id: "txn-008",
    bankAccountId: "hdfc-current",
    statementDate: "2026-06-10",
    valueDate: "2026-06-10",
    bookDate: null,
    reference: "INT CR JUN2026",
    chequeNo: null,
    narration: "CREDIT INTEREST FOR PERIOD 01-JUN-2026 TO 30-JUN-2026 ON SB/CC LINKED BALANCE",
    partyLedger: "Interest Received",
    deposit: 3842.5,
    withdrawal: 0,
    source: "Bank Feed",
    matchStatus: "Suggested Match",
    verificationStatus: "Review Required",
    reconciliationDate: null,
    relatedRecord: {
      voucherType: "Journal",
      voucherNumber: "JV-2026-0034",
      customer: "—",
      invoiceReference: "—",
      matchConfidence: "95% — Interest income voucher",
    },
    activity: [
      activity("h1", "Bank Feed Sync", "Interest credit received", "System", "2026-06-10 06:00", "blue"),
    ],
  },
  {
    id: "txn-009",
    bankAccountId: "hdfc-current",
    statementDate: "2026-06-12",
    valueDate: "2026-06-12",
    bookDate: "2026-06-11",
    reference: "RTGS HDFC240612001",
    chequeNo: null,
    narration: "RTGS DR — PUNJAB FERTILISERS LTD — VENDOR PAYMENT AGAINST PI-2026-0052 AND PI-2026-0053 COMBINED SETTLEMENT",
    partyLedger: "Punjab Fertilisers Ltd",
    deposit: 0,
    withdrawal: 567890,
    source: "Manual + Statement",
    matchStatus: "Matched",
    verificationStatus: "Verified",
    reconciliationDate: "2026-06-13",
    relatedRecord: {
      voucherType: "Payment",
      voucherNumber: "PAY-2026-0112",
      customer: "Punjab Fertilisers Ltd",
      invoiceReference: "PI-2026-0052, PI-2026-0053",
      matchConfidence: "100% — RTGS reference matched",
    },
    activity: [
      activity("i1", "Payment Recorded", "RTGS payment booked on 11-Jun", "Rajesh Kumar", "2026-06-11 15:00", "purple"),
      activity("i2", "Cleared in Statement", "Value date 12-Jun in statement", "System", "2026-06-13 08:00", "emerald"),
    ],
  },
  {
    id: "txn-010",
    bankAccountId: "hdfc-current",
    statementDate: "2026-06-15",
    valueDate: "2026-06-15",
    bookDate: null,
    reference: "",
    chequeNo: null,
    narration: "ATM CASH WDL — PUNE FC ROAD — REF MISSING IN FEED",
    partyLedger: "Petty Cash",
    deposit: 0,
    withdrawal: 10000,
    source: "Statement Upload",
    matchStatus: "Pending",
    verificationStatus: "Awaiting Statement",
    reconciliationDate: null,
    relatedRecord: null,
    activity: [
      activity("j1", "Statement Imported", "ATM withdrawal — no book entry yet", "System", "2026-06-16 09:00", "blue"),
    ],
  },
  // ICICI
  {
    id: "txn-011",
    bankAccountId: "icici-collection",
    statementDate: "2026-06-01",
    valueDate: "2026-06-01",
    bookDate: "2026-06-01",
    reference: "UPI/8829103344",
    chequeNo: null,
    narration: "UPI CR — FIELD AGENT COLLECTION — AHMEDNAGAR BEAT",
    partyLedger: "Cash Collections — Ahmednagar",
    deposit: 28500,
    withdrawal: 0,
    source: "Bank Feed",
    matchStatus: "Matched",
    verificationStatus: "Verified",
    reconciliationDate: "2026-06-02",
    relatedRecord: {
      voucherType: "Receipt",
      voucherNumber: "RCP-2026-0138",
      customer: "Various — Ahmednagar Beat",
      invoiceReference: "Beat Coll Jun-01",
      matchConfidence: "100%",
    },
    activity: [
      activity("k1", "Auto Reconciled", "UPI collection matched to daily beat receipt", "System", "2026-06-02 07:00", "emerald"),
    ],
  },
  {
    id: "txn-012",
    bankAccountId: "icici-collection",
    statementDate: "2026-06-04",
    valueDate: "2026-06-04",
    bookDate: "2026-06-04",
    reference: "NEFT ICIC240604112",
    chequeNo: null,
    narration: "NEFT CR — SHREE BALAJI TRADERS",
    partyLedger: "Shree Balaji Traders",
    deposit: 156000,
    withdrawal: 0,
    source: "Statement Upload",
    matchStatus: "Matched",
    verificationStatus: "Verified",
    reconciliationDate: "2026-06-05",
    relatedRecord: {
      voucherType: "Receipt",
      voucherNumber: "RCP-2026-0148",
      customer: "Shree Balaji Traders",
      invoiceReference: "SI-2026-0098",
      matchConfidence: "100%",
    },
    activity: [
      activity("l1", "Reconciled", "Customer receipt matched", "Priya Sharma", "2026-06-05 10:30", "emerald"),
    ],
  },
  {
    id: "txn-013",
    bankAccountId: "icici-collection",
    statementDate: "2026-06-08",
    valueDate: "2026-06-08",
    bookDate: null,
    reference: "TDS DEP 194Q",
    chequeNo: null,
    narration: "TDS DEPOSIT — SEC 194Q — Q1 FY 2026-27",
    partyLedger: "TDS Payable",
    deposit: 0,
    withdrawal: 18450,
    source: "Manual",
    matchStatus: "Pending",
    verificationStatus: "Not Applicable",
    reconciliationDate: null,
    relatedRecord: null,
    activity: [
      activity("m1", "Manual Entry", "TDS challan payment recorded — awaiting statement", "Rajesh Kumar", "2026-06-08 12:00", "purple"),
    ],
  },
  {
    id: "txn-014",
    bankAccountId: "icici-collection",
    statementDate: "2026-06-12",
    valueDate: "2026-06-12",
    bookDate: "2026-06-12",
    reference: "FT ICICI TO HDFC",
    chequeNo: null,
    narration: "INTERNAL FUND TRANSFER TO HDFC CURRENT A/C",
    partyLedger: "HDFC Current Account",
    deposit: 0,
    withdrawal: 500000,
    source: "Manual + Statement",
    matchStatus: "Matched",
    verificationStatus: "Verified",
    reconciliationDate: "2026-06-13",
    relatedRecord: {
      voucherType: "Contra",
      voucherNumber: "CTR-2026-0022",
      customer: "—",
      invoiceReference: "—",
      matchConfidence: "100% — Inter-bank transfer",
    },
    activity: [
      activity("n1", "Contra Posted", "Fund transfer to HDFC", "Priya Sharma", "2026-06-12 14:00", "purple"),
      activity("n2", "Reconciled", "Both legs matched", "System", "2026-06-13 08:00", "emerald"),
    ],
  },
  {
    id: "txn-015",
    bankAccountId: "icici-collection",
    statementDate: "2026-06-18",
    valueDate: "2026-06-18",
    bookDate: null,
    reference: "CHG SMS ALERTS",
    chequeNo: null,
    narration: "SMS ALERT CHARGES FOR Q1",
    partyLedger: "Bank Charges",
    deposit: 0,
    withdrawal: 118,
    source: "Bank Feed",
    matchStatus: "Excluded",
    verificationStatus: "Not Applicable",
    reconciliationDate: null,
    relatedRecord: null,
    activity: [
      activity("o1", "Excluded", "Marked as immaterial — will auto-post monthly", "Priya Sharma", "2026-06-19 09:00", "slate"),
    ],
  },
  {
    id: "txn-016",
    bankAccountId: "icici-collection",
    statementDate: "2026-06-22",
    valueDate: "2026-06-22",
    bookDate: null,
    reference: "UPI/9910234455",
    chequeNo: null,
    narration: "UPI CR — UNALLOCATED COLLECTION",
    partyLedger: "—",
    deposit: 12500,
    withdrawal: 0,
    source: "Statement Upload",
    matchStatus: "Uncategorized",
    verificationStatus: "Review Required",
    reconciliationDate: null,
    relatedRecord: null,
    activity: [
      activity("p1", "Needs Categorization", "Collection without customer mapping", "System", "2026-06-23 09:00", "amber"),
    ],
  },
  {
    id: "txn-017",
    bankAccountId: "icici-collection",
    statementDate: "2026-06-25",
    valueDate: "2026-06-25",
    bookDate: "2026-06-24",
    reference: "NEFT ICIC240625887",
    chequeNo: null,
    narration: "NEFT CR — VISTARA AGRO CHEMICALS",
    partyLedger: "Vistara Agro Chemicals",
    deposit: 89000,
    withdrawal: 0,
    source: "Statement Upload",
    matchStatus: "Suggested Match",
    verificationStatus: "Review Required",
    reconciliationDate: null,
    relatedRecord: {
      voucherType: "Receipt",
      voucherNumber: "RCP-2026-0168",
      customer: "Vistara Agro Chemicals",
      invoiceReference: "SI-2026-0120",
      matchConfidence: "91%",
    },
    activity: [
      activity("q1", "Match Suggested", "Amount matches open invoice balance", "System", "2026-06-26 09:00", "amber"),
    ],
  },
  // SBI Cash Credit
  {
    id: "txn-018",
    bankAccountId: "sbi-cash-credit",
    statementDate: "2026-06-02",
    valueDate: "2026-06-02",
    bookDate: "2026-06-02",
    reference: "DISB CC/8821",
    chequeNo: null,
    narration: "CASH CREDIT DISBURSEMENT — WORKING CAPITAL DRAW",
    partyLedger: "Cash Credit — SBI",
    deposit: 200000,
    withdrawal: 0,
    source: "Manual + Statement",
    matchStatus: "Matched",
    verificationStatus: "Verified",
    reconciliationDate: "2026-06-03",
    relatedRecord: {
      voucherType: "Journal",
      voucherNumber: "JV-2026-0028",
      customer: "—",
      invoiceReference: "—",
      matchConfidence: "100%",
    },
    activity: [
      activity("r1", "Disbursement Recorded", "CC limit drawdown booked", "Rajesh Kumar", "2026-06-02 11:00", "purple"),
      activity("r2", "Reconciled", "Matched with SBI statement", "System", "2026-06-03 08:00", "emerald"),
    ],
  },
  {
    id: "txn-019",
    bankAccountId: "sbi-cash-credit",
    statementDate: "2026-06-04",
    valueDate: "2026-06-04",
    bookDate: null,
    reference: "INT ON CC",
    chequeNo: null,
    narration: "INTEREST DEBITED ON CASH CREDIT LIMIT FOR MAY-2026",
    partyLedger: "Interest on Borrowings",
    deposit: 0,
    withdrawal: 12850,
    source: "Bank Feed",
    matchStatus: "Suggested Match",
    verificationStatus: "Review Required",
    reconciliationDate: null,
    relatedRecord: {
      voucherType: "Journal",
      voucherNumber: "JV-2026-0031",
      customer: "—",
      invoiceReference: "—",
      matchConfidence: "88%",
    },
    activity: [
      activity("s1", "Interest Accrued", "Monthly CC interest from bank feed", "System", "2026-06-04 06:00", "blue"),
    ],
  },
  {
    id: "txn-020",
    bankAccountId: "sbi-cash-credit",
    statementDate: "2026-06-06",
    valueDate: "2026-06-06",
    bookDate: null,
    reference: "",
    chequeNo: "334521",
    narration: "CHQ DEP — CUSTOMER PAYMENT — NO UTR IN STATEMENT",
    partyLedger: "—",
    deposit: 67500,
    withdrawal: 0,
    source: "Statement Upload",
    matchStatus: "Uncategorized",
    verificationStatus: "Awaiting Statement",
    reconciliationDate: null,
    relatedRecord: null,
    activity: [
      activity("t1", "Cheque Deposit", "Inward cheque — party unknown", "System", "2026-06-07 09:00", "blue"),
    ],
  },
  {
    id: "txn-021",
    bankAccountId: "sbi-cash-credit",
    statementDate: "2026-06-09",
    valueDate: "2026-06-09",
    bookDate: "2026-06-09",
    reference: "RTGS SBI240609001",
    chequeNo: null,
    narration: "RTGS DR — NATIONAL PESTICIDES LTD",
    partyLedger: "National Pesticides Ltd",
    deposit: 0,
    withdrawal: 425000,
    source: "Statement Upload",
    matchStatus: "Pending",
    verificationStatus: "Review Required",
    reconciliationDate: null,
    relatedRecord: null,
    activity: [
      activity("u1", "Statement Imported", "Vendor payment in statement — book entry pending approval", "System", "2026-06-10 09:00", "blue"),
    ],
  },
  {
    id: "txn-022",
    bankAccountId: "sbi-cash-credit",
    statementDate: "2026-06-11",
    valueDate: "2026-06-11",
    bookDate: "2026-06-10",
    reference: "NEFT SBI240611442",
    chequeNo: null,
    narration: "NEFT CR — SAHYADRI FARM SERVICES",
    partyLedger: "Sahyadri Farm Services",
    deposit: 98000,
    withdrawal: 0,
    source: "Manual + Statement",
    matchStatus: "Matched",
    verificationStatus: "Verified",
    reconciliationDate: "2026-06-12",
    relatedRecord: {
      voucherType: "Receipt",
      voucherNumber: "RCP-2026-0152",
      customer: "Sahyadri Farm Services",
      invoiceReference: "SI-2026-0105",
      matchConfidence: "100%",
    },
    activity: [
      activity("v1", "Receipt Posted", "Book date 10-Jun, value date 11-Jun", "Priya Sharma", "2026-06-10 16:00", "purple"),
      activity("v2", "Reconciled", "Cleared in SBI statement", "System", "2026-06-12 08:00", "emerald"),
    ],
  },
  {
    id: "txn-023",
    bankAccountId: "sbi-cash-credit",
    statementDate: "2026-06-14",
    valueDate: "2026-06-14",
    bookDate: null,
    reference: "PROC CHG CC",
    chequeNo: null,
    narration: "PROCESSING CHARGES — CASH CREDIT RENEWAL",
    partyLedger: "Bank Charges",
    deposit: 0,
    withdrawal: 2500,
    source: "Statement Upload",
    matchStatus: "Pending",
    verificationStatus: "Awaiting Statement",
    reconciliationDate: null,
    relatedRecord: null,
    activity: [
      activity("w1", "Statement Imported", "Renewal charges — categorize as expense", "System", "2026-06-15 09:00", "blue"),
    ],
  },
  {
    id: "txn-024",
    bankAccountId: "sbi-cash-credit",
    statementDate: "2026-06-16",
    valueDate: "2026-06-16",
    bookDate: "2026-06-16",
    reference: "UTR SBI240616778",
    chequeNo: null,
    narration: "NEFT CR — SAHYADRI FARM SERVICES",
    partyLedger: "Sahyadri Farm Services",
    deposit: 98000,
    withdrawal: 0,
    source: "Statement Upload",
    matchStatus: "Possible Duplicate",
    verificationStatus: "Duplicate Skipped",
    reconciliationDate: null,
    relatedRecord: {
      voucherType: "Receipt",
      voucherNumber: "RCP-2026-0152",
      customer: "Sahyadri Farm Services",
      invoiceReference: "SI-2026-0105",
      matchConfidence: "94% — Possible duplicate of txn-022",
    },
    activity: [
      activity("x1", "Duplicate Detected", "Same amount & party as 11-Jun entry", "System", "2026-06-17 09:00", "amber"),
    ],
  },
  {
    id: "txn-025",
    bankAccountId: "sbi-cash-credit",
    statementDate: "2026-06-18",
    valueDate: "2026-06-18",
    bookDate: null,
    reference: "FT TO HDFC",
    chequeNo: null,
    narration: "TRANSFER TO HDFC FOR VENDOR PAYMENTS",
    partyLedger: "HDFC Current Account",
    deposit: 0,
    withdrawal: 300000,
    source: "Manual",
    matchStatus: "Pending",
    verificationStatus: "Not Applicable",
    reconciliationDate: null,
    relatedRecord: null,
    activity: [
      activity("y1", "Manual Transfer", "Contra entry pending statement confirmation", "Rajesh Kumar", "2026-06-18 13:00", "purple"),
    ],
  },
  {
    id: "txn-026",
    bankAccountId: "sbi-cash-credit",
    statementDate: "2026-06-20",
    valueDate: "2026-06-20",
    bookDate: null,
    reference: "UTR SBI240620991",
    chequeNo: null,
    narration: "NEFT CR — WESTERN AGRI SUPPLY CHAIN PVT LTD — ADVANCE AGAINST PO-2026-0188",
    partyLedger: "Western Agri Supply Chain Pvt Ltd",
    deposit: 215000,
    withdrawal: 0,
    source: "Statement Upload",
    matchStatus: "Suggested Match",
    verificationStatus: "Review Required",
    reconciliationDate: null,
    relatedRecord: {
      voucherType: "Receipt",
      voucherNumber: "RCP-2026-0175",
      customer: "Western Agri Supply Chain Pvt Ltd",
      invoiceReference: "PO-2026-0188 Advance",
      matchConfidence: "85%",
    },
    activity: [
      activity("z1", "Advance Receipt Suggested", "Match to customer advance ledger", "System", "2026-06-21 09:00", "amber"),
    ],
  },
  {
    id: "txn-027",
    bankAccountId: "hdfc-current",
    statementDate: "2026-06-20",
    valueDate: "2026-06-20",
    bookDate: "2026-06-20",
    reference: "FT FROM SBI",
    chequeNo: null,
    narration: "INWARD TRANSFER FROM SBI CASH CREDIT",
    partyLedger: "SBI Cash Credit",
    deposit: 300000,
    withdrawal: 0,
    source: "Statement Upload",
    matchStatus: "Pending",
    verificationStatus: "Review Required",
    reconciliationDate: null,
    relatedRecord: {
      voucherType: "Contra",
      voucherNumber: "CTR-2026-0025",
      customer: "—",
      invoiceReference: "—",
      matchConfidence: "Pending contra leg",
    },
    activity: [
      activity("aa1", "Inward Transfer", "Awaiting match with SBI outward transfer", "System", "2026-06-21 09:00", "amber"),
    ],
  },
  {
    id: "txn-028",
    bankAccountId: "sbi-cash-credit",
    statementDate: "2026-06-25",
    valueDate: "2026-06-25",
    bookDate: null,
    reference: "",
    chequeNo: null,
    narration: "MIN BAL CHG",
    partyLedger: "Bank Charges",
    deposit: 0,
    withdrawal: 750,
    source: "Bank Feed",
    matchStatus: "Uncategorized",
    verificationStatus: "Awaiting Statement",
    reconciliationDate: null,
    relatedRecord: null,
    activity: [
      activity("ab1", "Bank Feed", "Minimum balance charge", "System", "2026-06-25 23:00", "blue"),
    ],
  },
];

/** Demo seed exported for register initialization */
export const BANK_RECON_DEMO_ACCOUNTS: BankReconBankAccount[] = DEMO_ACCOUNTS;
export const BANK_RECON_DEMO_TRANSACTIONS: BankReconTransaction[] = DEMO_TRANSACTIONS;

export function getBankReconAccounts(): BankReconBankAccount[] {
  if (typeof window !== "undefined") {
    try {
      const { loadAccountImportMeta } = require("@/lib/accounts/bank-recon-register") as typeof import("@/lib/accounts/bank-recon-register");
      const { loadCompletionAccountMeta } = require("@/lib/accounts/bank-recon-completion-store") as typeof import("@/lib/accounts/bank-recon-completion-store");
      const { ensureBankReconCompletionSeeded } = require("@/lib/accounts/bank-recon-completion-demo-seed") as typeof import("@/lib/accounts/bank-recon-completion-demo-seed");
      ensureBankReconCompletionSeeded();
      return DEMO_ACCOUNTS.map((a) => {
        const meta = loadAccountImportMeta(a.id);
        const completion = loadCompletionAccountMeta(a.id);
        return {
          ...a,
          lastStatementImportedUntil: meta.lastStatementImportedUntil,
          lastReconciledDate: completion.lastReconciledDate ?? a.lastReconciledDate,
          status: (completion.listingStatus as BankReconBankAccount["status"]) ?? a.status,
        };
      });
    } catch {
      /* register not ready */
    }
  }
  return DEMO_ACCOUNTS.map((a) => ({ ...a }));
}

export function getBankReconAccountById(id: string): BankReconBankAccount | undefined {
  return getBankReconAccounts().find((a) => a.id === id);
}

export function getBankReconTransactions(bankAccountId?: string): BankReconTransaction[] {
  if (typeof window !== "undefined") {
    try {
      const { loadBankReconTransactions } = require("@/lib/accounts/bank-recon-register") as typeof import("@/lib/accounts/bank-recon-register");
      const rows = loadBankReconTransactions(bankAccountId);
      return rows.map((r) => ({
        id: r.id,
        bankAccountId: r.bankAccountId,
        statementDate: r.statementDate,
        valueDate: r.valueDate,
        bookDate: r.bookDate,
        reference: r.reference,
        chequeNo: r.chequeNo,
        narration: r.narration,
        partyLedger: r.partyLedger,
        deposit: r.deposit,
        withdrawal: r.withdrawal,
        source: r.source,
        matchStatus: r.matchStatus,
        verificationStatus: r.verificationStatus,
        reconciliationDate: r.reconciliationDate,
        relatedRecord: r.relatedRecord,
        activity: [...r.activity],
        manualTransactionNumber: r.manualTransactionNumber,
        manualEntryStatus: r.manualEntryStatus,
        transactionMode: r.transactionMode,
        transactionDate: r.transactionDate,
        expectedClearingDate: r.expectedClearingDate,
        utrNumber: r.utrNumber,
        referenceStatus: r.referenceStatus,
        expectedVoucherType: r.expectedVoucherType,
        partyType: r.partyType,
        internalRemarks: r.internalRemarks,
        bankNarration: r.bankNarration,
        importedNarration: r.importedNarration,
        followUpNote: r.followUpNote,
        attachments: r.attachments,
        createdBy: r.createdBy,
        createdOn: r.createdOn,
        updatedBy: r.updatedBy,
        updatedOn: r.updatedOn,
        cancelReason: r.cancelReason,
      }));
    } catch {
      /* fallback */
    }
  }
  const rows = DEMO_TRANSACTIONS.map((t) => ({ ...t, activity: [...t.activity] }));
  if (!bankAccountId) return rows;
  return rows.filter((t) => t.bankAccountId === bankAccountId);
}

export const BANK_RECON_ACCOUNT_TYPE_OPTIONS: BankReconAccountType[] = [
  "Current",
  "Cash Credit",
  "Overdraft",
  "Savings",
];

export const BANK_RECON_ACCOUNT_STATUS_OPTIONS: BankReconAccountStatus[] = [
  "Reconciled",
  "Partially Reconciled",
  "Pending",
  "Statement Not Uploaded",
];

export const BANK_RECON_SOURCE_OPTIONS: BankReconTransactionSource[] = [
  "Manual",
  "Statement Upload",
  "Manual + Statement",
  "Bank Feed",
];

export const BANK_RECON_MATCH_STATUS_OPTIONS: BankReconMatchStatus[] = [
  "Matched",
  "Suggested Match",
  "Pending",
  "Uncategorized",
  "Possible Duplicate",
  "Excluded",
];

export const BANK_RECON_VERIFICATION_STATUS_OPTIONS: BankReconVerificationStatus[] = [
  "Awaiting Statement",
  "Verified",
  "Verified Statement Entry",
  "Review Required",
  "Reference Pending",
  "Duplicate Skipped",
  "Not Applicable",
];

export const BANK_RECON_TRANSACTION_MODE_OPTIONS = [
  "NEFT", "RTGS", "IMPS", "UPI", "Cheque", "Cash Deposit", "Demand Draft",
  "Bank Transfer", "ECS", "NACH", "Card", "Other",
] as const;

export const BANK_RECON_ENTRY_STATUS_FILTER_OPTIONS = [
  { value: "active", label: "Active (excl. Draft & Cancelled)" },
  { value: "all", label: "All Entries" },
  { value: "Draft", label: "Draft" },
  { value: "Recorded", label: "Recorded" },
  { value: "Cancelled", label: "Cancelled" },
];

export const BANK_RECON_QUICK_FILTER_CHIPS = [
  { id: "all", label: "All" },
  { id: "Matched", label: "Matched" },
  { id: "Suggested Match", label: "Suggested" },
  { id: "Pending", label: "Pending" },
  { id: "Uncategorized", label: "Uncategorized" },
  { id: "Possible Duplicate", label: "Possible Duplicate" },
] as const;

export type BankReconQuickFilterId = (typeof BANK_RECON_QUICK_FILTER_CHIPS)[number]["id"];

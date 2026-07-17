/**
 * Manual Bank Reconciliation — recon-only demo overlay.
 * Posted-like book fixtures for end-to-end testing. Never writes vouchers/COA/Bank Accounts.
 */

import { roundMoney } from "@/lib/accounts/money-format";

export type ManualDemoAccountType = "Current" | "Cash Credit";

export interface ManualDemoAccountSpec {
  id: string;
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  accountType: ManualDemoAccountType;
  /** Signed book balance convention: Debit-positive for Current; Credit-utilization-positive for CC. */
  balanceSign: "asset" | "cash_credit";
  openingBalance: number;
  /** For CC: opening is utilization (Credit). For Current: opening is Debit. */
  openingBalanceType: "Debit" | "Credit";
  statementPeriodFrom: string;
  statementPeriodTo: string;
}

export interface ManualDemoBookMovement {
  key: string;
  voucherDate: string;
  particulars: string;
  voucherType: string;
  voucherTypeCode: string;
  voucherNumber: string;
  instrumentNumber: string;
  instrumentDate: string | null;
  deposit: number;
  withdrawal: number;
  /** When set, seed starts as reconciled with this bank date. */
  seedBankDate: string | null;
  narration?: string;
}

export const MANUAL_DEMO_PERIOD_FROM = "2026-06-01";
export const MANUAL_DEMO_PERIOD_TO = "2026-06-30";

export const MANUAL_DEMO_ACCOUNTS: ManualDemoAccountSpec[] = [
  {
    id: "sbi-current",
    bankName: "State Bank of India",
    accountNickname: "SBI Current Account",
    accountNumber: "3001987654321",
    accountType: "Current",
    balanceSign: "asset",
    openingBalance: 1_850_000,
    openingBalanceType: "Debit",
    statementPeriodFrom: MANUAL_DEMO_PERIOD_FROM,
    statementPeriodTo: MANUAL_DEMO_PERIOD_TO,
  },
  {
    id: "icici-collection",
    bankName: "ICICI Bank",
    accountNickname: "ICICI Collection Account",
    accountNumber: "0067987612345",
    accountType: "Current",
    balanceSign: "asset",
    openingBalance: 920_000,
    openingBalanceType: "Debit",
    statementPeriodFrom: MANUAL_DEMO_PERIOD_FROM,
    statementPeriodTo: MANUAL_DEMO_PERIOD_TO,
  },
  {
    id: "hdfc-cash-credit",
    bankName: "HDFC Bank",
    accountNickname: "HDFC Cash Credit Account",
    accountNumber: "50220987654321",
    accountType: "Cash Credit",
    balanceSign: "cash_credit",
    openingBalance: 750_000,
    openingBalanceType: "Credit",
    statementPeriodFrom: MANUAL_DEMO_PERIOD_FROM,
    statementPeriodTo: MANUAL_DEMO_PERIOD_TO,
  },
];

/** SBI Current — 12 rows: mix of payment/receipt/contra; some reconciled. */
const SBI_MOVEMENTS: ManualDemoBookMovement[] = [
  {
    key: "sbi-rcp-01",
    voucherDate: "2026-06-02",
    particulars: "Krishna Agro Inputs Pvt Ltd",
    voucherType: "Receipt",
    voucherTypeCode: "receipt",
    voucherNumber: "RCP-SBI-0001",
    instrumentNumber: "UTR-SBI-RCP0001",
    instrumentDate: "2026-06-02",
    deposit: 185_000,
    withdrawal: 0,
    seedBankDate: "2026-06-03",
  },
  {
    key: "sbi-pmt-01",
    voucherDate: "2026-06-03",
    particulars: "Bharat Fertilizers",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-SBI-0001",
    instrumentNumber: "CHQ-SBI-4101",
    instrumentDate: "2026-06-03",
    deposit: 0,
    withdrawal: 95_000,
    seedBankDate: "2026-06-05",
  },
  {
    key: "sbi-rcp-02",
    voucherDate: "2026-06-05",
    particulars: "Green Valley Farmers Co-op",
    voucherType: "Receipt",
    voucherTypeCode: "receipt",
    voucherNumber: "RCP-SBI-0002",
    instrumentNumber: "UTR-SBI-RCP0002",
    instrumentDate: "2026-06-05",
    deposit: 142_500,
    withdrawal: 0,
    seedBankDate: null,
  },
  {
    key: "sbi-pmt-02",
    voucherDate: "2026-06-07",
    particulars: "Office Rent — Head Office",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-SBI-0002",
    instrumentNumber: "NEFT-RENT-JUN",
    instrumentDate: "2026-06-07",
    deposit: 0,
    withdrawal: 45_000,
    seedBankDate: "2026-06-08",
  },
  {
    key: "sbi-pmt-03",
    voucherDate: "2026-06-09",
    particulars: "Maharashtra State Electricity",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-SBI-0003",
    instrumentNumber: "UTR-ELEC-0609",
    instrumentDate: "2026-06-09",
    deposit: 0,
    withdrawal: 18_750,
    seedBankDate: null,
  },
  {
    key: "sbi-cnt-01",
    voucherDate: "2026-06-10",
    particulars: "Transfer to ICICI Collection",
    voucherType: "Contra",
    voucherTypeCode: "contra",
    voucherNumber: "CNT-SBI-0001",
    instrumentNumber: "FT-SBI-ICICI-01",
    instrumentDate: "2026-06-10",
    deposit: 0,
    withdrawal: 200_000,
    seedBankDate: "2026-06-10",
  },
  {
    key: "sbi-rcp-03",
    voucherDate: "2026-06-12",
    particulars: "XYZ Traders — seasonal collection",
    voucherType: "Receipt",
    voucherTypeCode: "receipt",
    voucherNumber: "RCP-SBI-0003",
    instrumentNumber: "CHQ-XYZ-8821",
    instrumentDate: "2026-06-11",
    deposit: 78_000,
    withdrawal: 0,
    seedBankDate: null,
  },
  {
    key: "sbi-pmt-04",
    voucherDate: "2026-06-14",
    particulars: "Staff Salary — June advance",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-SBI-0004",
    instrumentNumber: "NEFT-SAL-JUN",
    instrumentDate: "2026-06-14",
    deposit: 0,
    withdrawal: 320_000,
    seedBankDate: null,
  },
  {
    key: "sbi-pmt-05",
    voucherDate: "2026-06-16",
    particulars: "BlueDart Courier Charges",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-SBI-0005",
    instrumentNumber: "UTR-COURIER-16",
    instrumentDate: "2026-06-16",
    deposit: 0,
    withdrawal: 4_850,
    seedBankDate: "2026-06-17",
  },
  {
    key: "sbi-jv-01",
    voucherDate: "2026-06-18",
    particulars: "Bank Interest Received",
    voucherType: "Journal",
    voucherTypeCode: "journal",
    voucherNumber: "JV-SBI-0001",
    instrumentNumber: "INT-CR-JUN",
    instrumentDate: "2026-06-18",
    deposit: 6_240,
    withdrawal: 0,
    seedBankDate: "2026-06-18",
  },
  {
    key: "sbi-cnt-02",
    voucherDate: "2026-06-20",
    particulars: "Cash deposited to SBI",
    voucherType: "Contra",
    voucherTypeCode: "contra",
    voucherNumber: "CNT-SBI-0002",
    instrumentNumber: "CSH-DEP-0620",
    instrumentDate: "2026-06-20",
    deposit: 50_000,
    withdrawal: 0,
    seedBankDate: null,
  },
  {
    key: "sbi-pmt-06",
    voucherDate: "2026-06-24",
    particulars: "Green Seeds Pvt. Ltd.",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-SBI-0006",
    instrumentNumber: "CHQ-SBI-4112",
    instrumentDate: "2026-06-22",
    deposit: 0,
    withdrawal: 112_000,
    seedBankDate: null,
  },
  {
    key: "sbi-pmt-07",
    voucherDate: "2026-06-26",
    particulars: "Internet & Telecom — June",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-SBI-0007",
    instrumentNumber: "NEFT-TELE-0626",
    instrumentDate: "2026-06-26",
    deposit: 0,
    withdrawal: 3_200,
    seedBankDate: null,
  },
  {
    key: "sbi-jv-02",
    voucherDate: "2026-06-28",
    particulars: "Bank Charges — SMS alerts",
    voucherType: "Journal",
    voucherTypeCode: "journal",
    voucherNumber: "JV-SBI-0002",
    instrumentNumber: "CHG-SMS-JUN",
    instrumentDate: "2026-06-28",
    deposit: 0,
    withdrawal: 118,
    seedBankDate: "2026-06-28",
  },
];

/** ICICI Collection — 8 rows: mainly receipts; several unreconciled deposits. */
const ICICI_MOVEMENTS: ManualDemoBookMovement[] = [
  {
    key: "ici-rcp-01",
    voucherDate: "2026-06-01",
    particulars: "ABC Agro Distributor",
    voucherType: "Receipt",
    voucherTypeCode: "receipt",
    voucherNumber: "RCP-ICI-0001",
    instrumentNumber: "UTR-ICI-RCP0001",
    instrumentDate: "2026-06-01",
    deposit: 210_000,
    withdrawal: 0,
    seedBankDate: "2026-06-02",
  },
  {
    key: "ici-rcp-02",
    voucherDate: "2026-06-04",
    particulars: "Distributor collection — Nashik",
    voucherType: "Receipt",
    voucherTypeCode: "receipt",
    voucherNumber: "RCP-ICI-0002",
    instrumentNumber: "UTR-ICI-RCP0002",
    instrumentDate: "2026-06-04",
    deposit: 96_500,
    withdrawal: 0,
    seedBankDate: null,
  },
  {
    key: "ici-rcp-03",
    voucherDate: "2026-06-08",
    particulars: "Customer collection — bulk urea",
    voucherType: "Receipt",
    voucherTypeCode: "receipt",
    voucherNumber: "RCP-ICI-0003",
    instrumentNumber: "NEFT-COLL-0608",
    instrumentDate: "2026-06-08",
    deposit: 155_000,
    withdrawal: 0,
    seedBankDate: null,
  },
  {
    key: "ici-cnt-01",
    voucherDate: "2026-06-10",
    particulars: "Transfer from SBI Current",
    voucherType: "Contra",
    voucherTypeCode: "contra",
    voucherNumber: "CNT-ICI-0001",
    instrumentNumber: "FT-SBI-ICICI-01",
    instrumentDate: "2026-06-10",
    deposit: 200_000,
    withdrawal: 0,
    seedBankDate: "2026-06-10",
  },
  {
    key: "ici-rcp-04",
    voucherDate: "2026-06-13",
    particulars: "XYZ Traders",
    voucherType: "Receipt",
    voucherTypeCode: "receipt",
    voucherNumber: "RCP-ICI-0004",
    instrumentNumber: "CHQ-XYZ-9012",
    instrumentDate: "2026-06-12",
    deposit: 64_000,
    withdrawal: 0,
    seedBankDate: null,
  },
  {
    key: "ici-pmt-01",
    voucherDate: "2026-06-15",
    particulars: "Refund — cancelled order",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-ICI-0001",
    instrumentNumber: "UTR-REF-0615",
    instrumentDate: "2026-06-15",
    deposit: 0,
    withdrawal: 12_500,
    seedBankDate: "2026-06-16",
  },
  {
    key: "ici-rcp-05",
    voucherDate: "2026-06-19",
    particulars: "Krishna Agro — outstanding invoice",
    voucherType: "Receipt",
    voucherTypeCode: "receipt",
    voucherNumber: "RCP-ICI-0005",
    instrumentNumber: "UTR-ICI-RCP0005",
    instrumentDate: "2026-06-19",
    deposit: 88_750,
    withdrawal: 0,
    seedBankDate: null,
  },
  {
    key: "ici-cnt-02",
    voucherDate: "2026-06-22",
    particulars: "Transfer to HDFC Cash Credit",
    voucherType: "Contra",
    voucherTypeCode: "contra",
    voucherNumber: "CNT-ICI-0002",
    instrumentNumber: "FT-ICI-HDFC-01",
    instrumentDate: "2026-06-22",
    deposit: 0,
    withdrawal: 150_000,
    seedBankDate: null,
  },
];

/**
 * HDFC Cash Credit — 6 rows.
 * deposit = repayment (Debit to CC ledger), withdrawal = drawdown (Credit).
 */
const HDFC_CC_MOVEMENTS: ManualDemoBookMovement[] = [
  {
    key: "hdfc-wdl-01",
    voucherDate: "2026-06-03",
    particulars: "Working capital drawdown",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-HDF-0001",
    instrumentNumber: "CC-DRAW-0603",
    instrumentDate: "2026-06-03",
    deposit: 0,
    withdrawal: 250_000,
    seedBankDate: "2026-06-03",
  },
  {
    key: "hdfc-dep-01",
    voucherDate: "2026-06-08",
    particulars: "CC repayment — sales proceeds",
    voucherType: "Receipt",
    voucherTypeCode: "receipt",
    voucherNumber: "RCP-HDF-0001",
    instrumentNumber: "UTR-CC-REP-08",
    instrumentDate: "2026-06-08",
    deposit: 180_000,
    withdrawal: 0,
    seedBankDate: "2026-06-09",
  },
  {
    key: "hdfc-wdl-02",
    voucherDate: "2026-06-12",
    particulars: "Vendor settlement drawdown",
    voucherType: "Payment",
    voucherTypeCode: "payment",
    voucherNumber: "PMT-HDF-0002",
    instrumentNumber: "CC-DRAW-0612",
    instrumentDate: "2026-06-12",
    deposit: 0,
    withdrawal: 95_000,
    seedBankDate: null,
  },
  {
    key: "hdfc-jv-01",
    voucherDate: "2026-06-15",
    particulars: "CC Interest charged",
    voucherType: "Journal",
    voucherTypeCode: "journal",
    voucherNumber: "JV-HDF-0001",
    instrumentNumber: "INT-CC-JUN",
    instrumentDate: "2026-06-15",
    deposit: 0,
    withdrawal: 8_450,
    seedBankDate: "2026-06-15",
  },
  {
    key: "hdfc-cnt-01",
    voucherDate: "2026-06-22",
    particulars: "Transfer from ICICI Collection",
    voucherType: "Contra",
    voucherTypeCode: "contra",
    voucherNumber: "CNT-HDF-0001",
    instrumentNumber: "FT-ICI-HDFC-01",
    instrumentDate: "2026-06-22",
    deposit: 150_000,
    withdrawal: 0,
    seedBankDate: null,
  },
  {
    key: "hdfc-dep-02",
    voucherDate: "2026-06-26",
    particulars: "Partial CC repayment",
    voucherType: "Receipt",
    voucherTypeCode: "receipt",
    voucherNumber: "RCP-HDF-0002",
    instrumentNumber: "UTR-CC-REP-26",
    instrumentDate: "2026-06-26",
    deposit: 75_000,
    withdrawal: 0,
    seedBankDate: null,
  },
];

const MOVEMENTS_BY_ACCOUNT: Record<string, ManualDemoBookMovement[]> = {
  "sbi-current": SBI_MOVEMENTS,
  "icici-collection": ICICI_MOVEMENTS,
  "hdfc-cash-credit": HDFC_CC_MOVEMENTS,
};

export function isManualDemoAccount(bankAccountId: string): boolean {
  return MANUAL_DEMO_ACCOUNTS.some((a) => a.id === bankAccountId);
}

export function getManualDemoAccount(bankAccountId: string): ManualDemoAccountSpec | undefined {
  return MANUAL_DEMO_ACCOUNTS.find((a) => a.id === bankAccountId);
}

export function manualDemoBookId(bankAccountId: string, key: string): string {
  return `book:${bankAccountId}:${key}`;
}

export function getManualDemoMovements(bankAccountId: string): ManualDemoBookMovement[] {
  return MOVEMENTS_BY_ACCOUNT[bankAccountId] ?? [];
}

/** Net movement as deposit − withdrawal (asset convention). */
export function getManualDemoNetMovement(bankAccountId: string): number {
  return roundMoney(
    getManualDemoMovements(bankAccountId).reduce((s, m) => s + m.deposit - m.withdrawal, 0),
  );
}

/**
 * Balance as per Books for overlay accounts.
 * Current: opening Debit + deposits − withdrawals.
 * Cash Credit (utilization): opening Credit + withdrawals − deposits.
 */
export function getManualDemoBookBalance(bankAccountId: string): number {
  const acct = getManualDemoAccount(bankAccountId);
  if (!acct) return 0;
  const net = getManualDemoNetMovement(bankAccountId);
  if (acct.balanceSign === "cash_credit") {
    // Utilization increases with withdrawals (drawdown), decreases with deposits (repayment).
    return roundMoney(acct.openingBalance - net);
  }
  return roundMoney(acct.openingBalance + net);
}

export function countManualDemoSeedReconciled(bankAccountId: string): number {
  return getManualDemoMovements(bankAccountId).filter((m) => m.seedBankDate).length;
}

export function countManualDemoSeedUnreconciled(bankAccountId: string): number {
  return getManualDemoMovements(bankAccountId).filter((m) => !m.seedBankDate).length;
}

export function getAllManualDemoMovements(): Array<
  ManualDemoBookMovement & { bankAccountId: string }
> {
  return MANUAL_DEMO_ACCOUNTS.flatMap((a) =>
    getManualDemoMovements(a.id).map((m) => ({ ...m, bankAccountId: a.id })),
  );
}

/** Stable synthetic voucher ids for overlay (900xxx range). */
export function manualDemoVoucherId(bankAccountId: string, index: number): number {
  const base =
    bankAccountId === "sbi-current"
      ? 920_000
      : bankAccountId === "icici-collection"
        ? 921_000
        : 922_000;
  return base + index + 1;
}

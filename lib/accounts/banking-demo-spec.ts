/** Shared demo bank account specifications for Banking module seeding. */

import type { BankAccountType } from "@/lib/accounts/bank-accounts-data";
import { demoFinancialYearStart } from "@/lib/accounts/demo-date-utils";

const DEMO_OPENING_DATE = demoFinancialYearStart();

export interface DemoBankAccountSpec {
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  ifsc: string;
  branchName: string;
  accountType: BankAccountType;
  openingBalance: number;
  openingBalanceDate: string;
  balanceType?: "Debit" | "Credit";
  defaultForReceipts: boolean;
  defaultForPayments: boolean;
  reconciliationEnabled?: boolean;
  /** Warehouse ids this account serves — demo seed only; defaults to all active if omitted. */
  mappedWarehouseIds?: number[];
}

/** Primary client-review bank accounts (masked XXXX4582 / XXXX4567 in UI). */
export const CLIENT_REVIEW_BANK_SPECS: DemoBankAccountSpec[] = [
  {
    bankName: "HDFC Bank",
    accountNickname: "HDFC Current Account",
    accountNumber: "50100234582",
    ifsc: "HDFC0001234",
    branchName: "Mumbai Main Branch",
    accountType: "Current",
    openingBalance: 500_000,
    openingBalanceDate: DEMO_OPENING_DATE,
    balanceType: "Debit",
    defaultForReceipts: false,
    defaultForPayments: false,
    reconciliationEnabled: true,
    mappedWarehouseIds: [1, 6],
  },
  {
    bankName: "ICICI Bank",
    accountNickname: "ICICI Collection Account",
    accountNumber: "00671234567",
    ifsc: "ICIC0000876",
    branchName: "Ahmedabad Branch",
    accountType: "Current",
    openingBalance: 800_000,
    openingBalanceDate: DEMO_OPENING_DATE,
    balanceType: "Debit",
    defaultForReceipts: true,
    defaultForPayments: true,
    reconciliationEnabled: true,
    mappedWarehouseIds: [5],
  },
];

/** @deprecated Use CLIENT_REVIEW_BANK_SPECS — kept for ensureDemoBankCoaStructure callers. */
export const DEMO_BANK_SPECS: DemoBankAccountSpec[] = CLIENT_REVIEW_BANK_SPECS;

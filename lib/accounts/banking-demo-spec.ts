/** Shared demo bank account specifications for Banking module seeding. */

import type { BankAccountType } from "@/lib/accounts/bank-accounts-data";

export interface DemoBankAccountSpec {
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  ifsc: string;
  branchName: string;
  accountType: BankAccountType;
  openingBalance: number;
  openingBalanceDate: string;
  defaultForReceipts: boolean;
  defaultForPayments: boolean;
}

export const DEMO_BANK_SPECS: DemoBankAccountSpec[] = [
  {
    bankName: "HDFC Bank",
    accountNickname: "HDFC Current Account",
    accountNumber: "XXXX7890",
    ifsc: "HDFC0001234",
    branchName: "FC Road, Pune",
    accountType: "Current",
    openingBalance: 2000000,
    openingBalanceDate: "2026-04-01",
    defaultForReceipts: true,
    defaultForPayments: false,
  },
  {
    bankName: "ICICI Bank",
    accountNickname: "ICICI Collection Account",
    accountNumber: "XXXX5678",
    ifsc: "ICIC0001234",
    branchName: "Camp, Pune",
    accountType: "Current",
    openingBalance: 850000,
    openingBalanceDate: "2026-04-01",
    defaultForReceipts: false,
    defaultForPayments: false,
  },
  {
    bankName: "SBI",
    accountNickname: "SBI Operations Account",
    accountNumber: "XXXX4321",
    ifsc: "SBIN0001234",
    branchName: "Shivaji Nagar",
    accountType: "Current",
    openingBalance: 525000,
    openingBalanceDate: "2026-04-01",
    defaultForReceipts: false,
    defaultForPayments: false,
  },
  {
    bankName: "Axis Bank",
    accountNickname: "Axis Salary Account",
    accountNumber: "XXXX8901",
    ifsc: "UTIB0000123",
    branchName: "Koregaon Park",
    accountType: "Savings",
    openingBalance: 375000,
    openingBalanceDate: "2026-04-01",
    defaultForReceipts: false,
    defaultForPayments: true,
  },
  {
    bankName: "IDFC First Bank",
    accountNickname: "IDFC First Current Account",
    accountNumber: "XXXX6543",
    ifsc: "IDFB0080123",
    branchName: "Baner",
    accountType: "Current",
    openingBalance: 220000,
    openingBalanceDate: "2026-04-01",
    defaultForReceipts: false,
    defaultForPayments: false,
  },
];

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
  balanceType?: "Debit" | "Credit";
  defaultForReceipts: boolean;
  defaultForPayments: boolean;
}

export const DEMO_BANK_SPECS: DemoBankAccountSpec[] = [
  {
    bankName: "HDFC Bank",
    accountNickname: "Dharitri Sutra Agri Pvt Ltd",
    accountNumber: "50100123456789",
    ifsc: "HDFC0001234",
    branchName: "FC Road, Pune",
    accountType: "Current",
    openingBalance: 2000000,
    openingBalanceDate: "2026-04-01",
    balanceType: "Debit",
    defaultForReceipts: true,
    defaultForPayments: false,
  },
  {
    bankName: "ICICI Bank",
    accountNickname: "Dharitri Sutra Agri Pvt Ltd",
    accountNumber: "006701234567",
    ifsc: "ICIC0001234",
    branchName: "Camp, Pune",
    accountType: "Current",
    openingBalance: 850000,
    openingBalanceDate: "2026-04-01",
    balanceType: "Debit",
    defaultForReceipts: false,
    defaultForPayments: false,
  },
  {
    bankName: "SBI",
    accountNickname: "Dharitri Sutra Agri Pvt Ltd",
    accountNumber: "30012345678",
    ifsc: "SBIN0001234",
    branchName: "Shivaji Nagar, Pune",
    accountType: "Current",
    openingBalance: 525000,
    openingBalanceDate: "2026-04-01",
    balanceType: "Debit",
    defaultForReceipts: false,
    defaultForPayments: false,
  },
  {
    bankName: "Axis Bank",
    accountNickname: "Dharitri Sutra Agri Pvt Ltd",
    accountNumber: "912010012345678",
    ifsc: "UTIB0000123",
    branchName: "Koregaon Park, Pune",
    accountType: "OD",
    openingBalance: 375000,
    openingBalanceDate: "2026-04-01",
    balanceType: "Debit",
    defaultForReceipts: false,
    defaultForPayments: true,
  },
  {
    bankName: "Kotak Bank",
    accountNickname: "Dharitri Sutra Agri Pvt Ltd",
    accountNumber: "9812345678",
    ifsc: "KKBK0001234",
    branchName: "Aundh, Pune",
    accountType: "CC",
    openingBalance: 220000,
    openingBalanceDate: "2026-04-01",
    balanceType: "Debit",
    defaultForReceipts: false,
    defaultForPayments: false,
  },
];

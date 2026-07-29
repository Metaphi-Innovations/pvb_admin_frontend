/**
 * Client-review banking demo — realistic HDFC / ICICI accounts and voucher-backed
 * Bank Book + Cash Book rows. Idempotent: never overwrites existing masters or vouchers.
 */

import { loadChartOfAccounts, saveChartOfAccounts, type ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  createVoucher,
  loadVouchers,
  saveVouchers,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  ensureBankAccountWithLedger,
  findBankAccountMasterByAccountNumber,
  loadBankAccountMasters,
  saveBankAccountMasters,
  type BankAccountMaster,
} from "@/lib/accounts/bank-accounts-data";
import { resolveCoaLedgerForBankMaster } from "@/lib/accounts/bank-ledger-resolver";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { ensureAccountsCoreDemoData } from "@/lib/accounts/accounts-demo-seed";
import { CLIENT_REVIEW_BANK_SPECS } from "@/lib/accounts/banking-demo-spec";

export const CLIENT_REVIEW_BANKING_SEED_VERSION = "client-review-v1";
const VERSION_KEY = "ds_banking_client_review_seed";

const LAST_RECONCILED_DATE = "2026-06-30";

/** Marker voucher numbers — used for idempotent seed checks only. */
const CLIENT_REVIEW_VOUCHER_NOS = [
  "REC-0007",
  "PAY-0012",
  "REC-HDFC-CR",
  "REC-ICICI-OB",
  "CSH-0017",
  "CSH-0018",
] as const;

function normalizeAccountNumber(value: string): string {
  return value.replace(/\s/g, "").toUpperCase();
}

function voucherExists(voucherNumber: string): boolean {
  return loadVouchers().some((v) => v.voucherNumber === voucherNumber);
}

function setVoucherNumber(voucherId: number, voucherNumber: string): void {
  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucherId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], voucherNumber };
    saveVouchers(list);
  }
}

function findLedgerByNamePart(
  namePart: string,
  accountType?: ChartOfAccount["accountType"],
): ChartOfAccount | null {
  const needle = namePart.trim().toLowerCase();
  return (
    loadChartOfAccounts().find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.status === "active" &&
        (!accountType || r.accountType === accountType) &&
        r.accountName.toLowerCase().includes(needle),
    ) ?? null
  );
}

function findCashLedger(namePart: string): ChartOfAccount | null {
  return (
    getLedgersUnderSubGroupName("Cash-in-Hand").find((l) =>
      l.accountName.toLowerCase().includes(namePart.toLowerCase()),
    ) ?? null
  );
}

function patchClientReviewMasterMeta(accountNumber: string, nickname: string): void {
  const masters = loadBankAccountMasters();
  const normalized = normalizeAccountNumber(accountNumber);
  const idx = masters.findIndex(
    (m) => normalizeAccountNumber(m.accountNumber) === normalized,
  );
  if (idx < 0) return;

  const existing = masters[idx];
  if (existing.lastReconciledDate) return;

  masters[idx] = {
    ...existing,
    accountNickname: nickname,
    reconciliationEnabled: true,
    reconciliationStatus: "reconciled",
    lastReconciledDate: LAST_RECONCILED_DATE,
    status: "active",
  };
  saveBankAccountMasters(masters);
}

function seedClientReviewBankAccounts(): void {
  for (const spec of CLIENT_REVIEW_BANK_SPECS) {
    if (!findBankAccountMasterByAccountNumber(spec.accountNumber)) {
      ensureBankAccountWithLedger({
        ...spec,
        reconciliationEnabled: spec.reconciliationEnabled ?? true,
      });
    }
    patchClientReviewMasterMeta(spec.accountNumber, spec.accountNickname);
  }
}

function seedReceiptVoucher(input: {
  voucherNo: string;
  date: string;
  referenceNo: string;
  narration: string;
  bankLedger: ChartOfAccount;
  partyLedger: ChartOfAccount;
  partyLabel: string;
  amount: number;
}): void {
  if (voucherExists(input.voucherNo)) return;

  const v = createVoucher("receipt", {
    date: input.date,
    referenceNo: input.referenceNo,
    narration: input.narration,
    status: "posted",
    lines: [
      {
        id: 1,
        ledgerId: input.bankLedger.id,
        ledgerName: input.bankLedger.accountName,
        debit: input.amount,
        credit: 0,
        remarks: input.referenceNo,
      },
      {
        id: 2,
        ledgerId: input.partyLedger.id,
        ledgerName: input.partyLabel,
        debit: 0,
        credit: input.amount,
        remarks: input.partyLabel,
      },
    ],
  });
  setVoucherNumber(v.id, input.voucherNo);
}

function seedPaymentVoucher(input: {
  voucherNo: string;
  date: string;
  referenceNo: string;
  narration: string;
  bankLedger: ChartOfAccount;
  partyLedger: ChartOfAccount;
  partyLabel: string;
  amount: number;
}): void {
  if (voucherExists(input.voucherNo)) return;

  const v = createVoucher("payment", {
    date: input.date,
    referenceNo: input.referenceNo,
    narration: input.narration,
    status: "posted",
    lines: [
      {
        id: 1,
        ledgerId: input.partyLedger.id,
        ledgerName: input.partyLabel,
        debit: input.amount,
        credit: 0,
        remarks: input.partyLabel,
      },
      {
        id: 2,
        ledgerId: input.bankLedger.id,
        ledgerName: input.bankLedger.accountName,
        debit: 0,
        credit: input.amount,
        remarks: input.referenceNo,
      },
    ],
  });
  setVoucherNumber(v.id, input.voucherNo);
}

function seedCashReceipt(input: {
  voucherNo: string;
  date: string;
  referenceNo: string;
  narration: string;
  cashLedger: ChartOfAccount;
  partyLedger: ChartOfAccount;
  partyLabel: string;
  amount: number;
}): void {
  if (voucherExists(input.voucherNo)) return;

  const v = createVoucher("receipt", {
    date: input.date,
    referenceNo: input.referenceNo,
    narration: input.narration,
    status: "posted",
    lines: [
      {
        id: 1,
        ledgerId: input.cashLedger.id,
        ledgerName: input.cashLedger.accountName,
        debit: input.amount,
        credit: 0,
        remarks: input.referenceNo,
      },
      {
        id: 2,
        ledgerId: input.partyLedger.id,
        ledgerName: input.partyLabel,
        debit: 0,
        credit: input.amount,
        remarks: input.partyLabel,
      },
    ],
  });
  setVoucherNumber(v.id, input.voucherNo);
}

function seedCashPayment(input: {
  voucherNo: string;
  date: string;
  referenceNo: string;
  narration: string;
  cashLedger: ChartOfAccount;
  partyLedger: ChartOfAccount;
  partyLabel: string;
  amount: number;
}): void {
  if (voucherExists(input.voucherNo)) return;

  const v = createVoucher("payment", {
    date: input.date,
    referenceNo: input.referenceNo,
    narration: input.narration,
    status: "posted",
    lines: [
      {
        id: 1,
        ledgerId: input.partyLedger.id,
        ledgerName: input.partyLabel,
        debit: input.amount,
        credit: 0,
        remarks: input.partyLabel,
      },
      {
        id: 2,
        ledgerId: input.cashLedger.id,
        ledgerName: input.cashLedger.accountName,
        debit: 0,
        credit: input.amount,
        remarks: input.referenceNo,
      },
    ],
  });
  setVoucherNumber(v.id, input.voucherNo);
}

function resolveBankLedger(accountNumber: string): ChartOfAccount | null {
  const master = findBankAccountMasterByAccountNumber(accountNumber);
  if (!master) return null;
  return resolveCoaLedgerForBankMaster(master);
}

function ensurePettyCashOpeningForReview(): void {
  const petty = findCashLedger("Office Petty");
  if (!petty || voucherExists("CSH-0017")) return;
  const records = loadChartOfAccounts();
  if (records.find((r) => r.id === petty.id)?.openingBalance === 125_000) return;
  saveChartOfAccounts(
    records.map((r) =>
      r.id === petty.id
        ? { ...r, openingBalance: 125_000, balanceType: "Debit" as const }
        : r,
    ),
  );
}

function seedClientReviewVouchers(): void {
  if (CLIENT_REVIEW_VOUCHER_NOS.every((no) => voucherExists(no))) return;

  ensurePettyCashOpeningForReview();

  const hdfc = resolveBankLedger("50100234582");
  const icici = resolveBankLedger("00671234567");
  const reliance = findLedgerByNamePart("Reliance Agri", "Asset");
  const abcVendor = findLedgerByNamePart("ABC Agro");
  const pettyCash = findCashLedger("Office Petty");
  const farmerParty =
    findLedgerByNamePart("Green Harvest", "Asset") ??
    findLedgerByNamePart("Krishna Retail", "Asset");
  const officeExpense =
    findLedgerByNamePart("Office Expense", "Expense") ??
    findLedgerByNamePart("Office Rent", "Expense") ??
    findLedgerByNamePart("Stationery", "Expense");

  if (hdfc && reliance) {
    seedReceiptVoucher({
      voucherNo: "REC-HDFC-CR",
      date: "2026-07-05",
      referenceNo: "NEFT-HDFC-185K",
      narration: "Sales collection — Reliance Agri",
      bankLedger: hdfc,
      partyLedger: reliance,
      partyLabel: "Reliance Agri",
      amount: 185_000,
    });
  }

  if (icici && reliance) {
    seedReceiptVoucher({
      voucherNo: "REC-ICICI-OB",
      date: "2026-06-30",
      referenceNo: "NEFT-ICICI-OB",
      narration: "Opening period collection — Reliance Agri",
      bankLedger: icici,
      partyLedger: reliance,
      partyLabel: "Reliance Agri",
      amount: 46_780,
    });

    seedPaymentVoucher({
      voucherNo: "PAY-0012",
      date: "2026-07-07",
      referenceNo: "UTR987654",
      narration: "Supplier payment — ABC Agro Supplies",
      bankLedger: icici,
      partyLedger: abcVendor ?? reliance,
      partyLabel: "ABC Agro Supplies",
      amount: 75_000,
    });

    seedReceiptVoucher({
      voucherNo: "REC-0007",
      date: "2026-07-08",
      referenceNo: "RGHY81693J",
      narration: "Customer receipt — Reliance Agri",
      bankLedger: icici,
      partyLedger: reliance,
      partyLabel: "Reliance Agri",
      amount: 185_000,
    });
  }

  if (pettyCash && farmerParty && officeExpense) {
    seedCashPayment({
      voucherNo: "CSH-0018",
      date: "2026-07-07",
      referenceNo: "CSH-0018",
      narration: "Petty cash — office expenses",
      cashLedger: pettyCash,
      partyLedger: officeExpense,
      partyLabel: "Office Expenses",
      amount: 8_500,
    });

    seedCashReceipt({
      voucherNo: "CSH-0017",
      date: "2026-07-08",
      referenceNo: "CSH-0017",
      narration: "Field collections — farmer receipts",
      cashLedger: pettyCash,
      partyLedger: farmerParty,
      partyLabel: "Farmer Collections",
      amount: 25_000,
    });
  }
}

/**
 * Seeds client-review bank accounts and vouchers when missing.
 * Never removes or overwrites existing user records.
 */
export function ensureClientReviewBankingSeed(): void {
  if (typeof window === "undefined") return;

  const alreadySeeded = localStorage.getItem(VERSION_KEY) === CLIENT_REVIEW_BANKING_SEED_VERSION;
  const mastersEmpty = loadBankAccountMasters().length === 0;
  const vouchersMissing = CLIENT_REVIEW_VOUCHER_NOS.some((no) => !voucherExists(no));

  if (alreadySeeded && !mastersEmpty && !vouchersMissing) return;

  try {
    ensureAccountsCoreDemoData();
    loadChartOfAccounts();

    if (mastersEmpty || CLIENT_REVIEW_BANK_SPECS.some(
      (s) => !findBankAccountMasterByAccountNumber(s.accountNumber),
    )) {
      seedClientReviewBankAccounts();
    }

    if (vouchersMissing) {
      seedClientReviewVouchers();
    }

    localStorage.setItem(VERSION_KEY, CLIENT_REVIEW_BANKING_SEED_VERSION);
  } catch (err) {
    console.error("[banking] client review seed failed:", err);
  }
}

/** True when both primary client-review bank accounts exist. */
export function hasClientReviewBankAccounts(): boolean {
  return CLIENT_REVIEW_BANK_SPECS.every((s) =>
    Boolean(findBankAccountMasterByAccountNumber(s.accountNumber)),
  );
}

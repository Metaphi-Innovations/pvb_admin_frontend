/**
 * Bank Book demo seed — ensures voucher-backed demo data for Bank Book only.
 * Creates transactions through Receipt, Payment, Contra, Journal, and Fund Transfer vouchers.
 */

import { loadChartOfAccounts, type ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  createVoucher,
  loadVouchers,
  saveVouchers,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { ensureBankingDemoOnPageLoad } from "@/lib/accounts/banking-demo-seed";
import { loadBankAccountMasters } from "@/lib/accounts/bank-accounts-data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";

const BANK_BOOK_DEMO_VERSION = "2026-jul-bank-book-v1";
const VERSION_KEY = "ds_bank_book_demo_seed_version";

function findBankLedger(accountNumberSuffix: string): ChartOfAccount | null {
  const master = loadBankAccountMasters().find((m) =>
    m.accountNumber.replace(/\D/g, "").endsWith(accountNumberSuffix.replace(/\D/g, "")),
  );
  if (!master) return null;
  return loadChartOfAccounts().find((r) => r.id === master.coaLedgerId) ?? null;
}

function findCashLedger(namePart: string): ChartOfAccount | null {
  return (
    getLedgersUnderSubGroupName("Cash-in-Hand").find((l) =>
      l.accountName.toLowerCase().includes(namePart.toLowerCase()),
    ) ?? null
  );
}

function setVoucherNumber(voucherId: number, voucherNumber: string): void {
  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucherId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], voucherNumber };
    saveVouchers(list);
  }
}

function seedContraVouchers(): void {
  if (loadVouchers().some((v) => v.voucherNumber === "CV-0001")) return;

  const hdfc = findBankLedger("7890");
  const icici = findBankLedger("5678");
  const sbi = findBankLedger("4321");
  const pettyCash = findCashLedger("Petty");
  if (!hdfc || !icici || !sbi || !pettyCash) return;

  const entries: Array<{
    date: string;
    no: string;
    narration: string;
    debitLedger: ChartOfAccount;
    creditLedger: ChartOfAccount;
    amount: number;
  }> = [
    {
      date: "2026-04-06",
      no: "CV-0001",
      narration: "Cash withdrawal for petty cash replenishment",
      debitLedger: pettyCash,
      creditLedger: hdfc,
      amount: 15000,
    },
    {
      date: "2026-04-25",
      no: "CV-0002",
      narration: "Counter cash deposit — branch collection",
      debitLedger: hdfc,
      creditLedger: pettyCash,
      amount: 22000,
    },
    {
      date: "2026-05-14",
      no: "CV-0003",
      narration: "Cash withdrawal — field staff imprest",
      debitLedger: pettyCash,
      creditLedger: icici,
      amount: 18000,
    },
    {
      date: "2026-06-06",
      no: "CV-0004",
      narration: "Cash deposit — weekend counter collections",
      debitLedger: sbi,
      creditLedger: pettyCash,
      amount: 26500,
    },
  ];

  for (const entry of entries) {
    const v = createVoucher("contra", {
      date: entry.date,
      referenceNo: entry.no,
      narration: entry.narration,
      status: "posted",
      lines: [
        {
          id: 1,
          ledgerId: entry.debitLedger.id,
          ledgerName: entry.debitLedger.accountName,
          debit: entry.amount,
          credit: 0,
          remarks: entry.narration,
        },
        {
          id: 2,
          ledgerId: entry.creditLedger.id,
          ledgerName: entry.creditLedger.accountName,
          debit: 0,
          credit: entry.amount,
          remarks: entry.narration,
        },
      ],
    });
    setVoucherNumber(v.id, entry.no);
  }
}

export function ensureBankBookDemoOnPageLoad(): void {
  if (typeof window === "undefined") return;

  ensureBankingDemoOnPageLoad();
  seedContraVouchers();

  if (localStorage.getItem(VERSION_KEY) !== BANK_BOOK_DEMO_VERSION) {
    localStorage.setItem(VERSION_KEY, BANK_BOOK_DEMO_VERSION);
  }
}

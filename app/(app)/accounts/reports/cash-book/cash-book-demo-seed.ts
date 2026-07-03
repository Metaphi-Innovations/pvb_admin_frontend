/**
 * Cash Book demo seed — creates voucher-based cash transactions only.
 * Isolated to Cash Book; does not modify bank book or fund transfer modules.
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

const VERSION_KEY = "ds_cash_book_demo_seed_v2";

function findCashLedger(namePart: string): ChartOfAccount | null {
  return (
    getLedgersUnderSubGroupName("Cash-in-Hand").find((l) =>
      l.accountName.toLowerCase().includes(namePart.toLowerCase()),
    ) ?? null
  );
}

function findBankLedger(accountNumberSuffix: string): ChartOfAccount | null {
  const master = loadBankAccountMasters().find((m) =>
    m.accountNumber.replace(/\D/g, "").endsWith(accountNumberSuffix.replace(/\D/g, "")),
  );
  if (!master) return null;
  return loadChartOfAccounts().find((r) => r.id === master.coaLedgerId) ?? null;
}

function findExpenseLedger(namePart: string): ChartOfAccount | null {
  return (
    loadChartOfAccounts().find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.accountType === "Expense" &&
        r.accountName.toLowerCase().includes(namePart.toLowerCase()),
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

function seedAdditionalContraAndJournal(): void {
  if (loadVouchers().some((v) => v.voucherNumber === "CV-0001")) return;

  const pettyCash = findCashLedger("Petty");
  const branchCash = findCashLedger("Branch Counter");
  const fieldCash = findCashLedger("Field Staff");
  const hdfc = findBankLedger("7890");
  const icici = findBankLedger("5678");
  const officeExpense = findExpenseLedger("Office") ?? findExpenseLedger("Stationery");
  const transportExpense = findExpenseLedger("Transport");

  const contras: Array<{
    cash: ChartOfAccount | null;
    bank: ChartOfAccount | null;
    amount: number;
    date: string;
    no: string;
    narration: string;
    direction: "deposit" | "withdraw";
  }> = [
    {
      cash: pettyCash,
      bank: hdfc,
      amount: 35000,
      date: "2026-04-25",
      no: "CV-0001",
      narration: "Cash deposit to HDFC — weekly collection",
      direction: "deposit",
    },
    {
      cash: branchCash,
      bank: icici,
      amount: 22000,
      date: "2026-05-14",
      no: "CV-0002",
      narration: "Branch counter cash deposited to ICICI",
      direction: "deposit",
    },
    {
      cash: pettyCash,
      bank: hdfc,
      amount: 15000,
      date: "2026-05-25",
      no: "CV-0003",
      narration: "Cash withdrawal from HDFC for petty cash replenishment",
      direction: "withdraw",
    },
    {
      cash: fieldCash,
      bank: icici,
      amount: 18000,
      date: "2026-06-08",
      no: "CV-0004",
      narration: "Field staff cash deposited to ICICI collection account",
      direction: "deposit",
    },
  ];

  for (const c of contras) {
    if (!c.cash || !c.bank) continue;
    const lines =
      c.direction === "deposit"
        ? [
            { id: 1, ledgerId: c.bank.id, ledgerName: c.bank.accountName, debit: c.amount, credit: 0, remarks: "Cash deposit" },
            { id: 2, ledgerId: c.cash.id, ledgerName: c.cash.accountName, debit: 0, credit: c.amount, remarks: c.narration },
          ]
        : [
            { id: 1, ledgerId: c.cash.id, ledgerName: c.cash.accountName, debit: c.amount, credit: 0, remarks: c.narration },
            { id: 2, ledgerId: c.bank.id, ledgerName: c.bank.accountName, debit: 0, credit: c.amount, remarks: "Cash withdrawal" },
          ];
    const v = createVoucher("contra", {
      date: c.date,
      referenceNo: c.no,
      narration: c.narration,
      status: "posted",
      lines,
    });
    setVoucherNumber(v.id, c.no);
  }

  const journals: Array<{
    cash: ChartOfAccount | null;
    other: ChartOfAccount | null;
    amount: number;
    date: string;
    no: string;
    narration: string;
    cashDebit: boolean;
  }> = [
    {
      cash: pettyCash,
      other: officeExpense,
      amount: 8500,
      date: "2026-04-18",
      no: "JV-CSH-0001",
      narration: "Petty cash expenses booked via journal",
      cashDebit: false,
    },
    {
      cash: branchCash,
      other: transportExpense,
      amount: 6200,
      date: "2026-05-20",
      no: "JV-CSH-0002",
      narration: "Branch delivery charges — cash journal adjustment",
      cashDebit: false,
    },
    {
      cash: fieldCash,
      other: officeExpense,
      amount: 4800,
      date: "2026-06-15",
      no: "JV-CSH-0003",
      narration: "Field cash shortfall adjustment journal",
      cashDebit: false,
    },
  ];

  for (const j of journals) {
    if (!j.cash || !j.other) continue;
    const lines = j.cashDebit
      ? [
          { id: 1, ledgerId: j.cash.id, ledgerName: j.cash.accountName, debit: j.amount, credit: 0, remarks: j.narration },
          { id: 2, ledgerId: j.other.id, ledgerName: j.other.accountName, debit: 0, credit: j.amount, remarks: j.narration },
        ]
      : [
          { id: 1, ledgerId: j.other.id, ledgerName: j.other.accountName, debit: j.amount, credit: 0, remarks: j.narration },
          { id: 2, ledgerId: j.cash.id, ledgerName: j.cash.accountName, debit: 0, credit: j.amount, remarks: j.narration },
        ];
    const v = createVoucher("journal", {
      date: j.date,
      referenceNo: j.no,
      narration: j.narration,
      status: "posted",
      lines,
    });
    setVoucherNumber(v.id, j.no);
  }
}

export function ensureCashBookDemoOnPageLoad(): void {
  if (typeof window === "undefined") return;

  ensureBankingDemoOnPageLoad();

  if (localStorage.getItem(VERSION_KEY) === VERSION_KEY) return;

  seedAdditionalContraAndJournal();
  localStorage.setItem(VERSION_KEY, VERSION_KEY);
}

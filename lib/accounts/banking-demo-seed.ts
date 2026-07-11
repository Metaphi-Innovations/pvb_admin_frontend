import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Banking module demo seed — bank book (50+), cash book (20+).
 * Runs as part of accounts demo seed; idempotent via version key.
 */

import {
  createVoucher,
  loadVouchers,
  saveVouchers,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadChartOfAccounts, type ChartOfAccount } from "@/app/(app)/accounts/data";
import {
  ensureDemoBankCoaStructure,
  loadBankAccountMasters,
} from "@/lib/accounts/bank-accounts-data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { scheduleDeferredDemoSeed } from "./deferred-demo-seed";
import { ensureClientReviewBankingSeed } from "@/lib/accounts/banking-client-review-seed";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";

import { getDemoBankLedgers } from "@/lib/accounts/bank-ledger-resolver";

export const BANKING_DEMO_SEED_VERSION = "relative-dates-v4";
const VERSION_KEY = "ds_banking_demo_seed_version";
const FUND_TRANSFER_STORAGE_KEY = "ds_accounts_fund_transfers_v2";
const FUND_TRANSFER_SEED_KEY = "ds_fund_transfer_demo_seed_version";

const BANKING_DEMO_VOUCHER_PREFIXES = ["RV-", "PV-", "FT-", "CSH-", "CV-", "JV-000"];

function removeBankingDemoVouchers(): void {
  const list = loadVouchers().filter((v) => {
    const no = v.voucherNumber ?? "";
    return !BANKING_DEMO_VOUCHER_PREFIXES.some((prefix) => no.startsWith(prefix));
  });
  saveVouchers(list);
}

function findCashLedger(namePart: string) {
  return (
    getLedgersUnderSubGroupName("Cash-in-Hand").find((l) =>
      l.accountName.toLowerCase().includes(namePart.toLowerCase()),
    ) ?? null
  );
}

function findExpenseLedger(namePart: string) {
  return (
    loadChartOfAccounts().find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.accountType === "Expense" &&
        r.accountName.toLowerCase().includes(namePart.toLowerCase()),
    ) ?? null
  );
}

function findCustomerLedger(namePart: string) {
  return (
    loadChartOfAccounts().find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.accountName.toLowerCase().includes(namePart.toLowerCase()) &&
        r.accountType === "Asset",
    ) ?? null
  );
}

function findVendorLedger(namePart: string) {
  return (
    loadChartOfAccounts().find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.accountName.toLowerCase().includes(namePart.toLowerCase()) &&
        r.accountType === "Liability",
    ) ?? null
  );
}

function resolveAccountNameFromId(ledgerId: number): string {
  return loadChartOfAccounts().find((r) => r.id === ledgerId)?.accountName ?? `Ledger #${ledgerId}`;
}

function setVoucherNumber(voucherId: number, voucherNumber: string): void {
  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucherId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], voucherNumber };
    saveVouchers(list);
  }
}

function seedReceipt(
  bankLedgerId: number,
  bankName: string,
  partyLedgerId: number,
  partyName: string,
  amount: number,
  date: string,
  ref: string,
  voucherNo: string,
  narration: string,
): void {
  const v = createVoucher("receipt", {
    date,
    referenceNo: ref,
    narration,
    status: "posted",
    lines: [
      { id: 1, ledgerId: bankLedgerId, ledgerName: bankName, debit: amount, credit: 0, remarks: narration },
      { id: 2, ledgerId: partyLedgerId, ledgerName: partyName, debit: 0, credit: amount, remarks: partyName },
    ],
  });
  setVoucherNumber(v.id, voucherNo);
}

function seedPayment(
  bankLedgerId: number,
  bankName: string,
  partyLedgerId: number,
  partyName: string,
  amount: number,
  date: string,
  ref: string,
  voucherNo: string,
  narration: string,
): void {
  const v = createVoucher("payment", {
    date,
    referenceNo: ref,
    narration,
    status: "posted",
    lines: [
      { id: 1, ledgerId: partyLedgerId, ledgerName: partyName, debit: amount, credit: 0, remarks: partyName },
      { id: 2, ledgerId: bankLedgerId, ledgerName: bankName, debit: 0, credit: amount, remarks: narration },
    ],
  });
  setVoucherNumber(v.id, voucherNo);
}

function seedJournal(
  entries: Array<{ ledgerId: number; ledgerName: string; debit: number; credit: number }>,
  date: string,
  ref: string,
  voucherNo: string,
  narration: string,
): void {
  const v = createVoucher("journal", {
    date,
    referenceNo: ref,
    narration,
    status: "posted",
    lines: entries.map((e, i) => ({
      id: i + 1,
      ledgerId: e.ledgerId,
      ledgerName: e.ledgerName,
      debit: e.debit,
      credit: e.credit,
      remarks: narration,
    })),
  });
  setVoucherNumber(v.id, voucherNo);
}

export function ensureDemoBankAccounts(): void {
  ensureDemoBankCoaStructure();
}

function seedBankBookTransactions(force = false): void {
  if (!force && loadVouchers().some((v) => v.voucherNumber === "RV-0001")) return;

  const { hdfc, icici, sbi, axis, kotak } = getDemoBankLedgers();
  if (!hdfc) return;

  const abc = findCustomerLedger("ABC Agro");
  const xyz = findCustomerLedger("XYZ Traders");
  const bharatFert = findVendorLedger("Bharat Fertilizers");
  const greenSeeds = findVendorLedger("Green Seeds");
  const bankCharges = findExpenseLedger("Bank Service") ?? findExpenseLedger("HDFC Bank Service");
  const interestIncome = loadChartOfAccounts().find((r) =>
    r.accountName.toLowerCase().includes("bank interest"),
  );

  const receipts: Array<{
    bank: ChartOfAccount | null;
    party: ChartOfAccount | null;
    amount: number;
    date: string;
    ref: string;
    no: string;
    narration: string;
  }> = [
    { bank: hdfc, party: abc, amount: 185000, date: demoDateAt(0), ref: "NEFT-001", no: "RV-0001", narration: "Sales collection — ABC Agro Distributor" },
    { bank: hdfc, party: xyz, amount: 92000, date: demoDateAt(1), ref: "NEFT-002", no: "RV-0002", narration: "Customer receipt — XYZ Traders" },
    { bank: icici, party: abc, amount: 145000, date: demoDateAt(2), ref: "NEFT-003", no: "RV-0003", narration: "Sales collection — ABC Agro Distributor" },
    { bank: icici, party: xyz, amount: 68000, date: demoDateAt(3), ref: "NEFT-004", no: "RV-0004", narration: "Customer receipt — XYZ Traders partial" },
    { bank: hdfc, party: abc, amount: 54000, date: demoDateAt(4), ref: "NEFT-005", no: "RV-0005", narration: "Cash sales collection deposited" },
    { bank: hdfc, party: xyz, amount: 210000, date: demoDateAt(5), ref: "NEFT-006", no: "RV-0006", narration: "Sales collection — bulk urea order" },
    { bank: icici, party: abc, amount: 125000, date: demoDateAt(6), ref: "NEFT-007", no: "RV-0007", narration: "Customer receipt against INV-2026-003" },
    { bank: icici, party: xyz, amount: 78000, date: demoDateAt(7), ref: "NEFT-008", no: "RV-0008", narration: "Sales collection — XYZ Traders" },
    { bank: hdfc, party: abc, amount: 95000, date: demoDateAt(8), ref: "NEFT-009", no: "RV-0009", narration: "Collection against outstanding invoice" },
    { bank: icici, party: xyz, amount: 156000, date: demoDateAt(9), ref: "NEFT-010", no: "RV-0010", narration: "Sales collection — distributor payment" },
    { bank: hdfc, party: abc, amount: 42000, date: demoDateAt(10), ref: "NEFT-011", no: "RV-0011", narration: "Customer receipt — retail counter" },
    { bank: hdfc, party: xyz, amount: 88000, date: demoDateAt(11), ref: "NEFT-012", no: "RV-0012", narration: "Farmer collection — seasonal payment" },
  ];

  for (const r of receipts) {
    if (!r.bank || !r.party) continue;
    seedReceipt(r.bank.id, r.bank.accountName, r.party.id, r.party.accountName, r.amount, r.date, r.ref, r.no, r.narration);
  }

  const payments: Array<{
    bank: ChartOfAccount | null;
    party: ChartOfAccount | null;
    amount: number;
    date: string;
    ref: string;
    no: string;
    narration: string;
  }> = [
    { bank: hdfc, party: bharatFert, amount: 245000, date: demoDateAt(12), ref: "PAY-001", no: "PV-0001", narration: "Supplier payment — Bharat Fertilizers" },
    { bank: icici, party: greenSeeds, amount: 118000, date: demoDateAt(13), ref: "PAY-002", no: "PV-0002", narration: "Supplier payment — Green Seeds Pvt. Ltd." },
    { bank: hdfc, party: bharatFert, amount: 86000, date: demoDateAt(14), ref: "PAY-003", no: "PV-0003", narration: "Supplier payment — fertilizer purchase" },
    { bank: hdfc, party: greenSeeds, amount: 195000, date: demoDateAt(15), ref: "PAY-004", no: "PV-0004", narration: "Supplier payment — seed procurement" },
    { bank: icici, party: bharatFert, amount: 320000, date: demoDateAt(16), ref: "PAY-005", no: "PV-0005", narration: "Supplier payment — bulk order" },
    { bank: icici, party: greenSeeds, amount: 142000, date: demoDateAt(17), ref: "PAY-006", no: "PV-0006", narration: "Supplier payment — pesticide stock" },
    { bank: hdfc, party: bharatFert, amount: 98000, date: demoDateAt(18), ref: "PAY-007", no: "PV-0007", narration: "Supplier payment — partial settlement" },
    { bank: icici, party: greenSeeds, amount: 76000, date: demoDateAt(19), ref: "PAY-008", no: "PV-0008", narration: "Supplier payment — operations account" },
    { bank: icici, party: bharatFert, amount: 210000, date: demoDateAt(20), ref: "PAY-009", no: "PV-0009", narration: "Supplier payment — bulk DAP order" },
    { bank: hdfc, party: greenSeeds, amount: 134000, date: demoDateAt(21), ref: "PAY-010", no: "PV-0010", narration: "Supplier payment — June settlement" },
  ];

  for (const p of payments) {
    if (!p.bank || !p.party) continue;
    seedPayment(p.bank.id, p.bank.accountName, p.party.id, p.party.accountName, p.amount, p.date, p.ref, p.no, p.narration);
  }

  const transfers = [
    { from: hdfc, to: icici, amount: 200000, date: demoDateAt(22), no: "FT-0001" },
    { from: icici, to: sbi, amount: 125000, date: demoDateAt(23), no: "FT-0002" },
    { from: hdfc, to: axis, amount: 175000, date: demoDateAt(24), no: "FT-0003" },
    { from: sbi, to: kotak, amount: 85000, date: demoDateAt(25), no: "FT-0004" },
    { from: icici, to: hdfc, amount: 95000, date: demoDateAt(26), no: "FT-0005" },
    { from: hdfc, to: sbi, amount: 110000, date: demoDateAt(27), no: "FT-0006" },
    { from: axis, to: icici, amount: 65000, date: demoDateAt(28), no: "FT-0007" },
    { from: kotak, to: hdfc, amount: 45000, date: demoDateAt(29), no: "FT-0008" },
  ];

  for (const t of transfers) {
    if (!t.from || !t.to) continue;
    const v = createVoucher("contra", {
      date: t.date,
      referenceNo: t.no,
      narration: `Fund transfer ${t.from.accountName} → ${t.to.accountName}`,
      status: "posted",
      lines: [
        { id: 1, ledgerId: t.to.id, ledgerName: t.to.accountName, debit: t.amount, credit: 0, remarks: "Transfer in" },
        { id: 2, ledgerId: t.from.id, ledgerName: t.from.accountName, debit: 0, credit: t.amount, remarks: "Transfer out" },
      ],
    });
    setVoucherNumber(v.id, t.no);
  }

  if (bankCharges && hdfc) {
    seedJournal(
      [
        { ledgerId: bankCharges.id, ledgerName: bankCharges.accountName, debit: 2500, credit: 0 },
        { ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 0, credit: 2500 },
      ],
      demoDateAt(7),
      "BCHG-MAY",
      "JV-0001",
      "Bank service charges — May",
    );
    if (icici) {
      seedJournal(
        [
          { ledgerId: bankCharges.id, ledgerName: bankCharges.accountName, debit: 1800, credit: 0 },
          { ledgerId: icici.id, ledgerName: icici.accountName, debit: 0, credit: 1800 },
        ],
        demoDateAt(3),
        "BCHG-JUN",
        "JV-0002",
        "Bank charges — ICICI collection account",
      );
    }
  }

  if (interestIncome && hdfc) {
    seedJournal(
      [
        { ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 8500, credit: 0 },
        { ledgerId: interestIncome.id, ledgerName: interestIncome.accountName, debit: 0, credit: 8500 },
      ],
      demoDateAt(2),
      "INT-MAY",
      "JV-0003",
      "Interest credit — HDFC current account",
    );
    if (icici) {
      seedJournal(
        [
          { ledgerId: icici.id, ledgerName: icici.accountName, debit: 4200, credit: 0 },
          { ledgerId: interestIncome.id, ledgerName: interestIncome.accountName, debit: 0, credit: 4200 },
        ],
        demoDateAt(0),
        "INT-JUN",
        "JV-0004",
        "Interest credit — ICICI collection account",
      );
    }
  }

  const miscJournals = [
    { bank: hdfc, expense: findExpenseLedger("Rent"), amount: 45000, date: demoDateAt(30), no: "JV-0005", narration: "April rent — Head Office" },
    { bank: sbi, expense: findExpenseLedger("Electricity"), amount: 18500, date: demoDateAt(31), no: "JV-0006", narration: "Warehouse electricity — May" },
    { bank: icici, expense: findExpenseLedger("Marketing"), amount: 28000, date: demoDateAt(32), no: "JV-0007", narration: "Marketing campaign payment" },
    { bank: hdfc, expense: findExpenseLedger("Transport"), amount: 32000, date: demoDateAt(33), no: "JV-0008", narration: "Logistics and freight charges" },
  ];

  for (const j of miscJournals) {
    if (!j.bank || !j.expense) continue;
    seedJournal(
      [
        { ledgerId: j.expense.id, ledgerName: j.expense.accountName, debit: j.amount, credit: 0 },
        { ledgerId: j.bank.id, ledgerName: j.bank.accountName, debit: 0, credit: j.amount },
      ],
      j.date,
      j.no,
      j.no,
      j.narration,
    );
  }
}

function seedCashBookTransactions(): void {
  if (loadVouchers().some((v) => v.voucherNumber === "CSH-0001")) return;

  const pettyCash = findCashLedger("Petty");
  const branchCash = findCashLedger("Branch Counter");
  const fieldCash = findCashLedger("Field Staff");
  if (!pettyCash) return;

  const salesIncome = loadChartOfAccounts().find((r) =>
    r.accountName.toLowerCase().includes("fertilizer sales"),
  );
  const officeExpense = findExpenseLedger("Office") ?? findExpenseLedger("Stationery");
  const transportExpense = findExpenseLedger("Transport");
  const { hdfc } = getDemoBankLedgers();

  const cashEntries: Array<{
    cash: ChartOfAccount | null;
    type: "receipt" | "payment";
    counterparty: { id: number; name: string } | null;
    amount: number;
    date: string;
    no: string;
    narration: string;
  }> = [
    { cash: pettyCash, type: "receipt", counterparty: salesIncome ? { id: salesIncome.id, name: salesIncome.accountName } : null, amount: 12500, date: demoDateAt(34), no: "CSH-0001", narration: "Cash sales — counter collection" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 3200, date: demoDateAt(35), no: "CSH-0002", narration: "Petty cash expenses — stationery" },
    { cash: branchCash, type: "receipt", counterparty: salesIncome ? { id: salesIncome.id, name: salesIncome.accountName } : null, amount: 28500, date: demoDateAt(36), no: "CSH-0003", narration: "Cash sales — branch counter" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 1800, date: demoDateAt(37), no: "CSH-0004", narration: "Office expenses — courier charges" },
    { cash: fieldCash, type: "receipt", counterparty: findCustomerLedger("Yavatmal") ? { id: findCustomerLedger("Yavatmal")!.id, name: findCustomerLedger("Yavatmal")!.accountName } : null, amount: 45000, date: demoDateAt(38), no: "CSH-0005", narration: "Farmer collections — field staff" },
    { cash: pettyCash, type: "payment", counterparty: transportExpense ? { id: transportExpense.id, name: transportExpense.accountName } : null, amount: 5600, date: demoDateAt(39), no: "CSH-0006", narration: "Transport charges — local delivery" },
    { cash: branchCash, type: "receipt", counterparty: salesIncome ? { id: salesIncome.id, name: salesIncome.accountName } : null, amount: 18700, date: demoDateAt(40), no: "CSH-0007", narration: "Cash sales — weekend counter" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 2400, date: demoDateAt(41), no: "CSH-0008", narration: "Petty cash expenses — tea and refreshments" },
    { cash: fieldCash, type: "receipt", counterparty: findCustomerLedger("Bharat") ? { id: findCustomerLedger("Bharat")!.id, name: findCustomerLedger("Bharat")!.accountName } : null, amount: 32000, date: demoDateAt(42), no: "CSH-0009", narration: "Farmer collections — Vidarbha region" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 4500, date: demoDateAt(43), no: "CSH-0010", narration: "Office expenses — printing" },
    { cash: branchCash, type: "receipt", counterparty: salesIncome ? { id: salesIncome.id, name: salesIncome.accountName } : null, amount: 22400, date: demoDateAt(44), no: "CSH-0011", narration: "Cash sales — branch collection" },
    { cash: pettyCash, type: "payment", counterparty: transportExpense ? { id: transportExpense.id, name: transportExpense.accountName } : null, amount: 3800, date: demoDateAt(45), no: "CSH-0012", narration: "Petty cash — auto fare" },
    { cash: fieldCash, type: "receipt", counterparty: findCustomerLedger("Konkan") ? { id: findCustomerLedger("Konkan")!.id, name: findCustomerLedger("Konkan")!.accountName } : null, amount: 18500, date: demoDateAt(46), no: "CSH-0013", narration: "Farmer collections — Konkan depot" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 2900, date: demoDateAt(47), no: "CSH-0014", narration: "Office expenses — maintenance" },
    { cash: branchCash, type: "receipt", counterparty: salesIncome ? { id: salesIncome.id, name: salesIncome.accountName } : null, amount: 31200, date: demoDateAt(48), no: "CSH-0015", narration: "Cash sales — branch weekend" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 1500, date: demoDateAt(49), no: "CSH-0016", narration: "Petty cash expenses — misc" },
    { cash: fieldCash, type: "receipt", counterparty: findCustomerLedger("Shree") ? { id: findCustomerLedger("Shree")!.id, name: findCustomerLedger("Shree")!.accountName } : null, amount: 28000, date: demoDateAt(50), no: "CSH-0017", narration: "Farmer collections — seed orders" },
    { cash: branchCash, type: "receipt", counterparty: salesIncome ? { id: salesIncome.id, name: salesIncome.accountName } : null, amount: 15600, date: demoDateAt(51), no: "CSH-0018", narration: "Cash sales — end of month" },
    { cash: pettyCash, type: "payment", counterparty: transportExpense ? { id: transportExpense.id, name: transportExpense.accountName } : null, amount: 4200, date: demoDateAt(52), no: "CSH-0019", narration: "Transport — local pickup" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 2100, date: demoDateAt(53), no: "CSH-0020", narration: "Office expenses — cleaning supplies" },
  ];

  for (const e of cashEntries) {
    if (!e.cash || !e.counterparty) continue;
    if (e.type === "receipt") {
      const v = createVoucher("receipt", {
        date: e.date,
        referenceNo: e.no,
        narration: e.narration,
        status: "posted",
        lines: [
          { id: 1, ledgerId: e.cash.id, ledgerName: e.cash.accountName, debit: e.amount, credit: 0, remarks: e.narration },
          { id: 2, ledgerId: e.counterparty.id, ledgerName: e.counterparty.name, debit: 0, credit: e.amount, remarks: e.narration },
        ],
      });
      setVoucherNumber(v.id, e.no);
    } else {
      const v = createVoucher("payment", {
        date: e.date,
        referenceNo: e.no,
        narration: e.narration,
        status: "posted",
        lines: [
          { id: 1, ledgerId: e.counterparty.id, ledgerName: e.counterparty.name, debit: e.amount, credit: 0, remarks: e.narration },
          { id: 2, ledgerId: e.cash.id, ledgerName: e.cash.accountName, debit: 0, credit: e.amount, remarks: e.narration },
        ],
      });
      setVoucherNumber(v.id, e.no);
    }
  }

  if (hdfc && pettyCash) {
    const v = createVoucher("contra", {
      date: demoDateAt(54),
      referenceNo: "FT-0009",
      narration: "Cash deposit to HDFC Bank",
      status: "posted",
      lines: [
        { id: 1, ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 50000, credit: 0, remarks: "Cash deposit" },
        { id: 2, ledgerId: pettyCash.id, ledgerName: pettyCash.accountName, debit: 0, credit: 50000, remarks: "Cash out" },
      ],
    });
    setVoucherNumber(v.id, "FT-0009");
  }
}

function clearFundTransferModuleData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(FUND_TRANSFER_STORAGE_KEY);
  localStorage.removeItem(FUND_TRANSFER_SEED_KEY);
}

export function seedBankingDemoData(force = false): void {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(VERSION_KEY);
  if (!force && stored === BANKING_DEMO_SEED_VERSION) return;

  clearFundTransferModuleData();

  if (force || stored !== BANKING_DEMO_SEED_VERSION) {
    removeBankingDemoVouchers();
  }

  ensureDemoBankAccounts();
  seedBankBookTransactions(force);
  seedCashBookTransactions();

  localStorage.setItem(VERSION_KEY, BANKING_DEMO_SEED_VERSION);
}

export function ensureBankingDemoOnPageLoad(): void {
  if (typeof window === "undefined") return;
  ensureClientReviewBankingSeed();
}

/** Non-blocking — use in page mount effects instead of ensureBankingDemoOnPageLoad(). */
export function scheduleBankingDemoOnPageLoad(): void {
  scheduleDeferredDemoSeed("banking-demo", ensureBankingDemoOnPageLoad);
}

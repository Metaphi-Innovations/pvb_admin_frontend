/**
 * Banking module demo seed — bank book (50+), cash book (20+), fund transfers (10).
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
import {
  formatTransferAccountName,
  saveFundTransferSeed,
  type FundTransferMode,
  type FundTransferRecord,
} from "@/lib/accounts/fund-transfer-data";
import { getLedgersUnderSubGroupName } from "@/lib/accounts/coa-hierarchy";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";

export const BANKING_DEMO_SEED_VERSION = "2026-jul-fund-transfer-v2";
const VERSION_KEY = "ds_banking_demo_seed_version";
const FUND_TRANSFER_SEED_KEY = "ds_fund_transfer_demo_seed_version";
export const FUND_TRANSFER_DEMO_SEED_VERSION = "2026-jul-ft-v2";

function findBankLedger(accountNumberSuffix: string) {
  const master = loadBankAccountMasters().find((m) =>
    m.accountNumber.replace(/\D/g, "").endsWith(accountNumberSuffix.replace(/\D/g, "")),
  );
  if (!master) return null;
  return loadChartOfAccounts().find((r) => r.id === master.coaLedgerId) ?? null;
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

function seedBankBookTransactions(): void {
  if (loadVouchers().some((v) => v.voucherNumber === "RV-0001")) return;

  const hdfc = findBankLedger("7890");
  const icici = findBankLedger("5678");
  const sbi = findBankLedger("4321");
  const axis = findBankLedger("8901");
  const kotak = findBankLedger("3210");
  if (!hdfc || !icici || !sbi) return;

  const abc = findCustomerLedger("ABC Agro");
  const krishna = findCustomerLedger("Krishna Retail");
  const greenHarvest = findCustomerLedger("Green Harvest");
  const agrochem = findVendorLedger("AgroChem");
  const greenField = findVendorLedger("GreenField");
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
    { bank: hdfc, party: abc, amount: 185000, date: "2026-04-08", ref: "NEFT-001", no: "RV-0001", narration: "Sales collection — ABC Agro Distributor" },
    { bank: hdfc, party: krishna, amount: 92000, date: "2026-04-12", ref: "NEFT-002", no: "RV-0002", narration: "Customer receipt — Krishna Retail Store" },
    { bank: icici, party: greenHarvest, amount: 145000, date: "2026-04-15", ref: "NEFT-003", no: "RV-0003", narration: "Sales collection — Green Harvest Agro" },
    { bank: icici, party: abc, amount: 68000, date: "2026-04-22", ref: "NEFT-004", no: "RV-0004", narration: "Farmer collection — ABC Agro partial" },
    { bank: sbi, party: krishna, amount: 54000, date: "2026-05-03", ref: "NEFT-005", no: "RV-0005", narration: "Cash sales collection deposited" },
    { bank: hdfc, party: greenHarvest, amount: 210000, date: "2026-05-10", ref: "NEFT-006", no: "RV-0006", narration: "Sales collection — bulk urea order" },
    { bank: icici, party: abc, amount: 125000, date: "2026-05-18", ref: "NEFT-007", no: "RV-0007", narration: "Customer receipt against INV-2026-003" },
    { bank: sbi, party: krishna, amount: 78000, date: "2026-05-25", ref: "NEFT-008", no: "RV-0008", narration: "Sales collection — Krishna Retail" },
    { bank: hdfc, party: greenHarvest, amount: 95000, date: "2026-06-02", ref: "NEFT-009", no: "RV-0009", narration: "Collection against outstanding invoice" },
    { bank: icici, party: abc, amount: 156000, date: "2026-06-08", ref: "NEFT-010", no: "RV-0010", narration: "Sales collection — distributor payment" },
    { bank: kotak, party: krishna, amount: 42000, date: "2026-06-12", ref: "NEFT-011", no: "RV-0011", narration: "Customer receipt — retail counter" },
    { bank: hdfc, party: abc, amount: 88000, date: "2026-06-15", ref: "NEFT-012", no: "RV-0012", narration: "Farmer collection — seasonal payment" },
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
    { bank: hdfc, party: agrochem, amount: 245000, date: "2026-04-10", ref: "PAY-001", no: "PV-0001", narration: "Supplier payment — AgroChem Traders" },
    { bank: icici, party: greenField, amount: 118000, date: "2026-04-18", ref: "PAY-002", no: "PV-0002", narration: "Supplier payment — GreenField Suppliers" },
    { bank: sbi, party: agrochem, amount: 86000, date: "2026-04-28", ref: "PAY-003", no: "PV-0003", narration: "Supplier payment — fertilizer purchase" },
    { bank: hdfc, party: greenField, amount: 195000, date: "2026-05-05", ref: "PAY-004", no: "PV-0004", narration: "Supplier payment — seed procurement" },
    { bank: axis, party: agrochem, amount: 320000, date: "2026-05-12", ref: "PAY-005", no: "PV-0005", narration: "Salary disbursement via Axis account" },
    { bank: icici, party: greenField, amount: 142000, date: "2026-05-20", ref: "PAY-006", no: "PV-0006", narration: "Supplier payment — pesticide stock" },
    { bank: hdfc, party: agrochem, amount: 98000, date: "2026-05-28", ref: "PAY-007", no: "PV-0007", narration: "Supplier payment — partial settlement" },
    { bank: sbi, party: greenField, amount: 76000, date: "2026-06-03", ref: "PAY-008", no: "PV-0008", narration: "Supplier payment — operations account" },
    { bank: icici, party: agrochem, amount: 210000, date: "2026-06-10", ref: "PAY-009", no: "PV-0009", narration: "Supplier payment — bulk DAP order" },
    { bank: hdfc, party: greenField, amount: 134000, date: "2026-06-18", ref: "PAY-010", no: "PV-0010", narration: "Supplier payment — June settlement" },
  ];

  for (const p of payments) {
    if (!p.bank || !p.party) continue;
    seedPayment(p.bank.id, p.bank.accountName, p.party.id, p.party.accountName, p.amount, p.date, p.ref, p.no, p.narration);
  }

  const transfers = [
    { from: hdfc, to: icici, amount: 200000, date: "2026-04-20", no: "FT-0001" },
    { from: icici, to: sbi, amount: 125000, date: "2026-04-28", no: "FT-0002" },
    { from: hdfc, to: axis, amount: 175000, date: "2026-05-08", no: "FT-0003" },
    { from: sbi, to: kotak, amount: 85000, date: "2026-05-15", no: "FT-0004" },
    { from: icici, to: hdfc, amount: 95000, date: "2026-05-22", no: "FT-0005" },
    { from: hdfc, to: sbi, amount: 110000, date: "2026-06-01", no: "FT-0006" },
    { from: axis, to: icici, amount: 65000, date: "2026-06-08", no: "FT-0007" },
    { from: kotak, to: hdfc, amount: 45000, date: "2026-06-12", no: "FT-0008" },
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
      "2026-05-05",
      "BCHG-MAY",
      "JV-0001",
      "Bank service charges — May 2026",
    );
    seedJournal(
      [
        { ledgerId: bankCharges.id, ledgerName: bankCharges.accountName, debit: 1800, credit: 0 },
        { ledgerId: icici.id, ledgerName: icici.accountName, debit: 0, credit: 1800 },
      ],
      "2026-06-05",
      "BCHG-JUN",
      "JV-0002",
      "Bank charges — ICICI collection account",
    );
  }

  if (interestIncome && hdfc) {
    seedJournal(
      [
        { ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 8500, credit: 0 },
        { ledgerId: interestIncome.id, ledgerName: interestIncome.accountName, debit: 0, credit: 8500 },
      ],
      "2026-05-30",
      "INT-MAY",
      "JV-0003",
      "Interest credit — HDFC current account",
    );
    seedJournal(
      [
        { ledgerId: icici.id, ledgerName: icici.accountName, debit: 4200, credit: 0 },
        { ledgerId: interestIncome.id, ledgerName: interestIncome.accountName, debit: 0, credit: 4200 },
      ],
      "2026-06-30",
      "INT-JUN",
      "JV-0004",
      "Interest credit — ICICI collection account",
    );
  }

  const miscJournals = [
    { bank: hdfc, expense: findExpenseLedger("Rent"), amount: 45000, date: "2026-04-05", no: "JV-0005", narration: "April rent — Head Office" },
    { bank: sbi, expense: findExpenseLedger("Electricity"), amount: 18500, date: "2026-05-08", no: "JV-0006", narration: "Warehouse electricity — May" },
    { bank: icici, expense: findExpenseLedger("Marketing"), amount: 28000, date: "2026-05-15", no: "JV-0007", narration: "Marketing campaign payment" },
    { bank: hdfc, expense: findExpenseLedger("Transport"), amount: 32000, date: "2026-06-02", no: "JV-0008", narration: "Logistics and freight charges" },
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
  const hdfc = findBankLedger("7890");

  const cashEntries: Array<{
    cash: ChartOfAccount | null;
    type: "receipt" | "payment";
    counterparty: { id: number; name: string } | null;
    amount: number;
    date: string;
    no: string;
    narration: string;
  }> = [
    { cash: pettyCash, type: "receipt", counterparty: salesIncome ? { id: salesIncome.id, name: salesIncome.accountName } : null, amount: 12500, date: "2026-04-03", no: "CSH-0001", narration: "Cash sales — counter collection" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 3200, date: "2026-04-08", no: "CSH-0002", narration: "Petty cash expenses — stationery" },
    { cash: branchCash, type: "receipt", counterparty: salesIncome ? { id: salesIncome.id, name: salesIncome.accountName } : null, amount: 28500, date: "2026-04-12", no: "CSH-0003", narration: "Cash sales — branch counter" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 1800, date: "2026-04-15", no: "CSH-0004", narration: "Office expenses — courier charges" },
    { cash: fieldCash, type: "receipt", counterparty: findCustomerLedger("Yavatmal") ? { id: findCustomerLedger("Yavatmal")!.id, name: findCustomerLedger("Yavatmal")!.accountName } : null, amount: 45000, date: "2026-04-20", no: "CSH-0005", narration: "Farmer collections — field staff" },
    { cash: pettyCash, type: "payment", counterparty: transportExpense ? { id: transportExpense.id, name: transportExpense.accountName } : null, amount: 5600, date: "2026-04-25", no: "CSH-0006", narration: "Transport charges — local delivery" },
    { cash: branchCash, type: "receipt", counterparty: salesIncome ? { id: salesIncome.id, name: salesIncome.accountName } : null, amount: 18700, date: "2026-05-02", no: "CSH-0007", narration: "Cash sales — weekend counter" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 2400, date: "2026-05-08", no: "CSH-0008", narration: "Petty cash expenses — tea and refreshments" },
    { cash: fieldCash, type: "receipt", counterparty: findCustomerLedger("Bharat") ? { id: findCustomerLedger("Bharat")!.id, name: findCustomerLedger("Bharat")!.accountName } : null, amount: 32000, date: "2026-05-12", no: "CSH-0009", narration: "Farmer collections — Vidarbha region" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 4500, date: "2026-05-18", no: "CSH-0010", narration: "Office expenses — printing" },
    { cash: branchCash, type: "receipt", counterparty: salesIncome ? { id: salesIncome.id, name: salesIncome.accountName } : null, amount: 22400, date: "2026-05-22", no: "CSH-0011", narration: "Cash sales — branch collection" },
    { cash: pettyCash, type: "payment", counterparty: transportExpense ? { id: transportExpense.id, name: transportExpense.accountName } : null, amount: 3800, date: "2026-05-28", no: "CSH-0012", narration: "Petty cash — auto fare" },
    { cash: fieldCash, type: "receipt", counterparty: findCustomerLedger("Konkan") ? { id: findCustomerLedger("Konkan")!.id, name: findCustomerLedger("Konkan")!.accountName } : null, amount: 18500, date: "2026-06-03", no: "CSH-0013", narration: "Farmer collections — Konkan depot" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 2900, date: "2026-06-08", no: "CSH-0014", narration: "Office expenses — maintenance" },
    { cash: branchCash, type: "receipt", counterparty: salesIncome ? { id: salesIncome.id, name: salesIncome.accountName } : null, amount: 31200, date: "2026-06-12", no: "CSH-0015", narration: "Cash sales — branch weekend" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 1500, date: "2026-06-15", no: "CSH-0016", narration: "Petty cash expenses — misc" },
    { cash: fieldCash, type: "receipt", counterparty: findCustomerLedger("Shree") ? { id: findCustomerLedger("Shree")!.id, name: findCustomerLedger("Shree")!.accountName } : null, amount: 28000, date: "2026-06-18", no: "CSH-0017", narration: "Farmer collections — seed orders" },
    { cash: branchCash, type: "receipt", counterparty: salesIncome ? { id: salesIncome.id, name: salesIncome.accountName } : null, amount: 15600, date: "2026-06-20", no: "CSH-0018", narration: "Cash sales — end of month" },
    { cash: pettyCash, type: "payment", counterparty: transportExpense ? { id: transportExpense.id, name: transportExpense.accountName } : null, amount: 4200, date: "2026-06-22", no: "CSH-0019", narration: "Transport — local pickup" },
    { cash: pettyCash, type: "payment", counterparty: officeExpense ? { id: officeExpense.id, name: officeExpense.accountName } : null, amount: 2100, date: "2026-06-25", no: "CSH-0020", narration: "Office expenses — cleaning supplies" },
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
      date: "2026-05-10",
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

function seedFundTransferRecords(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(FUND_TRANSFER_SEED_KEY) === FUND_TRANSFER_DEMO_SEED_VERSION) return;

  const hdfc = findBankLedger("7890");
  const icici = findBankLedger("5678");
  const sbi = findBankLedger("4321");
  const axis = findBankLedger("8901");
  const pettyCash = findCashLedger("Petty");
  if (!hdfc || !icici || !sbi || !axis || !pettyCash) return;

  const specs: Array<{
    mode: FundTransferMode;
    from: number;
    to: number;
    amount: number;
    date: string;
    transferNo: string;
    referenceNo: string;
    narration: string;
    status: FundTransferRecord["status"];
  }> = [
    {
      mode: "neft",
      from: hdfc.id,
      to: icici.id,
      amount: 100000,
      date: "2026-04-20",
      transferNo: "FT-0001",
      referenceNo: "NEFT-HDFC-ICICI-0420",
      narration: "HDFC → ICICI working capital transfer",
      status: "completed",
    },
    {
      mode: "rtgs",
      from: icici.id,
      to: sbi.id,
      amount: 125000,
      date: "2026-04-28",
      transferNo: "FT-0002",
      referenceNo: "RTGS-ICICI-SBI-0428",
      narration: "ICICI → SBI operations funding",
      status: "completed",
    },
    {
      mode: "neft",
      from: hdfc.id,
      to: axis.id,
      amount: 175000,
      date: "2026-05-08",
      transferNo: "FT-0003",
      referenceNo: "NEFT-HDFC-AXIS-0508",
      narration: "HDFC → Axis OD account salary funding",
      status: "completed",
    },
    {
      mode: "cash_deposit",
      from: pettyCash.id,
      to: hdfc.id,
      amount: 50000,
      date: "2026-05-10",
      transferNo: "FT-0004",
      referenceNo: "",
      narration: "Cash deposit to HDFC Bank Current Account",
      status: "completed",
    },
    {
      mode: "neft",
      from: sbi.id,
      to: icici.id,
      amount: 85000,
      date: "2026-05-15",
      transferNo: "FT-0005",
      referenceNo: "NEFT-SBI-ICICI-0515",
      narration: "SBI → ICICI collection sweep",
      status: "completed",
    },
    {
      mode: "cash_withdrawal",
      from: icici.id,
      to: pettyCash.id,
      amount: 25000,
      date: "2026-05-20",
      transferNo: "FT-0006",
      referenceNo: "",
      narration: "Cash withdrawal from ICICI for petty cash replenishment",
      status: "completed",
    },
    {
      mode: "imps",
      from: icici.id,
      to: hdfc.id,
      amount: 95000,
      date: "2026-05-22",
      transferNo: "FT-0007",
      referenceNo: "IMPS-ICICI-HDFC-0522",
      narration: "ICICI → HDFC surplus transfer",
      status: "completed",
    },
    {
      mode: "neft",
      from: hdfc.id,
      to: sbi.id,
      amount: 110000,
      date: "2026-06-01",
      transferNo: "FT-0008",
      referenceNo: "NEFT-HDFC-SBI-0601",
      narration: "HDFC → SBI vendor payment buffer",
      status: "completed",
    },
    {
      mode: "upi",
      from: axis.id,
      to: icici.id,
      amount: 65000,
      date: "2026-06-08",
      transferNo: "FT-0009",
      referenceNo: "UPI-AXIS-ICICI-0608",
      narration: "Axis OD → ICICI quick transfer",
      status: "completed",
    },
    {
      mode: "cash_deposit",
      from: pettyCash.id,
      to: icici.id,
      amount: 35000,
      date: "2026-06-12",
      transferNo: "FT-0010",
      referenceNo: "",
      narration: "Cash deposit to ICICI Bank Current Account",
      status: "completed",
    },
    {
      mode: "cheque",
      from: hdfc.id,
      to: axis.id,
      amount: 78000,
      date: "2026-06-15",
      transferNo: "FT-0011",
      referenceNo: "CHQ-784521",
      narration: "Cheque transfer HDFC → Axis OD account",
      status: "completed",
    },
    {
      mode: "rtgs",
      from: sbi.id,
      to: hdfc.id,
      amount: 142000,
      date: "2026-06-18",
      transferNo: "FT-0012",
      referenceNo: "RTGS-SBI-HDFC-0618",
      narration: "SBI → HDFC end-of-month consolidation",
      status: "completed",
    },
    {
      mode: "neft",
      from: icici.id,
      to: axis.id,
      amount: 92000,
      date: "2026-06-22",
      transferNo: "FT-0013",
      referenceNo: "NEFT-ICICI-AXIS-0622",
      narration: "ICICI → Axis payment account top-up",
      status: "completed",
    },
    {
      mode: "cash_withdrawal",
      from: hdfc.id,
      to: pettyCash.id,
      amount: 18000,
      date: "2026-06-25",
      transferNo: "FT-0014",
      referenceNo: "",
      narration: "ATM cash withdrawal for field collections float",
      status: "completed",
    },
    {
      mode: "neft",
      from: hdfc.id,
      to: icici.id,
      amount: 45000,
      date: "2026-06-28",
      transferNo: "FT-0015",
      referenceNo: "NEFT-HDFC-ICICI-0628",
      narration: "Cancelled transfer — duplicate entry reversed",
      status: "cancelled",
    },
  ];

  const seeded: FundTransferRecord[] = specs.map((s, index) => {
    const existingVoucher = loadVouchers().find(
      (v) => v.voucherNumber === s.transferNo || v.referenceNo === s.transferNo,
    );
    return {
      id: index + 1,
      transferDate: s.date,
      transferNo: s.transferNo,
      transferMode: s.mode,
      fromAccountId: s.from,
      fromAccountName: formatTransferAccountName(s.from),
      toAccountId: s.to,
      toAccountName: formatTransferAccountName(s.to),
      amount: s.amount,
      referenceNo: s.referenceNo,
      narration: s.narration,
      status: s.status,
      voucherId: existingVoucher?.id ?? null,
      financialYearId: 1,
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
      createdDate: s.date,
      updatedDate: s.date,
    };
  });

  saveFundTransferSeed(seeded);
  localStorage.setItem(FUND_TRANSFER_SEED_KEY, FUND_TRANSFER_DEMO_SEED_VERSION);
}

export function seedBankingDemoData(force = false): void {
  if (typeof window === "undefined") return;
  if (!force && localStorage.getItem(VERSION_KEY) === BANKING_DEMO_SEED_VERSION) return;

  ensureDemoBankAccounts();
  seedBankBookTransactions();
  seedCashBookTransactions();
  seedFundTransferRecords();

  localStorage.setItem(VERSION_KEY, BANKING_DEMO_SEED_VERSION);
}

export function ensureBankingDemoOnPageLoad(): void {
  ensureDemoBankAccounts();
  if (loadBankAccountMasters().length === 0) {
    seedBankingDemoData(true);
    return;
  }
  const voucherCount = loadVouchers().filter(
    (v) =>
      (v.status === "posted" || v.status === "approved") &&
      (v.voucherNumber.startsWith("RV-") ||
        v.voucherNumber.startsWith("PV-") ||
        v.voucherNumber.startsWith("FT-") ||
        v.voucherNumber.startsWith("CSH-")),
  ).length;
  if (voucherCount < 30) {
    seedBankingDemoData(true);
  }
  seedFundTransferRecords();
}

/**
 * Demo ledger balance seeding — assigns realistic opening balances and posts
 * vouchers so every ledger derives current balance from actual transactions.
 */

import { createVoucher } from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  getCoaLedgers,
  loadChartOfAccounts,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { getAncestorPath } from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import {
  computeBatchRegister,
  computeBatchRegisterProductSummary,
  ensureInventoryAccountingLedgers,
} from "@/lib/accounts/inventory-accounting-data";
import { ensurePricingDemoSeed } from "@/app/(app)/masters/pricing/pricing-data";
import { ensureGstAccountingLedgers } from "@/lib/accounts/gst-accounting";
import { loadBankAccountMasters } from "@/lib/accounts/bank-accounts-data";

const FY_OPENING_DATE = "2026-04-01";

/** Deterministic amount from ledger name — stable across reloads */
function hashAmount(name: string, base: number, spread = 45000): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const bump = Math.abs(h) % spread;
  return Math.round((base + bump) / 100) * 100;
}

const ASSET_SUBGROUP_BASE: Record<string, number> = {
  "Land & Building": 4200000,
  "Plant & Machinery": 1850000,
  "Furniture & Fixtures": 320000,
  "Office Equipment": 185000,
  "Computers & IT Equipment": 240000,
  Vehicles: 650000,
  "Intangible Assets": 380000,
  "Cash-in-Hand": 35000,
  "Inventory / Stock-in-Hand": 0,
  "Loans & Advances Given": 95000,
  Deposits: 75000,
  "Prepaid Expenses": 42000,
  "Accrued Income": 28000,
  "Other Current Assets": 65000,
  "Short-Term Investments": 500000,
  "Long-Term Investments": 750000,
  "Other Investments": 120000,
};

const LIABILITY_SUBGROUP_BASE: Record<string, number> = {
  "Proprietor / Partner / Shareholder Capital": 5000000,
  Drawings: 180000,
  "Reserves & Surplus": 850000,
  "Retained Earnings": 1200000,
  "Secured Loans": 2200000,
  "Unsecured Loans": 450000,
  "Bank Loans": 1500000,
  "NBFC Loans": 680000,
  "Director / Related Party Loans": 320000,
  "Trade Payables / Sundry Creditors": 0,
  "Duties & Taxes Payable": 85000,
  "TDS Payable": 42000,
  "GST Payable": 95000,
  "PF / ESIC Payable": 78000,
  "Salary Payable": 125000,
  "Expenses Payable": 65000,
  "Advance Received from Customers": 95000,
  "Other Current Liabilities": 55000,
  "Provision for Tax": 180000,
  "Provision for Audit Fees": 45000,
  "Provision for Expenses": 92000,
  "Other Provisions": 38000,
};

const SKIP_OPENING_SUBGROUPS = new Set([
  "Bank Accounts",
  "Trade Receivables / Sundry Debtors",
  "Trade Payables / Sundry Creditors",
  "Inventory / Stock-in-Hand",
]);

function subGroupName(records: ChartOfAccount[], ledger: ChartOfAccount): string {
  const path = getAncestorPath(records, ledger.id);
  return path.find((n) => n.nodeLevel === "sub_group")?.accountName ?? "";
}

function findLedger(name: string): ChartOfAccount | undefined {
  return loadChartOfAccounts().find(
    (r) =>
      (r.nodeLevel === "ledger" || r.nodeLevel === "sub_ledger") &&
      r.accountName.toLowerCase() === name.toLowerCase(),
  );
}

/** Resolve demo seed shorthand (e.g. "HDFC Bank") to the actual bank account COA ledger. */
function resolveLedger(name: string): ChartOfAccount | undefined {
  const exact = findLedger(name);
  if (exact) return exact;

  const lower = name.trim().toLowerCase();

  const bankMaster = loadBankAccountMasters().find(
    (m) =>
      m.bankName.toLowerCase() === lower ||
      m.accountNickname.toLowerCase() === lower,
  );
  if (bankMaster) {
    return loadChartOfAccounts().find((r) => r.id === bankMaster.coaLedgerId);
  }

  // Demo journal entries reference bank group names, not account nicknames.
  if (lower === "hdfc bank") {
    const hdfc = loadBankAccountMasters().find((m) => m.bankName === "HDFC Bank");
    if (hdfc) return loadChartOfAccounts().find((r) => r.id === hdfc.coaLedgerId);
  }
  if (lower === "axis bank") {
    const axis = loadBankAccountMasters().find((m) => m.bankName === "Axis Bank");
    if (axis) return loadChartOfAccounts().find((r) => r.id === axis.coaLedgerId);
  }
  if (lower === "icici bank") {
    const icici = loadBankAccountMasters().find((m) => m.bankName === "ICICI Bank");
    if (icici) return loadChartOfAccounts().find((r) => r.id === icici.coaLedgerId);
  }
  if (lower === "sbi") {
    const sbi = loadBankAccountMasters().find((m) => m.bankName === "SBI");
    if (sbi) return loadChartOfAccounts().find((r) => r.id === sbi.coaLedgerId);
  }

  // Fallback when COA bank ledger exists but bank master record is missing.
  const bankGroupAliases: Record<string, string> = {
    "hdfc bank": "hdfc",
    "axis bank": "axis",
    "icici bank": "icici",
    sbi: "sbi",
  };
  const needle = bankGroupAliases[lower];
  if (needle) {
    return loadChartOfAccounts().find(
      (r) =>
        r.bankAccountFlag &&
        r.accountName.toLowerCase().includes(needle) &&
        !r.accountName.toLowerCase().includes("service") &&
        !r.accountName.toLowerCase().includes("loan") &&
        !r.accountName.toLowerCase().includes("interest") &&
        !r.accountName.toLowerCase().includes("deposit"),
    );
  }

  return undefined;
}

function requireLedger(name: string): ChartOfAccount {
  const ledger = resolveLedger(name);
  if (!ledger) throw new Error(`Ledger not found: ${name}`);
  return ledger;
}

/** Assign opening balances to balance-sheet ledgers (assets & liabilities). */
export function assignDemoOpeningBalances(): void {
  const records = loadChartOfAccounts();
  let changed = false;

  for (const ledger of getCoaLedgers()) {
    const sg = subGroupName(records, ledger);
    if (SKIP_OPENING_SUBGROUPS.has(sg)) continue;
    if (ledger.openingBalance > 0) continue;

    if (ledger.accountType === "Asset") {
      const base = ASSET_SUBGROUP_BASE[sg] ?? 85000;
      const amount = hashAmount(ledger.accountName, base);
      if (amount <= 0) continue;
      const idx = records.findIndex((r) => r.id === ledger.id);
      if (idx >= 0) {
        records[idx] = { ...records[idx], openingBalance: amount, balanceType: "Debit" };
        changed = true;
      }
    } else if (ledger.accountType === "Liability") {
      const base = LIABILITY_SUBGROUP_BASE[sg] ?? 95000;
      const amount = hashAmount(ledger.accountName, base);
      if (amount <= 0) continue;
      const idx = records.findIndex((r) => r.id === ledger.id);
      if (idx >= 0) {
        records[idx] = { ...records[idx], openingBalance: amount, balanceType: "Credit" };
        changed = true;
      }
    }
  }

  if (changed) saveChartOfAccounts(records);
}

const PRODUCT_INVENTORY_MAP: Array<{ pattern: RegExp; ledgerName: string }> = [
  { pattern: /urea/i, ledgerName: "Urea 50kg Stock" },
  { pattern: /dap/i, ledgerName: "DAP Fertilizer Stock" },
  { pattern: /npk|10:26:26|fertilizer/i, ledgerName: "NPK Fertilizer Stock" },
  { pattern: /pesticide|chlorpyrifos|imidacloprid|mancozeb/i, ledgerName: "Pesticide Inventory" },
  { pattern: /seed|maize|hybrid/i, ledgerName: "Seed Inventory" },
  { pattern: /zinc|micronutrient|bio|humic/i, ledgerName: "NPK Fertilizer Stock" },
];

function mapProductToInventoryLedger(product: string): string {
  for (const { pattern, ledgerName } of PRODUCT_INVENTORY_MAP) {
    if (pattern.test(product)) return ledgerName;
  }
  return "NPK Fertilizer Stock";
}

/** Post opening stock journal from Warehouse Batch Register valuation. */
export function seedInventoryLedgersFromBatchRegister(): void {
  ensurePricingDemoSeed();
  ensureInventoryAccountingLedgers();

  const batchRows = computeBatchRegister({ asOnDate: FY_OPENING_DATE });
  const productSummary = computeBatchRegisterProductSummary(batchRows);

  const byLedger = new Map<string, number>();
  for (const row of productSummary) {
    if (row.inventoryValue <= 0) continue;
    const ledgerName = mapProductToInventoryLedger(row.product);
    byLedger.set(ledgerName, (byLedger.get(ledgerName) ?? 0) + row.inventoryValue);
  }

  if (byLedger.size === 0) {
    byLedger.set("Urea 50kg Stock", 840000);
    byLedger.set("NPK Fertilizer Stock", 620000);
    byLedger.set("DAP Fertilizer Stock", 410000);
    byLedger.set("Pesticide Inventory", 285000);
    byLedger.set("Seed Inventory", 195000);
  }

  for (const [ledgerName, value] of byLedger) {
    const ledger = findLedger(ledgerName);
    if (!ledger || value <= 0) continue;

    const records = loadChartOfAccounts();
    const idx = records.findIndex((r) => r.id === ledger.id);
    if (idx >= 0 && records[idx].openingBalance <= 0) {
      records[idx] = { ...records[idx], openingBalance: Math.round(value), balanceType: "Debit" };
      saveChartOfAccounts(records);
    }
  }
}

function postBalancedJournal(
  date: string,
  referenceNo: string,
  narration: string,
  entries: Array<{ ledgerName: string; debit: number; credit: number; remarks?: string }>,
): void {
  const lines = entries.map((e, i) => {
    const ledger = requireLedger(e.ledgerName);
    return {
      id: i + 1,
      ledgerId: ledger.id,
      ledgerName: ledger.accountName,
      debit: e.debit,
      credit: e.credit,
      remarks: e.remarks ?? narration,
    };
  });
  createVoucher("journal", { date, referenceNo, narration, status: "posted", lines });
}

/** Post demo vouchers covering all major transaction types. */
export function seedDemoAccountingVouchers(): void {
  ensureGstAccountingLedgers();

  postBalancedJournal(FY_OPENING_DATE, "OB-SAL-2026", "Opening salary accrual — March 2026", [
    { ledgerName: "HO Salary Expense", debit: 185000, credit: 0 },
    { ledgerName: "Salary Payable - HO Staff", debit: 0, credit: 185000 },
  ]);

  postBalancedJournal("2026-04-05", "JRN-RENT-APR", "April rent — Head Office", [
    { ledgerName: "Head Office Rent", debit: 45000, credit: 0 },
    { ledgerName: "HDFC Bank", debit: 0, credit: 45000 },
  ]);

  postBalancedJournal("2026-04-10", "JRN-DEPR-Q1", "Q1 depreciation provision", [
    { ledgerName: "Depreciation - Plant & Machinery", debit: 42000, credit: 0 },
    { ledgerName: "Depreciation - Buildings", debit: 18000, credit: 0 },
    { ledgerName: "Depreciation - Vehicles", debit: 8500, credit: 0 },
    { ledgerName: "Accumulated Surplus - Prior Years", debit: 0, credit: 68500 },
  ]);

  postBalancedJournal("2026-04-18", "JRN-INT-APR", "Bank interest accrued", [
    { ledgerName: "Accrued Bank Interest Income", debit: 12500, credit: 0 },
    { ledgerName: "Bank Interest - HDFC Current Account", debit: 0, credit: 12500 },
  ]);

  postBalancedJournal("2026-05-01", "JRN-MKT-MAY", "May marketing spend", [
    { ledgerName: "Farmer Awareness Campaign", debit: 28000, credit: 0 },
    { ledgerName: "Google Ads", debit: 15000, credit: 0 },
    { ledgerName: "HDFC Bank", debit: 0, credit: 43000 },
  ]);

  postBalancedJournal("2026-05-08", "JRN-ELEC-MAY", "May electricity charges", [
    { ledgerName: "Warehouse Electricity", debit: 18500, credit: 0 },
    { ledgerName: "Head Office Electricity", debit: 9200, credit: 0 },
    { ledgerName: "Electricity Charges Payable", debit: 0, credit: 27700 },
  ]);

  const hdfc = requireLedger("HDFC Bank");
  const axis = requireLedger("Axis Bank");
  const pettyCash = requireLedger("Office Petty Cash");

  createVoucher("contra", {
    date: "2026-04-25",
    referenceNo: "CONTRA-001",
    narration: "Cash deposited to HDFC Bank",
    status: "posted",
    lines: [
      { id: 1, ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 50000, credit: 0, remarks: "Cash deposit" },
      { id: 2, ledgerId: pettyCash.id, ledgerName: pettyCash.accountName, debit: 0, credit: 50000, remarks: "Cash out" },
    ],
  });

  createVoucher("contra", {
    date: "2026-05-15",
    referenceNo: "CONTRA-002",
    narration: "Fund transfer HDFC → Axis Bank",
    status: "posted",
    lines: [
      { id: 1, ledgerId: axis.id, ledgerName: axis.accountName, debit: 100000, credit: 0, remarks: "Transfer in" },
      { id: 2, ledgerId: hdfc.id, ledgerName: hdfc.accountName, debit: 0, credit: 100000, remarks: "Transfer out" },
    ],
  });

  const abcAgro = requireLedger("ABC Agro Distributor");
  const fertilizerSales = requireLedger("Fertilizer Sales");
  const outputCgst = requireLedger("Output CGST Payable") ?? requireLedger("CGST Payable");
  const outputSgst = requireLedger("Output SGST Payable") ?? requireLedger("SGST Payable");

  createVoucher("credit_note", {
    date: "2026-05-18",
    referenceNo: "CN-2026-001",
    narration: "Credit note — partial return ABC Agro Distributor",
    status: "posted",
    lines: [
      { id: 1, ledgerId: fertilizerSales.id, ledgerName: fertilizerSales.accountName, debit: 8500, credit: 0, remarks: "Sales reversal" },
      { id: 2, ledgerId: outputCgst.id, ledgerName: outputCgst.accountName, debit: 765, credit: 0, remarks: "CGST reversal" },
      { id: 3, ledgerId: outputSgst.id, ledgerName: outputSgst.accountName, debit: 765, credit: 0, remarks: "SGST reversal" },
      { id: 4, ledgerId: abcAgro.id, ledgerName: abcAgro.accountName, debit: 0, credit: 10030, remarks: "CN-2026-001" },
    ],
  });

  const greenField = requireLedger("GreenField Suppliers");
  const fertilizerPurchase = requireLedger("Fertilizer Purchase");
  const inputCgst = requireLedger("CGST Receivable") ?? requireLedger("GST Input Credit (CGST)");
  const inputSgst = requireLedger("SGST Receivable") ?? requireLedger("GST Input Credit (SGST)");

  createVoucher("debit_note", {
    date: "2026-05-20",
    referenceNo: "DN-2026-001",
    narration: "Debit note — purchase return GreenField Suppliers",
    status: "posted",
    lines: [
      { id: 1, ledgerId: greenField.id, ledgerName: greenField.accountName, debit: 11800, credit: 0, remarks: "DN-2026-001" },
      { id: 2, ledgerId: fertilizerPurchase.id, ledgerName: fertilizerPurchase.accountName, debit: 0, credit: 10000, remarks: "Purchase reversal" },
      { id: 3, ledgerId: inputCgst.id, ledgerName: inputCgst.accountName, debit: 0, credit: 900, remarks: "ITC reversal CGST" },
      { id: 4, ledgerId: inputSgst.id, ledgerName: inputSgst.accountName, debit: 0, credit: 900, remarks: "ITC reversal SGST" },
    ],
  });

  postBalancedJournal("2026-05-22", "JRN-BANK-CHG", "Bank service charges — May 2026", [
    { ledgerName: "HDFC Bank Service Charges", debit: 2500, credit: 0 },
    { ledgerName: "HDFC Bank", debit: 0, credit: 2500 },
  ]);

  postBalancedJournal("2026-05-28", "JRN-GST-MAY", "May GST liability accrual", [
    { ledgerName: "Output CGST Payable", debit: 0, credit: 32400 },
    { ledgerName: "Output SGST Payable", debit: 0, credit: 32400 },
    { ledgerName: "GST Payable Control Account", debit: 64800, credit: 0 },
  ]);

  seedIncomeExpenseActivity();
}

/** Spread P&L activity across income and expense ledgers via batched journal entries. */
function seedIncomeExpenseActivity(): void {
  const incomeLedgers = getCoaLedgers().filter((l) => l.accountType === "Income");
  const expenseLedgers = getCoaLedgers().filter((l) => l.accountType === "Expense");
  const retained = findLedger("Current Year Retained Profit") ?? findLedger("Profit & Loss Account");
  if (!retained) return;

  const incomeEntries: Array<{ ledgerName: string; debit: number; credit: number }> = [];
  let incomeTotal = 0;
  for (const l of incomeLedgers) {
    const amount = hashAmount(l.accountName, 12000, 35000);
    if (amount <= 0) continue;
    incomeTotal += amount;
    incomeEntries.push({ ledgerName: l.accountName, debit: 0, credit: amount });
  }
  if (incomeTotal > 0) {
    postBalancedJournal("2026-05-30", "JRN-INC-FY26", "FY26 income recognition — all income ledgers", [
      { ledgerName: retained.accountName, debit: incomeTotal, credit: 0 },
      ...incomeEntries,
    ]);
  }

  const BATCH = 12;
  for (let i = 0; i < expenseLedgers.length; i += BATCH) {
    const batch = expenseLedgers.slice(i, i + BATCH);
    const entries: Array<{ ledgerName: string; debit: number; credit: number }> = [];
    let batchTotal = 0;
    for (const l of batch) {
      const amount = hashAmount(l.accountName, 8000, 22000);
      if (amount <= 0) continue;
      batchTotal += amount;
      entries.push({ ledgerName: l.accountName, debit: amount, credit: 0 });
    }
    if (batchTotal <= 0) continue;
    postBalancedJournal(
      "2026-05-30",
      `JRN-EXP-FY26-${Math.floor(i / BATCH) + 1}`,
      `FY26 expense accrual — batch ${Math.floor(i / BATCH) + 1}`,
      [...entries, { ledgerName: retained.accountName, debit: 0, credit: batchTotal }],
    );
  }
}

/** Customer / vendor prior-period balances posted as opening journal entries. */
export function seedPartyOpeningBalances(
  customers: Array<{ name: string; amount: number }>,
  vendors: Array<{ name: string; amount: number }>,
): void {
  const retained = findLedger("Accumulated Surplus - Prior Years") ?? findLedger("Profit & Loss Account");
  if (!retained) return;

  for (const c of customers) {
    if (c.amount <= 0) continue;
    const customer = findLedger(c.name);
    if (!customer) continue;
    createVoucher("journal", {
      date: FY_OPENING_DATE,
      referenceNo: `OB-REC-${c.name.slice(0, 8).replace(/\s/g, "")}`,
      narration: `Opening receivable — ${c.name}`,
      status: "posted",
      lines: [
        { id: 1, ledgerId: customer.id, ledgerName: customer.accountName, debit: c.amount, credit: 0, remarks: "Prior year outstanding" },
        { id: 2, ledgerId: retained.id, ledgerName: retained.accountName, debit: 0, credit: c.amount, remarks: "Opening balance offset" },
      ],
    });
  }

  for (const v of vendors) {
    if (v.amount <= 0) continue;
    const vendor = findLedger(v.name);
    if (!vendor) continue;
    createVoucher("journal", {
      date: FY_OPENING_DATE,
      referenceNo: `OB-PAY-${v.name.slice(0, 8).replace(/\s/g, "")}`,
      narration: `Opening payable — ${v.name}`,
      status: "posted",
      lines: [
        { id: 1, ledgerId: retained.id, ledgerName: retained.accountName, debit: v.amount, credit: 0, remarks: "Opening balance offset" },
        { id: 2, ledgerId: vendor.id, ledgerName: vendor.accountName, debit: 0, credit: v.amount, remarks: "Prior year outstanding" },
      ],
    });
  }
}

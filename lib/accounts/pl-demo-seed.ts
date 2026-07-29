/**
 * Profit & Loss demo seed — COA hierarchy + posted vouchers for FY 2026–27.
 * Totals flow through the same aggregation logic as production (pl-compute).
 */

import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type AccountType,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { COA_DEMO_VOUCHER_PREFIX } from "@/lib/accounts/coa-ledger-transactions-seed";
import {
  demoDateAt,
  demoFinancialYearStart,
} from "@/lib/accounts/demo-date-utils";
import { ensureAccountsCoreDemoData } from "@/lib/accounts/accounts-demo-seed";
import {
  createVoucher,
  loadVouchers,
  saveVouchers,
  type AccountingVoucher,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";
import type { VoucherTypeCode } from "@/app/(app)/accounts/masters/masters-data";
import { ACCOUNTS_VOUCHERS_UPDATED_EVENT } from "@/lib/accounts/accounts-section-seed";

export const PL_DEMO_SEED_VERSION = "pl-demo-v1";
const VERSION_KEY = "ds_pl_demo_seed_version";
export const PL_DEMO_VOUCHER_PREFIX = "PL-DMO-";

const PL_DEMO_DATES = [
  demoDateAt(1),
  demoDateAt(3),
  demoDateAt(5),
  demoDateAt(8),
  demoDateAt(12),
  demoDateAt(18),
  demoDateAt(25),
  demoDateAt(35),
  demoDateAt(45),
  demoDateAt(55),
  demoDateAt(65),
  demoDateAt(75),
];

let plDemoLedgerIds: Set<number> | null = null;

function findNode(
  name: string,
  nodeLevel?: ChartOfAccount["nodeLevel"],
  parentId?: number,
): ChartOfAccount | undefined {
  const records = loadChartOfAccounts();
  const needle = name.trim().toLowerCase();
  return records.find((r) => {
    if (r.accountName.trim().toLowerCase() !== needle) return false;
    if (nodeLevel && r.nodeLevel !== nodeLevel) return false;
    if (parentId != null && r.parentAccountId !== parentId) return false;
    return true;
  });
}

function findPrimaryGroup(primaryName: string, groupName: string): ChartOfAccount | undefined {
  const primary = findNode(primaryName, "primary_head");
  if (!primary) return undefined;
  return findNode(groupName, "account_group", primary.id);
}

function ensureAccountGroup(
  records: ChartOfAccount[],
  name: string,
  parent: ChartOfAccount,
  codeSuffix: string,
): ChartOfAccount {
  const existing = records.find(
    (r) =>
      r.nodeLevel === "account_group" &&
      r.parentAccountId === parent.id &&
      r.accountName.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (existing) return existing;

  const id = nextId(records);
  const node: ChartOfAccount = {
    id,
    accountCode: codeSuffix,
    accountName: name,
    alias: "",
    accountType: parent.accountType,
    nodeLevel: "account_group",
    parentAccountId: parent.id,
    parentAccount: parent.accountName,
    description: "P&L demo account group",
    status: "active",
    usedIn: ["journal"],
    isSystem: false,
    isSystemGenerated: true,
    openingBalance: 0,
    balanceType: parent.accountType === "Income" ? "Credit" : "Debit",
    gstApplicable: false,
    tdsApplicable: false,
    costCenterApplicable: false,
    bankAccountFlag: false,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
  records.push(node);
  return node;
}

function ensurePostingLedger(
  records: ChartOfAccount[],
  name: string,
  parent: ChartOfAccount,
): ChartOfAccount {
  const existing = records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.parentAccountId === parent.id &&
      r.accountName.trim().toLowerCase() === name.trim().toLowerCase(),
  );
  if (existing) return existing;

  const id = nextId(records);
  const node: ChartOfAccount = {
    id,
    accountCode: `PL-${String(id).padStart(4, "0")}`,
    accountName: name,
    alias: "",
    accountType: parent.accountType,
    nodeLevel: "ledger",
    parentAccountId: parent.id,
    parentAccount: parent.accountName,
    description: "P&L demo posting ledger",
    status: "active",
    usedIn: ["journal", "sales", "procurement"],
    isSystem: false,
    isSystemGenerated: true,
    openingBalance: 0,
    balanceType:
      parent.accountType === "Income" || parent.accountType === "Liability"
        ? "Credit"
        : "Debit",
    gstApplicable: false,
    tdsApplicable: false,
    costCenterApplicable: false,
    bankAccountFlag: false,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
  records.push(node);
  return node;
}

/** Ensure the client-required P&L hierarchy exists in COA. */
export function ensurePlDemoCoaStructure(): ChartOfAccount[] {
  if (typeof window === "undefined") return [];

  const records = loadChartOfAccounts();
  const beforeLen = records.length;

  const income = findNode("Income", "primary_head");
  const expenses = findNode("Expenses", "primary_head");
  const directIncome = income ? findPrimaryGroup("Income", "Direct Income") : undefined;
  const indirectIncome = income ? findPrimaryGroup("Income", "Indirect Income") : undefined;
  const directExpenses = expenses ? findPrimaryGroup("Expenses", "Direct Expenses") : undefined;
  const indirectExpenses = expenses ? findPrimaryGroup("Expenses", "Indirect Expenses") : undefined;

  if (!directIncome || !indirectIncome || !directExpenses || !indirectExpenses) {
    return records;
  }

  const salesAccount = ensureAccountGroup(records, "Sales Account", directIncome, "PL-3101");
  ensurePostingLedger(records, "Sales", salesAccount);
  ensurePostingLedger(records, "Sales Return", salesAccount);

  ensurePostingLedger(records, "Discount Received", indirectIncome);
  ensurePostingLedger(records, "Interest Received", indirectIncome);

  const purchaseAccount = ensureAccountGroup(records, "Purchase Account", directExpenses, "PL-4101");
  ensurePostingLedger(records, "Purchases", purchaseAccount);
  ensurePostingLedger(records, "Purchase Return", purchaseAccount);

  const freightInwardGroup =
    findNode("Freight Inward", "account_group", directExpenses.id) ??
    ensureAccountGroup(records, "Freight Inward", directExpenses, "PL-4113");
  ensurePostingLedger(records, "Freight Inward", freightInwardGroup);

  const carriageInwardGroup = ensureAccountGroup(
    records,
    "Carriage Inward",
    directExpenses,
    "PL-4116",
  );
  ensurePostingLedger(records, "Carriage Inward", carriageInwardGroup);

  const adminGroup = findNode("Administrative Expenses", "account_group", indirectExpenses.id);
  if (adminGroup) {
    ensurePostingLedger(records, "Salary Expense", adminGroup);
    ensurePostingLedger(records, "Rent Expense", adminGroup);
    ensurePostingLedger(records, "Electricity Expense", adminGroup);
  }

  const sellingGroup = ensureAccountGroup(
    records,
    "Selling Expenses",
    indirectExpenses,
    "PL-4231",
  );
  ensurePostingLedger(records, "Freight Outward", sellingGroup);
  ensurePostingLedger(records, "Advertisement Expense", sellingGroup);
  ensurePostingLedger(records, "Sales Promotion Expense", sellingGroup);

  const financialGroup = ensureAccountGroup(
    records,
    "Financial Expenses",
    indirectExpenses,
    "PL-4241",
  );
  ensurePostingLedger(records, "Bank Charges", financialGroup);
  ensurePostingLedger(records, "Interest Expense", financialGroup);

  ensurePostingLedger(records, "Depreciation", indirectExpenses);

  if (records.length !== beforeLen) saveChartOfAccounts(records);

  plDemoLedgerIds = new Set(
    records
      .filter((r) => r.isSystemGenerated && r.description === "P&L demo posting ledger")
      .map((r) => r.id),
  );

  return records;
}

function findPlDemoLedger(name: string): ChartOfAccount | undefined {
  const records = loadChartOfAccounts();
  const needle = name.trim().toLowerCase();
  return records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.isSystemGenerated &&
      r.description === "P&L demo posting ledger" &&
      r.accountName.trim().toLowerCase() === needle,
  );
}

function resolveOffsetLedger(): ChartOfAccount | undefined {
  return (
    findNode("ABC Agro Distributor", "ledger") ??
    findNode("Main Cash", "ledger") ??
    findNode("Accumulated Surplus - Prior Years", "ledger")
  );
}

function activeFinancialYear() {
  const fy =
    loadFinancialYears().find((f) => f.status === "active") ??
    loadFinancialYears().find((f) => f.startDate === demoFinancialYearStart());
  return fy ?? null;
}

function purgePlDemoVouchers(): void {
  const kept = loadVouchers().filter(
    (v) => !v.referenceNo?.startsWith(PL_DEMO_VOUCHER_PREFIX),
  );
  saveVouchers(kept);
}

/** Remove generic COA demo vouchers that touch income/expense ledgers (clean P&L totals). */
function purgeCoaDemoIncomeExpenseVouchers(): void {
  const records = loadChartOfAccounts();
  const plTypes = new Set<AccountType>(["Income", "Expense"]);
  const incomeExpenseIds = new Set(
    records
      .filter((r) => r.nodeLevel === "ledger" && plTypes.has(r.accountType))
      .map((r) => r.id),
  );

  const kept = loadVouchers().filter((v) => {
    if (!v.voucherNumber.startsWith(COA_DEMO_VOUCHER_PREFIX)) return true;
    return !v.lines.some((line) => line.ledgerId != null && incomeExpenseIds.has(line.ledgerId));
  });
  saveVouchers(kept);
}

interface PlPostingSpec {
  ledgerName: string;
  amount: number;
  voucherType: VoucherTypeCode;
  incomeSide?: boolean;
  isReturn?: boolean;
}

function postPlVoucher(
  spec: PlPostingSpec,
  date: string,
  seq: number,
  offset: ChartOfAccount,
  fy: { id: number; name: string },
): void {
  const ledger = findPlDemoLedger(spec.ledgerName);
  if (!ledger) return;

  const amount = spec.amount;
  if (amount <= 0) return;

  let primaryDebit = 0;
  let primaryCredit = 0;

  if (ledger.accountType === "Income") {
    if (spec.isReturn) {
      primaryDebit = amount;
    } else {
      primaryCredit = amount;
    }
  } else {
    if (spec.isReturn) {
      primaryCredit = amount;
    } else {
      primaryDebit = amount;
    }
  }

  const offsetDebit = primaryCredit;
  const offsetCredit = primaryDebit;

  createVoucher(spec.voucherType, {
    date,
    referenceNo: `${PL_DEMO_VOUCHER_PREFIX}${String(seq).padStart(3, "0")}`,
    narration: `P&L demo — ${ledger.accountName}`,
    status: "posted",
    financialYearId: fy.id,
    financialYearName: fy.name,
    lines: [
      {
        id: 1,
        ledgerId: ledger.id,
        ledgerName: ledger.accountName,
        debit: primaryDebit,
        credit: primaryCredit,
        remarks: ledger.accountName,
      },
      {
        id: 2,
        ledgerId: offset.id,
        ledgerName: offset.accountName,
        debit: offsetDebit,
        credit: offsetCredit,
        remarks: "Offset entry",
      },
    ],
  });
}

const PL_POSTING_SPECS: PlPostingSpec[] = [
  { ledgerName: "Sales", amount: 500_000, voucherType: "sales" },
  { ledgerName: "Sales Return", amount: 25_000, voucherType: "credit_note", isReturn: true },
  { ledgerName: "Discount Received", amount: 12_000, voucherType: "receipt" },
  { ledgerName: "Interest Received", amount: 8_000, voucherType: "receipt" },
  { ledgerName: "Purchases", amount: 280_000, voucherType: "purchase" },
  { ledgerName: "Purchase Return", amount: 15_000, voucherType: "debit_note", isReturn: true },
  { ledgerName: "Freight Inward", amount: 18_000, voucherType: "payment" },
  { ledgerName: "Carriage Inward", amount: 7_000, voucherType: "payment" },
  { ledgerName: "Salary Expense", amount: 55_000, voucherType: "payment" },
  { ledgerName: "Rent Expense", amount: 20_000, voucherType: "payment" },
  { ledgerName: "Electricity Expense", amount: 8_000, voucherType: "payment" },
  { ledgerName: "Freight Outward", amount: 12_000, voucherType: "payment" },
  { ledgerName: "Advertisement Expense", amount: 10_000, voucherType: "payment" },
  { ledgerName: "Bank Charges", amount: 3_000, voucherType: "payment" },
  { ledgerName: "Interest Expense", amount: 5_000, voucherType: "payment" },
  { ledgerName: "Depreciation", amount: 12_000, voucherType: "journal" },
];

export function seedPlDemoVouchers(force = false): void {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem(VERSION_KEY);
  if (!force && stored === PL_DEMO_SEED_VERSION) return;

  ensureAccountsCoreDemoData();
  ensurePlDemoCoaStructure();

  const offset = resolveOffsetLedger();
  const fy = activeFinancialYear();
  if (!offset || !fy) return;

  purgePlDemoVouchers();
  purgeCoaDemoIncomeExpenseVouchers();

  PL_POSTING_SPECS.forEach((spec, index) => {
    const date = PL_DEMO_DATES[index % PL_DEMO_DATES.length];
    postPlVoucher(spec, date, index + 1, offset, fy);
  });

  localStorage.setItem(VERSION_KEY, PL_DEMO_SEED_VERSION);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ACCOUNTS_VOUCHERS_UPDATED_EVENT));
  }
}

export function ensurePlDemoOnPageLoad(): void {
  if (typeof window === "undefined") return;
  try {
    ensureAccountsCoreDemoData();
    seedPlDemoVouchers(false);
  } catch (err) {
    console.error("[accounts] P&L demo seed failed:", err);
  }
}

export function getPlDemoLedgerIds(): Set<number> {
  if (!plDemoLedgerIds) {
    ensurePlDemoCoaStructure();
  }
  return plDemoLedgerIds ?? new Set();
}

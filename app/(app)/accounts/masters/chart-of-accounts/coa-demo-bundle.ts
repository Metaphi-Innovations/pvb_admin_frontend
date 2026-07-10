/**
 * Bundled COA demo ledgers — always merged into loadChartOfAccounts().
 * Not stored in localStorage; available in every environment after deploy/refresh.
 */

import type { AccountType, ChartOfAccount } from "../../data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { SYSTEM_COA_NODES } from "../coa-seed-nodes";
import { COA_DEMO_LEDGER_SEEDS, type CoaDemoLedgerSeed } from "../coa-demo-ledgers";

export const COA_DEMO_SOURCE_MODULE = "coa_demo_bundle";

/** Demo seeds skipped where system statutory ledgers are defined in coa-seed-nodes */
const SKIP_STATUTORY_DEMO_SUBGROUPS = new Set([
  "duties & taxes payable",
  "gst input credit",
  "gst output",
  "tds payable",
  "gst payable",
]);

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
  "Trade Receivables / Sundry Debtors": 45000,
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
  "Trade Payables / Sundry Creditors": 55000,
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

const INCOME_SUBGROUP_BASE: Record<string, number> = {
  "Sales Revenue": 0,
};

const EXPENSE_SUBGROUP_BASE: Record<string, number> = {
  Rent: 45000,
  Electricity: 12000,
  "Administrative Expenses": 8500,
};

const SKIP_OPENING_SUBGROUPS = new Set([
  "Bank Accounts",
  "Inventory / Stock-in-Hand",
]);

/** Sundry debtors — minimum 5 posting ledgers under Trade Receivables */
export const COA_DEMO_DEBTOR_SPECS: Array<{ name: string; openingBalance: number }> = [
  { name: "ABC Agro Distributor", openingBalance: 50000 },
  { name: "ABC Distributor", openingBalance: 28500 },
  { name: "Reliance Agri", openingBalance: 47650 },
  { name: "Balaji CNF Services", openingBalance: 42000 },
  { name: "Vidarbha Agro Mart", openingBalance: 15000 },
  { name: "Shree Ganesh Seeds", openingBalance: 12800 },
];

/** Sundry creditors — minimum 5 posting ledgers */
export const COA_DEMO_CREDITOR_SPECS: Array<{ name: string; openingBalance: number }> = [
  { name: "AgroChem Traders", openingBalance: 75000 },
  { name: "Rallis India Ltd", openingBalance: 43000 },
  { name: "GreenField Suppliers", openingBalance: 42000 },
  { name: "Bharat Fertilizers", openingBalance: 95000 },
  { name: "Kisan Inputs Pvt Ltd", openingBalance: 31500 },
  { name: "Crop Care Industries", openingBalance: 54000 },
];

/** Bank group + current account posting ledgers */
export const COA_DEMO_BANK_SPECS: Array<{
  bankName: string;
  accountName: string;
  openingBalance: number;
}> = [
  { bankName: "HDFC Bank", accountName: "HDFC Current Account", openingBalance: 2000000 },
  { bankName: "ICICI Bank", accountName: "ICICI Current Account", openingBalance: 850000 },
  { bankName: "SBI", accountName: "SBI Current Account", openingBalance: 525000 },
  { bankName: "Axis Bank", accountName: "Axis Current Account", openingBalance: 375000 },
  { bankName: "Kotak Bank", accountName: "Kotak Current Account", openingBalance: 220000 },
];

function hashAmount(name: string, base: number, spread = 45000): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  const bump = Math.abs(h) % spread;
  return Math.round((base + bump) / 100) * 100;
}

function stableLedgerId(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return 60000 + (Math.abs(h) % 35000);
}

function defaultBalanceType(accountType: AccountType): "Debit" | "Credit" {
  return accountType === "Liability" || accountType === "Income" ? "Credit" : "Debit";
}

function resolveOpeningBalance(
  entry: CoaDemoLedgerSeed,
  explicit?: number,
): { amount: number; balanceType: "Debit" | "Credit" } {
  if (explicit != null && explicit > 0) {
    const balanceType =
      entry.accountType === "Liability" || entry.accountType === "Income" ? "Credit" : "Debit";
    return { amount: explicit, balanceType };
  }

  if (SKIP_OPENING_SUBGROUPS.has(entry.subGroup)) {
    return { amount: 0, balanceType: defaultBalanceType(entry.accountType) };
  }

  if (entry.accountType === "Asset") {
    const base = ASSET_SUBGROUP_BASE[entry.subGroup] ?? 85000;
    return { amount: hashAmount(entry.name, base), balanceType: "Debit" };
  }
  if (entry.accountType === "Liability") {
    const base = LIABILITY_SUBGROUP_BASE[entry.subGroup] ?? 95000;
    return { amount: hashAmount(entry.name, base), balanceType: "Credit" };
  }
  if (entry.accountType === "Income") {
    const base = INCOME_SUBGROUP_BASE[entry.subGroup] ?? 12000;
    return { amount: hashAmount(entry.name, base, 35000), balanceType: "Credit" };
  }
  const base = EXPENSE_SUBGROUP_BASE[entry.subGroup] ?? 8000;
  return { amount: hashAmount(entry.name, base, 22000), balanceType: "Debit" };
}

function makeDemoLedger(
  partial: Pick<ChartOfAccount, "id" | "accountCode" | "accountName" | "accountType" | "nodeLevel" | "parentAccountId" | "parentAccount" | "status" | "openingBalance" | "balanceType"> &
    Partial<Pick<ChartOfAccount, "alias" | "description" | "bankAccountFlag" | "bankGroupFlag">>,
): ChartOfAccount {
  return {
    ...partial,
    alias: partial.alias ?? "",
    description: partial.description ?? "",
    usedIn: [],
    gstApplicable: false,
    tdsApplicable: false,
    costCenterApplicable: false,
    bankAccountFlag: partial.bankAccountFlag ?? false,
    bankGroupFlag: partial.bankGroupFlag ?? false,
    isSystem: false,
    isSystemGenerated: true,
    erpSourceModule: COA_DEMO_SOURCE_MODULE,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
}

function ledgerKey(parentId: number, name: string): string {
  return `${parentId}|${name.trim().toLowerCase()}`;
}

export function isBundledCoaDemoLedger(record: ChartOfAccount): boolean {
  return record.erpSourceModule === COA_DEMO_SOURCE_MODULE;
}

let cachedBundle: ChartOfAccount[] | null = null;

/** Build full demo ledger list from static seeds (deterministic IDs & codes). */
export function buildBundledCoaDemoLedgers(
  systemNodes: ChartOfAccount[] = SYSTEM_COA_NODES,
): ChartOfAccount[] {
  if (cachedBundle) return cachedBundle;

  const subGroupByName = new Map(
    systemNodes
      .filter((r) => r.nodeLevel === "account_group")
      .map((r) => [r.accountName.trim().toLowerCase(), r]),
  );

  const usedIds = new Set(systemNodes.map((r) => r.id));
  const usedKeys = new Set<string>();
  const result: ChartOfAccount[] = [];
  let codeNum = 1;

  function allocId(key: string): number {
    let id = stableLedgerId(key);
    while (usedIds.has(id)) id += 1;
    usedIds.add(id);
    return id;
  }

  function addLedger(ledger: ChartOfAccount) {
    const key = ledgerKey(ledger.parentAccountId!, ledger.accountName);
    if (usedKeys.has(key)) return;
    usedKeys.add(key);
    result.push(ledger);
  }

  for (const entry of COA_DEMO_LEDGER_SEEDS) {
    if (SKIP_STATUTORY_DEMO_SUBGROUPS.has(entry.subGroup.trim().toLowerCase())) {
      continue;
    }
    const parent = subGroupByName.get(entry.subGroup.trim().toLowerCase());
    if (!parent) continue;

    const id = allocId(`${entry.subGroup}|${entry.name}`);
    const opening = resolveOpeningBalance(entry);

    addLedger(
      makeDemoLedger({
        id,
        accountCode: `LED-DMO-${String(codeNum++).padStart(4, "0")}`,
        accountName: entry.name,
        accountType: entry.accountType,
        nodeLevel: "ledger",
        parentAccountId: parent.id,
        parentAccount: parent.accountName,
        status: "active",
        openingBalance: opening.amount,
        balanceType: opening.balanceType,
      }),
    );
  }

  const debtorsGroup = subGroupByName.get("trade receivables / sundry debtors");
  if (debtorsGroup) {
    for (const spec of COA_DEMO_DEBTOR_SPECS) {
      const id = allocId(`debtor|${spec.name}`);
      addLedger(
        makeDemoLedger({
          id,
          accountCode: `LED-DMO-${String(codeNum++).padStart(4, "0")}`,
          accountName: spec.name,
          accountType: "Asset",
          nodeLevel: "ledger",
          parentAccountId: debtorsGroup.id,
          parentAccount: debtorsGroup.accountName,
          status: "active",
          openingBalance: spec.openingBalance,
          balanceType: "Debit",
        }),
      );
    }
  }

  const creditorsGroup = subGroupByName.get("trade payables / sundry creditors");
  if (creditorsGroup) {
    for (const spec of COA_DEMO_CREDITOR_SPECS) {
      const id = allocId(`creditor|${spec.name}`);
      addLedger(
        makeDemoLedger({
          id,
          accountCode: `LED-DMO-${String(codeNum++).padStart(4, "0")}`,
          accountName: spec.name,
          accountType: "Liability",
          nodeLevel: "ledger",
          parentAccountId: creditorsGroup.id,
          parentAccount: creditorsGroup.accountName,
          status: "active",
          openingBalance: spec.openingBalance,
          balanceType: "Credit",
        }),
      );
    }
  }

  const bankAccountsGroup = subGroupByName.get("bank accounts");
  if (bankAccountsGroup) {
    for (const spec of COA_DEMO_BANK_SPECS) {
      const groupId = allocId(`bank-group|${spec.bankName}`);
      addLedger(
        makeDemoLedger({
          id: groupId,
          accountCode: `LED-DMO-${String(codeNum++).padStart(4, "0")}`,
          accountName: spec.bankName,
          accountType: "Asset",
          nodeLevel: "ledger",
          parentAccountId: bankAccountsGroup.id,
          parentAccount: bankAccountsGroup.accountName,
          status: "active",
          openingBalance: 0,
          balanceType: "Debit",
          bankGroupFlag: true,
        }),
      );

      const accountId = allocId(`bank-account|${spec.accountName}`);
      addLedger(
        makeDemoLedger({
          id: accountId,
          accountCode: `LED-DMO-${String(codeNum++).padStart(4, "0")}`,
          accountName: spec.accountName,
          accountType: "Asset",
          nodeLevel: "ledger",
          parentAccountId: groupId,
          parentAccount: spec.bankName,
          status: "active",
          openingBalance: spec.openingBalance,
          balanceType: "Debit",
          bankAccountFlag: true,
        }),
      );
    }
  }

  cachedBundle = result;
  return result;
}

/** Merge bundled demo ledgers into a COA list (skip ERP-synced duplicates by parent+name). */
export function mergeBundledCoaDemoLedgers(records: ChartOfAccount[]): ChartOfAccount[] {
  const bundled = buildBundledCoaDemoLedgers(
    records.filter((r) => r.nodeLevel !== "ledger"),
  );

  const existingKeys = new Set(
    records
      .filter((r) => r.nodeLevel === "ledger" && r.parentAccountId != null)
      .map((r) => ledgerKey(r.parentAccountId!, r.accountName)),
  );

  const toAdd = bundled.filter((demo) => {
    const key = ledgerKey(demo.parentAccountId!, demo.accountName);
    return !existingKeys.has(key);
  });

  if (toAdd.length === 0) return records;
  return [...records, ...toAdd];
}

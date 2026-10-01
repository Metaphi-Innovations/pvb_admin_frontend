/**
 * Bundled COA demo ledgers — merge disabled.
 * Unlocked Level-4 demo / sample / placeholder ledgers are no longer injected into COA.
 * loadChartOfAccounts() keeps system nodes + user groups/ledgers only.
 */

import type { AccountType, ChartOfAccount } from "../../data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { roundMoney } from "@/lib/accounts/money-format";
import { SYSTEM_COA_NODES } from "../coa-seed-nodes";
import { COA_DEMO_LEDGER_SEEDS, type CoaDemoLedgerSeed } from "../coa-demo-ledgers";

export const COA_DEMO_SOURCE_MODULE = "coa_demo_bundle";

/** Ledger that absorbs the net opening-balance residual so the books open balanced. */
export const OPENING_BALANCE_DIFFERENCE_LEDGER = "Difference in Opening Balances";
const OPENING_BALANCE_DIFFERENCE_LEDGER_ID = 58001;
const OPENING_BALANCE_DIFFERENCE_PARENT = "Proprietor / Partner / Shareholder Capital";

/** Demo seeds skipped where system statutory ledgers are defined in coa-seed-nodes */
const SKIP_STATUTORY_DEMO_SUBGROUPS = new Set([
  "duties & taxes payable",
  "gst input",
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
  "Sundry Debtors": 45000,
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
  "Sundry Creditors": 55000,
  "Trade Payables / Sundry Creditors": 55000,
  "Duties & Taxes": 85000,
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

/** Sundry debtors — demo customer ledgers disabled (group remains). */
export const COA_DEMO_DEBTOR_SPECS: Array<{ name: string; openingBalance: number }> = [];

/** Sundry creditors — demo supplier ledgers disabled (group remains). */
export const COA_DEMO_CREDITOR_SPECS: Array<{ name: string; openingBalance: number }> = [];

/** Bank group + current account posting ledgers — demo banks disabled (group remains). */
export const COA_DEMO_BANK_SPECS: Array<{
  bankName: string;
  accountName: string;
  openingBalance: number;
}> = [];

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
    billWiseAccounting: false,
    bankAccountFlag: partial.bankAccountFlag ?? false,
    bankGroupFlag: partial.bankGroupFlag ?? false,
    isSystem: false,
    isSystemGenerated: true,
    ledgerKind: "MASTER",
    masterType: COA_DEMO_SOURCE_MODULE,
    masterId: null,
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

  const debtorsGroup =
    subGroupByName.get("sundry debtors") ??
    subGroupByName.get("trade receivables / sundry debtors") ??
    subGroupByName.get("accounts receivable");
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

  const creditorsGroup =
    subGroupByName.get("sundry creditors") ??
    subGroupByName.get("trade payables / sundry creditors") ??
    subGroupByName.get("accounts payable");
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

/**
 * Append (or refresh) the opening-balance difference ledger so that the sum of
 * every ledger opening (Debit positive, Credit negative) nets to zero. This keeps
 * the Trial Balance, Balance Sheet, and General Ledger opening columns balanced
 * from a single common source without inserting a hidden/hardcoded total plug —
 * the residual is shown transparently as its own Capital ledger.
 */
function withOpeningBalanceDifference(records: ChartOfAccount[]): ChartOfAccount[] {
  const withoutDiff = records.filter(
    (r) => r.accountName.trim().toLowerCase() !== OPENING_BALANCE_DIFFERENCE_LEDGER.toLowerCase(),
  );

  const netSigned = withoutDiff.reduce((sum, r) => {
    if (r.nodeLevel !== "ledger") return sum;
    const opening = Number(r.openingBalance) || 0;
    if (opening === 0) return sum;
    return sum + (r.balanceType === "Debit" ? opening : -opening);
  }, 0);

  const residual = roundMoney(netSigned);
  if (residual === 0) return withoutDiff;

  const parent = withoutDiff.find(
    (r) =>
      r.nodeLevel === "account_group" &&
      r.accountName.trim().toLowerCase() === OPENING_BALANCE_DIFFERENCE_PARENT.toLowerCase(),
  );
  if (!parent) return withoutDiff;

  // netSigned > 0 → openings are debit-heavy → balancing entry sits on the Credit side.
  const diffLedger = makeDemoLedger({
    id: OPENING_BALANCE_DIFFERENCE_LEDGER_ID,
    accountCode: "LED-OBD-0001",
    accountName: OPENING_BALANCE_DIFFERENCE_LEDGER,
    accountType: "Liability",
    nodeLevel: "ledger",
    parentAccountId: parent.id,
    parentAccount: parent.accountName,
    status: "active",
    openingBalance: Math.abs(residual),
    balanceType: residual > 0 ? "Credit" : "Debit",
    description: "Auto-balancing residual of imported opening balances",
  });

  return [...withoutDiff, diffLedger];
}

/**
 * Demo merge disabled — return COA records unchanged.
 * No generic / party / bank / opening-balance-plug demo ledgers are appended.
 */
export function mergeBundledCoaDemoLedgers(records: ChartOfAccount[]): ChartOfAccount[] {
  return records;
}

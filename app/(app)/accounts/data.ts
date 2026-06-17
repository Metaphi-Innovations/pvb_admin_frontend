import {
  COA_SYSTEM_REVISION,
  EXPECTED_SYSTEM_NODE_COUNT,
  SYSTEM_COA_NODES,
} from "./masters/coa-seed-nodes";

export type RecordStatus = "draft" | "approved" | "rejected" | "posted";

export type AccountType = "Asset" | "Liability" | "Income" | "Expense" | "Equity";

export type CoaNodeLevel = "primary_head" | "account_group" | "sub_group" | "ledger";

export type ErpUsageModule =
  | "procurement"
  | "sales"
  | "tada_claims"
  | "payments"
  | "journal";

export interface ChartOfAccount {
  id: number;
  accountCode: string;
  accountName: string;
  alias: string;
  accountType: AccountType;
  nodeLevel: CoaNodeLevel;
  parentAccountId: number | null;
  parentAccount: string;
  description: string;
  status: "active" | "inactive";
  usedIn: ErpUsageModule[];
  isSystem: boolean;
  openingBalance: number;
  balanceType: "Debit" | "Credit";
  gstApplicable: boolean;
  tdsApplicable: boolean;
  costCenterApplicable: boolean;
  bankAccountFlag: boolean;
  createdBy: string;
  updatedBy: string;
}

export interface Ledger {
  id: number;
  ledgerName: string;
  ledgerCode: string;
  accountType: AccountType;
  linkedAccount: string;
  openingBalance: number;
  balanceType: "Debit" | "Credit";
  currentBalance: number;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
}

export type TxnType =
  | "purchase"
  | "sales"
  | "purchase_return"
  | "sales_return"
  | "expenses"
  | "payment"
  | "bank_reconciliation"
  | "journal";

export interface AccountTxn {
  id: number;
  txnType: TxnType;
  number: string;
  date: string;
  party: string;
  referenceNo: string;
  referenceModule: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMode?: "Cash" | "Bank Transfer" | "UPI" | "Cheque" | "Other";
  remarks: string;
  status: RecordStatus;
  createdBy: string;
  updatedBy: string;
}

const COA_KEY = "ds_accounts_coa_v9";
const COA_META_KEY = "ds_accounts_coa_meta";
const LEDGER_KEY = "ds_accounts_ledgers";
const TXN_KEY = "ds_accounts_txns";

const LEGACY_COA_KEYS = [
  "ds_accounts_coa",
  "ds_accounts_coa_v5",
  "ds_accounts_coa_v6",
  "ds_accounts_coa_v7",
  "ds_accounts_coa_v8",
];

const COA_SEED: ChartOfAccount[] = [...SYSTEM_COA_NODES];

/** Legacy sample ledgers — never restore from storage */
const REMOVED_SEED_LEDGER_IDS = new Set([
  10001, 10002, 10003, 10004, 20001, 30001, 40001, 40002,
]);

const REMOVED_SEED_LEDGER_NAMES = new Set([
  "hdfc bank",
  "icici bank",
  "customer a",
  "vendor a",
  "domestic sales",
  "office rent",
  "salary expense",
  "office cash",
]);

function normalizeLedger(r: ChartOfAccount): ChartOfAccount {
  return {
    ...r,
    alias: r.alias ?? "",
    costCenterApplicable: r.costCenterApplicable ?? false,
    bankAccountFlag: r.bankAccountFlag ?? false,
    openingBalance: r.openingBalance ?? 0,
    balanceType: r.balanceType ?? "Debit",
    gstApplicable: r.gstApplicable ?? false,
    tdsApplicable: r.tdsApplicable ?? false,
  };
}

function isRemovedSeedLedger(record: ChartOfAccount): boolean {
  if (record.nodeLevel !== "ledger") return false;
  if (REMOVED_SEED_LEDGER_IDS.has(record.id)) return true;
  return REMOVED_SEED_LEDGER_NAMES.has(record.accountName.trim().toLowerCase());
}

/** Leaf sub-group or leaf account group — valid parent for user-created ledgers */
function canParentHoldLedger(parent: ChartOfAccount, systemNodes: ChartOfAccount[]): boolean {
  if (parent.nodeLevel === "sub_group") {
    return !systemNodes.some(
      (r) => r.parentAccountId === parent.id && r.nodeLevel === "sub_group",
    );
  }
  if (parent.nodeLevel === "account_group") {
    return !systemNodes.some(
      (r) => r.parentAccountId === parent.id && r.nodeLevel === "sub_group",
    );
  }
  return false;
}

function ensureCoaSystemStructure(stored: ChartOfAccount[]): ChartOfAccount[] {
  const mergedSystem = SYSTEM_COA_NODES.map((sys) => ({
    ...sys,
    status: "active" as const,
    isSystem: true,
    openingBalance: 0,
  }));

  const systemById = new Map(mergedSystem.map((n) => [n.id, n]));
  const systemByCode = new Map(mergedSystem.map((n) => [n.accountCode, n]));

  const userLedgers = stored
    .filter((r) => r.nodeLevel === "ledger" && !r.isSystem && !isRemovedSeedLedger(r))
    .map((r) => {
      let parent: ChartOfAccount | undefined;
      if (r.parentAccountId != null) {
        parent = systemById.get(r.parentAccountId);
        if (!parent) {
          const oldParent = stored.find((s) => s.id === r.parentAccountId);
          if (oldParent) parent = systemByCode.get(oldParent.accountCode);
        }
      }
      if (!parent || !canParentHoldLedger(parent, mergedSystem)) return null;
      return normalizeLedger({
        ...r,
        parentAccountId: parent.id,
        parentAccount: parent.accountName,
        openingBalance: r.openingBalance ?? 0,
        isSystem: false,
      });
    })
    .filter((r): r is ChartOfAccount => r != null);

  return [...mergedSystem, ...userLedgers];
}

function readCoaMeta(): { revision: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COA_META_KEY);
    return raw ? (JSON.parse(raw) as { revision: number }) : null;
  } catch {
    return null;
  }
}

function writeCoaMeta() {
  if (typeof window === "undefined") return;
  localStorage.setItem(COA_META_KEY, JSON.stringify({ revision: COA_SYSTEM_REVISION }));
}

function purgeLegacyCoaStorage() {
  if (typeof window === "undefined") return;
  for (const key of LEGACY_COA_KEYS) {
    localStorage.removeItem(key);
  }
}

function coaStorageNeedsReset(stored: ChartOfAccount[]): boolean {
  const meta = readCoaMeta();
  if (!meta || meta.revision !== COA_SYSTEM_REVISION) return true;
  const systemCount = stored.filter((r) => r.nodeLevel !== "ledger").length;
  if (systemCount !== EXPECTED_SYSTEM_NODE_COUNT) return true;
  if (stored.some((r) => r.nodeLevel === "ledger" && (r.isSystem || isRemovedSeedLedger(r)))) {
    return true;
  }
  return false;
}

const LEDGER_SEED: Ledger[] = [
  { id: 1, ledgerName: "Main Cash", ledgerCode: "LED-001", accountType: "Asset", linkedAccount: "Cash in Hand", openingBalance: 250000, balanceType: "Debit", currentBalance: 250000, status: "active", createdBy: "Admin", updatedBy: "Admin" },
  { id: 2, ledgerName: "Trade Creditors", ledgerCode: "LED-002", accountType: "Liability", linkedAccount: "Accounts Payable", openingBalance: 180000, balanceType: "Credit", currentBalance: 180000, status: "active", createdBy: "Admin", updatedBy: "Admin" },
];

const TXN_SEED: AccountTxn[] = [
  { id: 1, txnType: "purchase", number: "PUR-0001", date: "2026-06-01", party: "Agro Chem Distributors", referenceNo: "PO-2026-0001", referenceModule: "Procurement", amount: 100000, taxAmount: 18000, totalAmount: 118000, remarks: "", status: "approved", createdBy: "Admin", updatedBy: "Admin" },
  { id: 2, txnType: "sales", number: "SAL-0001", date: "2026-06-01", party: "Green Farm Retail", referenceNo: "INV-2026-0042", referenceModule: "Sales", amount: 150000, taxAmount: 27000, totalAmount: 177000, remarks: "", status: "approved", createdBy: "Admin", updatedBy: "Admin" },
  { id: 3, txnType: "journal", number: "JRN-0001", date: "2026-06-02", party: "Payroll Provision", referenceNo: "PAY-2026-05", referenceModule: "Payroll", amount: 80000, taxAmount: 0, totalAmount: 80000, remarks: "Month-end payroll accrual", status: "approved", createdBy: "Admin", updatedBy: "Admin" },
];

function getOrSeed<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T[];
  } catch {
    return seed;
  }
}

function save<T>(key: string, list: T[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(list));
}

export const loadChartOfAccounts = (): ChartOfAccount[] => {
  if (typeof window !== "undefined") {
    purgeLegacyCoaStorage();
  }

  const raw = getOrSeed(COA_KEY, COA_SEED);
  const source = coaStorageNeedsReset(raw) ? [] : raw;
  const merged = ensureCoaSystemStructure(source.length ? source : COA_SEED);

  if (typeof window !== "undefined") {
    save(COA_KEY, merged);
    writeCoaMeta();
  }

  return merged;
};

export const saveChartOfAccounts = (list: ChartOfAccount[]) => {
  const cleaned = ensureCoaSystemStructure(list);
  save(COA_KEY, cleaned);
  writeCoaMeta();
};
export const getSystemCoaNodes = () => SYSTEM_COA_NODES;

export function getCoaLedgers(): ChartOfAccount[] {
  return loadChartOfAccounts().filter((r) => r.nodeLevel === "ledger");
}

/** @deprecated Use getCoaLedgers() — ledgers live in Chart of Accounts hierarchy */
export const loadLedgers = () => getOrSeed(LEDGER_KEY, LEDGER_SEED);
/** @deprecated Use saveChartOfAccounts() */
export const saveLedgers = (list: Ledger[]) => save(LEDGER_KEY, list);
export const loadAccountTxns = () => getOrSeed(TXN_KEY, TXN_SEED);
export const saveAccountTxns = (list: AccountTxn[]) => save(TXN_KEY, list);

export function nextId<T extends { id: number }>(list: T[]) {
  return list.length ? Math.max(...list.map((x) => x.id)) + 1 : 1;
}

export function postEntryAfterApproval(input: {
  txnType: TxnType;
  approvalStatus: "approved" | "draft" | "rejected";
  sourceModule: string;
  sourceRefNo: string;
  party: string;
  amount: number;
  taxAmount?: number;
  createdBy?: string;
}): { posted: boolean; reason?: string; id?: number } {
  if (input.approvalStatus !== "approved") {
    return { posted: false, reason: "Posting allowed only after approval." };
  }
  const list = loadAccountTxns();
  const id = nextId(list);
  const prefix: Record<TxnType, string> = {
    purchase: "PUR",
    sales: "SAL",
    purchase_return: "PRT",
    sales_return: "SRT",
    expenses: "EXP",
    payment: "PAY",
    bank_reconciliation: "BNK",
    journal: "JRN",
  };
  const tax = input.taxAmount ?? 0;
  list.push({
    id,
    txnType: input.txnType,
    number: `${prefix[input.txnType]}-${String(id).padStart(4, "0")}`,
    date: new Date().toISOString().slice(0, 10),
    party: input.party,
    referenceNo: input.sourceRefNo,
    referenceModule: input.sourceModule,
    amount: input.amount,
    taxAmount: tax,
    totalAmount: input.amount + tax,
    remarks: "Auto-posted from approved workflow",
    status: "posted",
    createdBy: input.createdBy ?? "System",
    updatedBy: input.createdBy ?? "System",
  });
  saveAccountTxns(list);
  return { posted: true, id };
}

/** @deprecated Use computeTrialBalanceRows() from @/lib/accounts/ledger-reports */
export function getTrialBalanceRows() {
  const ledgers = loadLedgers();
  const txns = loadAccountTxns().filter((x) => x.status === "approved" || x.status === "posted");
  return ledgers.map((l) => {
    const debit = txns
      .filter((t) => ["purchase", "payment", "journal", "sales_return"].includes(t.txnType))
      .reduce((s, t) => s + t.totalAmount, 0) / Math.max(1, ledgers.length);
    const credit = txns
      .filter((t) => ["sales", "purchase_return", "journal"].includes(t.txnType))
      .reduce((s, t) => s + t.totalAmount, 0) / Math.max(1, ledgers.length);
    const opening = l.openingBalance;
    return {
      ledger: l.ledgerName,
      opening,
      debit,
      credit,
      closing: opening + debit - credit,
    };
  });
}

/** @deprecated Use computePandLRows() from @/lib/accounts/ledger-reports */
export function getPandL() {
  const txns = loadAccountTxns().filter((x) => x.status === "approved" || x.status === "posted");
  const income = txns
    .filter((x) => x.txnType === "sales" || x.txnType === "purchase_return")
    .reduce((s, x) => s + x.totalAmount, 0);
  const expense = txns
    .filter((x) => x.txnType === "purchase" || x.txnType === "sales_return" || x.txnType === "payment")
    .reduce((s, x) => s + x.totalAmount, 0);
  return { income, expense, net: income - expense };
}

/** @deprecated Use computeBalanceSheetRows() from @/lib/accounts/ledger-reports */
export function getBalanceSheet() {
  const ledgers = loadLedgers();
  const assets = ledgers
    .filter((l) => l.accountType === "Asset")
    .reduce((s, l) => s + l.currentBalance, 0);
  const liabilities = ledgers
    .filter((l) => l.accountType === "Liability")
    .reduce((s, l) => s + l.currentBalance, 0);
  const equity = ledgers
    .filter((l) => l.accountType === "Equity")
    .reduce((s, l) => s + l.currentBalance, 0);
  return { assets, liabilities, equity };
}

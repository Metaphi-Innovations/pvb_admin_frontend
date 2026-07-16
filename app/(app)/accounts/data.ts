import { demoDateAt } from "@/lib/accounts/demo-date-utils";
import {
  COA_SYSTEM_REVISION,
  EXPECTED_SYSTEM_NODE_COUNT,
  SYSTEM_COA_NODES,
} from "./masters/coa-seed-nodes";
import { mergeBundledCoaDemoLedgers } from "./masters/chart-of-accounts/coa-demo-bundle";
import { stripMisplacedGstLedgers } from "./masters/chart-of-accounts/coa-gst-duplicate-cleanup";
import { dispatchCoaChanged } from "@/lib/accounts/coa-events";

export type RecordStatus = "draft" | "approved" | "rejected" | "posted";

export type AccountType = "Asset" | "Liability" | "Income" | "Expense" | "Equity";

export type CoaNodeLevel = "primary_head" | "account_group" | "ledger";

/** Stable specialization for group-to-form routing and TDS/GST inheritance. */
export type CoaSpecializedGroupType =
  | "tds_payable"
  | "tds_receivable"
  | "gst_input"
  | "gst_output"
  | "gst_payable"
  | "gst_receivable"
  | "gst_duties"
  | "sundry_debtors"
  | "sundry_creditors"
  | "bank_accounts"
  | "cash_in_hand"
  | "inventory"
  | "warehouse"
  | "employee_payable";

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
  /** Bank name container under Bank Accounts — grouping only, not postable */
  bankGroupFlag?: boolean;
  /** ERP auto-created ledger — edit via source master only */
  isSystemGenerated?: boolean;
  erpSourceModule?: string;
  erpSourceId?: number;
  /** Inherited specialization for TDS/GST/party groups — sub-groups inherit from ancestors. */
  specializedGroupType?: CoaSpecializedGroupType;
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

const COA_KEY = "ds_accounts_coa_v10";
const COA_META_KEY = "ds_accounts_coa_meta";
const LEDGER_KEY = "ds_accounts_ledgers";
const TXN_KEY = "ds_accounts_txns";

let coaCache: ChartOfAccount[] | null = null;
let coaCoreCache: ChartOfAccount[] | null = null;

function clearCoaCache(): void {
  coaCache = null;
  coaCoreCache = null;
  try {
    const { invalidateCoaPathCache } =
      require("@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data") as typeof import("@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data");
    invalidateCoaPathCache();
  } catch {
    // optional during module init
  }
}

const LEGACY_COA_KEYS = [
  "ds_accounts_coa",
  "ds_accounts_coa_v5",
  "ds_accounts_coa_v6",
  "ds_accounts_coa_v7",
  "ds_accounts_coa_v8",
  "ds_accounts_coa_v9",
];

const LEGACY_COA_META_KEYS = ["ds_gst_coa_sync_v2"];

const COA_SEED: ChartOfAccount[] = [...SYSTEM_COA_NODES];

/** Legacy sample ledgers — never restore from storage */
const REMOVED_SEED_LEDGER_IDS = new Set([
  10001, 10002, 10003, 10004, 20001, 30001, 40001, 40002,
]);

const REMOVED_SEED_LEDGER_NAMES = new Set([
  // legacy v1-v4 names
  "hdfc bank",
  "icici bank",
  "customer a",
  "vendor a",
  "domestic sales",
  "office rent",
  "salary expense",
  "office cash",
  // v7 generic names replaced by v8 specific ledgers
  "retail sales",
  "distributor sales",
  "service revenue",
  "commission income",
  "office expense",
  "marketing expense",
  "professional fees",
  "bank charges",
]);

function normalizeLedger(r: ChartOfAccount): ChartOfAccount {
  return {
    ...r,
    alias: r.alias ?? "",
    costCenterApplicable: r.costCenterApplicable ?? false,
    bankAccountFlag: r.bankAccountFlag ?? false,
    bankGroupFlag: r.bankGroupFlag ?? false,
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

function migrateLegacyNodeLevel(level: string): CoaNodeLevel {
  if (level === "sub_group") return "account_group";
  if (level === "sub_ledger") return "ledger";
  return level as CoaNodeLevel;
}

function normalizeStructuralNode(
  r: ChartOfAccount,
  parent: ChartOfAccount,
): ChartOfAccount {
  return {
    ...r,
    alias: r.alias ?? "",
    parentAccountId: parent.id,
    parentAccount: parent.accountName,
    accountType: parent.accountType,
    specializedGroupType: parent.specializedGroupType,
    openingBalance: 0,
    balanceType: parent.balanceType ?? "Debit",
    gstApplicable: false,
    tdsApplicable: false,
    costCenterApplicable: false,
    bankAccountFlag: false,
    isSystem: false,
  };
}

function isManualSubGroupLedger(record: ChartOfAccount, allNodes: ChartOfAccount[]): boolean {
  if (record.nodeLevel !== "ledger") return false;
  if (record.isSystemGenerated || record.erpSourceModule) return false;
  return allNodes.some(
    (c) => c.parentAccountId === record.id && c.nodeLevel === "ledger",
  );
}

function shouldKeepUserLedger(record: ChartOfAccount, allNodes: ChartOfAccount[]): boolean {
  if (record.isSystemGenerated || record.erpSourceModule) return true;
  return !isManualSubGroupLedger(record, allNodes);
}

const LEGACY_STATUTORY_GROUP_NAMES = new Set([
  "gst input",
  "gst input credit",
  "gst output",
  "gst payable",
  "tds receivable",
  "tds payable",
  "duties & taxes",
  "duties & taxes payable",
]);

function isLegacyStatutoryGroup(record: ChartOfAccount): boolean {
  return (
    record.nodeLevel === "account_group" &&
    LEGACY_STATUTORY_GROUP_NAMES.has(record.accountName.trim().toLowerCase())
  );
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

  const migratedStored = stored.map((r) => ({
    ...r,
    nodeLevel: migrateLegacyNodeLevel(r.nodeLevel),
  }));

  const rawUserGroups = migratedStored.filter(
    (r) => r.nodeLevel === "account_group" && !r.isSystem && !isLegacyStatutoryGroup(r),
  );

  const rawUserLedgers = migratedStored.filter(
    (r) =>
      r.nodeLevel === "ledger" &&
      !r.isSystem &&
      !isRemovedSeedLedger(r) &&
      shouldKeepUserLedger(r, migratedStored),
  );

  const userGroups: ChartOfAccount[] = [];
  const groupById = new Map<number, ChartOfAccount>();
  let remainingGroups = [...rawUserGroups];

  function resolveStructuralParent(r: ChartOfAccount): ChartOfAccount | undefined {
    if (r.parentAccountId == null) return undefined;
    const fromSystem = systemById.get(r.parentAccountId);
    if (fromSystem) return fromSystem;
    const fromGroup = groupById.get(r.parentAccountId);
    if (fromGroup) return fromGroup;
    const oldParent = migratedStored.find((s) => s.id === r.parentAccountId);
    if (!oldParent) return undefined;
    return systemByCode.get(oldParent.accountCode) ?? groupById.get(oldParent.id);
  }

  while (remainingGroups.length > 0) {
    const next: ChartOfAccount[] = [];
    for (const r of remainingGroups) {
      const parent = resolveStructuralParent(r);
      if (!parent) {
        next.push(r);
        continue;
      }
      if (parent.nodeLevel !== "primary_head" && parent.nodeLevel !== "account_group") {
        next.push(r);
        continue;
      }
      const normalized = normalizeStructuralNode(r, parent);
      userGroups.push(normalized);
      groupById.set(normalized.id, normalized);
    }
    if (next.length === remainingGroups.length) break;
    remainingGroups = next;
  }

  const userLedgers: ChartOfAccount[] = [];
  const ledgerById = new Map<number, ChartOfAccount>();
  let remaining = [...rawUserLedgers];

  function resolveParent(r: ChartOfAccount): ChartOfAccount | undefined {
    if (r.parentAccountId == null) return undefined;
    const fromSystem = systemById.get(r.parentAccountId);
    if (fromSystem) return fromSystem;
    const fromGroup = groupById.get(r.parentAccountId);
    if (fromGroup) return fromGroup;
    const fromLedger = ledgerById.get(r.parentAccountId);
    if (fromLedger) return fromLedger;
    const oldParent = migratedStored.find((s) => s.id === r.parentAccountId);
    if (!oldParent) return undefined;
    return (
      systemByCode.get(oldParent.accountCode) ??
      groupById.get(oldParent.id) ??
      ledgerById.get(oldParent.id)
    );
  }

  while (remaining.length > 0) {
    const next: ChartOfAccount[] = [];
    for (const r of remaining) {
      const parent = resolveParent(r);
      if (!parent) {
        next.push(r);
        continue;
      }
      if (parent.nodeLevel !== "account_group" && parent.nodeLevel !== "ledger") {
        next.push(r);
        continue;
      }
      const normalized = normalizeLedger({
        ...r,
        nodeLevel: "ledger",
        parentAccountId: parent.id,
        parentAccount: parent.accountName,
        openingBalance: r.openingBalance ?? 0,
        isSystem: false,
      });
      userLedgers.push(normalized);
      ledgerById.set(normalized.id, normalized);
    }
    if (next.length === remaining.length) break;
    remaining = next;
  }

  return stripMisplacedGstLedgers(
    mergeBundledCoaDemoLedgers([...mergedSystem, ...userGroups, ...userLedgers]),
  );
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
  for (const key of LEGACY_COA_META_KEYS) {
    localStorage.removeItem(key);
  }
}

function coaStorageNeedsReset(stored: ChartOfAccount[]): boolean {
  const meta = readCoaMeta();
  if (!meta || meta.revision !== COA_SYSTEM_REVISION) return true;
  const systemCount = stored.filter((r) => r.isSystem).length;
  if (systemCount !== EXPECTED_SYSTEM_NODE_COUNT) return true;
  if (stored.some((r) => r.nodeLevel === "ledger" && isRemovedSeedLedger(r))) {
    return true;
  }
  return false;
}

const LEDGER_SEED: Ledger[] = [
  { id: 1, ledgerName: "Main Cash", ledgerCode: "LED-001", accountType: "Asset", linkedAccount: "Cash in Hand", openingBalance: 250000, balanceType: "Debit", currentBalance: 250000, status: "active", createdBy: "Admin", updatedBy: "Admin" },
  { id: 2, ledgerName: "Trade Creditors", ledgerCode: "LED-002", accountType: "Liability", linkedAccount: "Accounts Payable", openingBalance: 180000, balanceType: "Credit", currentBalance: 180000, status: "active", createdBy: "Admin", updatedBy: "Admin" },
];

const TXN_SEED: AccountTxn[] = [
  { id: 1, txnType: "purchase", number: "PUR-0001", date: demoDateAt(0), party: "Agro Chem Distributors", referenceNo: "PO-2026-0001", referenceModule: "Procurement", amount: 100000, taxAmount: 18000, totalAmount: 118000, remarks: "", status: "approved", createdBy: "Admin", updatedBy: "Admin" },
  { id: 2, txnType: "sales", number: "SAL-0001", date: demoDateAt(1), party: "Green Farm Retail", referenceNo: "INV-2026-0042", referenceModule: "Sales", amount: 150000, taxAmount: 27000, totalAmount: 177000, remarks: "", status: "approved", createdBy: "Admin", updatedBy: "Admin" },
  { id: 3, txnType: "journal", number: "JRN-0001", date: demoDateAt(2), party: "Payroll Provision", referenceNo: "PAY-2026-05", referenceModule: "Payroll", amount: 80000, taxAmount: 0, totalAmount: 80000, remarks: "Month-end payroll accrual", status: "approved", createdBy: "Admin", updatedBy: "Admin" },
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

/** Load COA from storage without GST Master sync (used internally to avoid sync loops). */
export function loadChartOfAccountsCore(): ChartOfAccount[] {
  if (coaCoreCache) return coaCoreCache;

  if (typeof window !== "undefined") {
    purgeLegacyCoaStorage();
  }

  const raw = getOrSeed(COA_KEY, COA_SEED);
  const stripped = stripMisplacedGstLedgers(raw);
  const needsReset = coaStorageNeedsReset(stripped);
  // A system revision replaces protected system nodes but must retain user groups
  // and ledgers. ensureCoaSystemStructure performs that merge by stable IDs/codes.
  const merged = ensureCoaSystemStructure(stripped.length ? stripped : COA_SEED);

  coaCoreCache = merged;

  if (
    typeof window !== "undefined" &&
    (needsReset || merged.length !== raw.length || stripped.length !== raw.length)
  ) {
    const persist = () => {
      save(COA_KEY, merged);
      writeCoaMeta();
    };
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(persist, { timeout: 2500 });
    } else {
      window.setTimeout(persist, 0);
    }
  }

  return merged;
}

export const loadChartOfAccounts = (): ChartOfAccount[] => {
  if (coaCache) return coaCache;
  coaCache = loadChartOfAccountsCore();
  return coaCache;
};

export const saveChartOfAccounts = (list: ChartOfAccount[]) => {
  const cleaned = ensureCoaSystemStructure(list);
  save(COA_KEY, cleaned);
  writeCoaMeta();
  clearCoaCache();
  try {
    const { invalidateLedgerReportCaches } = require("@/lib/accounts/ledger-reports") as typeof import("@/lib/accounts/ledger-reports");
    invalidateLedgerReportCaches();
  } catch {
    // optional — avoid circular init issues during module load
  }
  dispatchCoaChanged();
};
export const getSystemCoaNodes = () => SYSTEM_COA_NODES;

export function getCoaLedgers(): ChartOfAccount[] {
  return loadChartOfAccounts().filter((r) => r.nodeLevel === "ledger");
}

/** Posting ledgers: active leaf ledgers only (no groups or parent grouping ledgers). */
export function getPostableCoaAccounts(records?: ChartOfAccount[]): ChartOfAccount[] {
  const list = records ?? loadChartOfAccounts();
  const groupingLedgerIds = new Set<number>();
  for (const r of list) {
    if (r.nodeLevel === "ledger" && r.parentAccountId != null) {
      groupingLedgerIds.add(r.parentAccountId);
    }
  }
  return list.filter(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.status === "active" &&
      !groupingLedgerIds.has(r.id),
  );
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

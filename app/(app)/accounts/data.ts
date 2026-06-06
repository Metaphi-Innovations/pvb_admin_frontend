export type RecordStatus = "draft" | "approved" | "rejected" | "posted";

export type AccountType = "Asset" | "Liability" | "Income" | "Expense" | "Equity";

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
  accountType: AccountType;
  parentAccountId: number | null;
  parentAccount: string;
  description: string;
  status: "active" | "inactive";
  usedIn: ErpUsageModule[];
  isSystem: boolean;
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

const COA_KEY = "ds_accounts_coa_v2";
const LEDGER_KEY = "ds_accounts_ledgers";
const TXN_KEY = "ds_accounts_txns";

const COA_SEED: ChartOfAccount[] = [
  {
    id: 1,
    accountCode: "1000",
    accountName: "Assets",
    accountType: "Asset",
    parentAccountId: null,
    parentAccount: "",
    description: "System asset group",
    status: "active",
    usedIn: [],
    isSystem: true,
    createdBy: "System",
    updatedBy: "System",
  },
  {
    id: 2,
    accountCode: "2000",
    accountName: "Liabilities",
    accountType: "Liability",
    parentAccountId: null,
    parentAccount: "",
    description: "System liability group",
    status: "active",
    usedIn: [],
    isSystem: true,
    createdBy: "System",
    updatedBy: "System",
  },
  {
    id: 3,
    accountCode: "3000",
    accountName: "Income",
    accountType: "Income",
    parentAccountId: null,
    parentAccount: "",
    description: "System income group",
    status: "active",
    usedIn: [],
    isSystem: true,
    createdBy: "System",
    updatedBy: "System",
  },
  {
    id: 4,
    accountCode: "4000",
    accountName: "Expenses",
    accountType: "Expense",
    parentAccountId: null,
    parentAccount: "",
    description: "System expense group",
    status: "active",
    usedIn: [],
    isSystem: true,
    createdBy: "System",
    updatedBy: "System",
  },
  {
    id: 5,
    accountCode: "5000",
    accountName: "Equity",
    accountType: "Equity",
    parentAccountId: null,
    parentAccount: "",
    description: "System equity group",
    status: "active",
    usedIn: [],
    isSystem: true,
    createdBy: "System",
    updatedBy: "System",
  },
  {
    id: 10,
    accountCode: "1010",
    accountName: "Cash",
    accountType: "Asset",
    parentAccountId: 1,
    parentAccount: "Assets",
    description: "Cash on hand",
    status: "active",
    usedIn: ["payments", "journal"],
    isSystem: false,
    createdBy: "Admin",
    updatedBy: "Admin",
  },
  {
    id: 11,
    accountCode: "1020",
    accountName: "Bank",
    accountType: "Asset",
    parentAccountId: 1,
    parentAccount: "Assets",
    description: "Bank accounts",
    status: "active",
    usedIn: ["payments", "journal"],
    isSystem: false,
    createdBy: "Admin",
    updatedBy: "Admin",
  },
  {
    id: 20,
    accountCode: "2010",
    accountName: "Vendor Payable",
    accountType: "Liability",
    parentAccountId: 2,
    parentAccount: "Liabilities",
    description: "Amounts owed to vendors",
    status: "active",
    usedIn: ["procurement", "payments"],
    isSystem: false,
    createdBy: "Admin",
    updatedBy: "Admin",
  },
  {
    id: 21,
    accountCode: "2020",
    accountName: "Employee Payable",
    accountType: "Liability",
    parentAccountId: 2,
    parentAccount: "Liabilities",
    description: "Employee reimbursements & claims payable",
    status: "active",
    usedIn: ["tada_claims", "payments"],
    isSystem: false,
    createdBy: "Admin",
    updatedBy: "Admin",
  },
  {
    id: 30,
    accountCode: "3010",
    accountName: "Sales Income",
    accountType: "Income",
    parentAccountId: 3,
    parentAccount: "Income",
    description: "Revenue from sales",
    status: "active",
    usedIn: ["sales"],
    isSystem: false,
    createdBy: "Admin",
    updatedBy: "Admin",
  },
  {
    id: 40,
    accountCode: "4010",
    accountName: "Purchase Expense",
    accountType: "Expense",
    parentAccountId: 4,
    parentAccount: "Expenses",
    description: "Procurement purchases",
    status: "active",
    usedIn: ["procurement"],
    isSystem: false,
    createdBy: "Admin",
    updatedBy: "Admin",
  },
  {
    id: 41,
    accountCode: "4020",
    accountName: "Travel Expense",
    accountType: "Expense",
    parentAccountId: 4,
    parentAccount: "Expenses",
    description: "TA/DA and travel claims",
    status: "active",
    usedIn: ["tada_claims", "journal"],
    isSystem: false,
    createdBy: "Admin",
    updatedBy: "Admin",
  },
];

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

export const loadChartOfAccounts = () => getOrSeed(COA_KEY, COA_SEED);
export const saveChartOfAccounts = (list: ChartOfAccount[]) => save(COA_KEY, list);
export const loadLedgers = () => getOrSeed(LEDGER_KEY, LEDGER_SEED);
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

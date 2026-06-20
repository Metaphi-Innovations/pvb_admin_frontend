import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import {
  formToLedger,
  generateLedgerCode,
  type LedgerFormValues,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import { computeLedgerCurrentBalance } from "@/app/(app)/accounts/masters/ledgers/ledgers-utils";
import {
  getBankAccountsSubGroup,
  getBankAccountLedgersUnderGroup,
  getBankGroups,
  isBankAccountLedger,
} from "@/lib/accounts/bank-coa-utils";
import { upsertErpPartyLink } from "@/lib/accounts/erp-party-links";
import {
  formatBankAccountLabel,
  formatBankAccountMaster,
} from "@/lib/accounts/bank-account-display";

export type BankAccountType = "Current" | "Savings" | "OD" | "CC";
export type ReconciliationStatus = "unreconciled" | "partial" | "reconciled";

export interface BankAccountMaster {
  id: number;
  coaLedgerId: number;
  bankGroupCoaId: number;
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  ifsc: string;
  branchName: string;
  accountType: BankAccountType;
  openingBalance: number;
  balanceType: "Debit" | "Credit";
  reconciliationEnabled: boolean;
  defaultForReceipts: boolean;
  defaultForPayments: boolean;
  reconciliationStatus: ReconciliationStatus;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
}

export interface BankGroupSummary {
  bankGroupCoaId: number;
  bankName: string;
  accountCount: number;
  totalBalance: number;
  unreconciledCount: number;
}

export interface CreateBankAccountInput {
  bankName: string;
  bankGroupCoaId?: number | null;
  accountNickname: string;
  accountNumber: string;
  ifsc: string;
  branchName: string;
  accountType: BankAccountType;
  openingBalance: number;
  balanceType?: "Debit" | "Credit";
  reconciliationEnabled: boolean;
  defaultForReceipts: boolean;
  defaultForPayments: boolean;
  status?: "active" | "inactive";
}

const STORAGE_KEY = "ds_accounts_bank_accounts_v2";
const SEED_FLAG_KEY = "ds_accounts_bank_coa_seeded_v1";

function defaultLedgerForm(
  parentId: number,
  name: string,
  flags: Partial<LedgerFormValues>,
): LedgerFormValues {
  return {
    ledgerName: name,
    alias: "",
    description: "",
    parentGroupId: parentId,
    openingBalance: "0",
    balanceType: "Debit",
    gstApplicable: false,
    tdsApplicable: false,
    costCenterApplicable: false,
    bankAccountFlag: false,
    bankGroupFlag: false,
    status: "active",
    ...flags,
  };
}

export function loadBankAccountMasters(): BankAccountMaster[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BankAccountMaster[];
  } catch {
    return [];
  }
}

export function saveBankAccountMasters(list: BankAccountMaster[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getBankAccountByLedgerId(ledgerId: number): BankAccountMaster | undefined {
  return loadBankAccountMasters().find((b) => b.coaLedgerId === ledgerId);
}

export function getBankAccountById(id: number): BankAccountMaster | undefined {
  return loadBankAccountMasters().find((b) => b.id === id);
}

function ledgerDisplayName(nickname: string, accountNumber: string): string {
  return formatBankAccountLabel(nickname, accountNumber);
}

/** Keep COA bank ledger names aligned with master nickname + masked account number. */
export function syncBankLedgerDisplayNames(): void {
  if (typeof window === "undefined") return;
  const masters = loadBankAccountMasters();
  if (masters.length === 0) return;

  const records = loadChartOfAccounts();
  let changed = false;
  const next = records.map((r) => {
    const master = masters.find((m) => m.coaLedgerId === r.id);
    if (!master) return r;
    const expected = formatBankAccountMaster(master);
    if (r.accountName === expected) return r;
    changed = true;
    return { ...r, accountName: expected };
  });
  if (changed) saveChartOfAccounts(next);
}

export function listBankAccountSelectOptions(): BankAccountSelectOption[] {
  syncBankLedgerDisplayNames();
  return loadBankAccountMasters()
    .filter((m) => m.status === "active")
    .map((m) => ({
      id: m.id,
      label: formatBankAccountMaster(m),
      bankName: m.bankName,
      accountNickname: m.accountNickname,
      accountNumber: m.accountNumber,
      coaLedgerId: m.coaLedgerId,
    }));
}

export interface BankAccountSelectOption {
  id: number;
  label: string;
  bankName: string;
  accountNickname: string;
  accountNumber: string;
  coaLedgerId: number;
}

export function createBankGroup(bankName: string): ChartOfAccount {
  const records = loadChartOfAccounts();
  const bankSub = getBankAccountsSubGroup(records);
  if (!bankSub) throw new Error("Bank Accounts sub-group not found in Chart of Accounts.");

  const dup = records.find(
    (r) =>
      r.parentAccountId === bankSub.id &&
      r.bankGroupFlag &&
      r.accountName.toLowerCase() === bankName.trim().toLowerCase(),
  );
  if (dup) return dup;

  const form = defaultLedgerForm(bankSub.id, bankName.trim(), {
    bankGroupFlag: true,
    bankAccountFlag: false,
    openingBalance: "0",
  });
  const code = generateLedgerCode(records);
  const row = formToLedger(form, nextId(records), code, records);
  const withFlag: ChartOfAccount = { ...row, bankGroupFlag: true, bankAccountFlag: false };
  saveChartOfAccounts([...records, withFlag]);
  return withFlag;
}

export function findOrCreateBankGroup(bankName: string): ChartOfAccount {
  const records = loadChartOfAccounts();
  const bankSub = getBankAccountsSubGroup(records);
  if (!bankSub) throw new Error("Bank Accounts sub-group not found.");

  const existing = records.find(
    (r) =>
      r.parentAccountId === bankSub.id &&
      r.bankGroupFlag &&
      r.accountName.toLowerCase() === bankName.trim().toLowerCase(),
  );
  if (existing) return existing;
  return createBankGroup(bankName);
}

export function createBankAccountWithLedger(input: CreateBankAccountInput): BankAccountMaster {
  let records = loadChartOfAccounts();
  let bankGroup =
    input.bankGroupCoaId != null
      ? records.find((r) => r.id === input.bankGroupCoaId)
      : undefined;
  if (!bankGroup?.bankGroupFlag) {
    bankGroup = findOrCreateBankGroup(input.bankName);
    records = loadChartOfAccounts();
    bankGroup = records.find((r) => r.id === bankGroup!.id) ?? bankGroup;
  }

  if (!bankGroup?.bankGroupFlag) {
    throw new Error("Select a valid bank group.");
  }

  const ledgerName = ledgerDisplayName(input.accountNickname.trim(), input.accountNumber.trim());
  const form = defaultLedgerForm(bankGroup.id, ledgerName, {
    bankAccountFlag: true,
    bankGroupFlag: false,
    openingBalance: String(input.openingBalance),
    balanceType: input.balanceType ?? "Debit",
    status: input.status ?? "active",
  });

  const code = generateLedgerCode(records);
  const ledger = formToLedger(form, nextId(records), code, records);
  const ledgerRow: ChartOfAccount = {
    ...ledger,
    bankAccountFlag: true,
    bankGroupFlag: false,
    isSystemGenerated: true,
    erpSourceModule: "bank_master",
  };
  saveChartOfAccounts([...records, ledgerRow]);

  const masters = loadBankAccountMasters();
  if (input.defaultForReceipts) {
    masters.forEach((m) => {
      m.defaultForReceipts = false;
    });
  }
  if (input.defaultForPayments) {
    masters.forEach((m) => {
      m.defaultForPayments = false;
    });
  }

  const row: BankAccountMaster = {
    id: nextId(masters),
    coaLedgerId: ledgerRow.id,
    bankGroupCoaId: bankGroup.id,
    bankName: bankGroup.accountName,
    accountNickname: input.accountNickname.trim(),
    accountNumber: input.accountNumber.trim(),
    ifsc: input.ifsc.trim().toUpperCase(),
    branchName: input.branchName.trim(),
    accountType: input.accountType,
    openingBalance: input.openingBalance,
    balanceType: input.balanceType ?? "Debit",
    reconciliationEnabled: input.reconciliationEnabled,
    defaultForReceipts: input.defaultForReceipts,
    defaultForPayments: input.defaultForPayments,
    reconciliationStatus: "unreconciled",
    status: input.status ?? "active",
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
  masters.push(row);
  saveBankAccountMasters(masters);

  ledgerRow.erpSourceId = row.id;
  saveChartOfAccounts(
    loadChartOfAccounts().map((r) => (r.id === ledgerRow.id ? { ...r, erpSourceId: row.id } : r)),
  );

  upsertErpPartyLink({
    ledgerId: ledgerRow.id,
    erpSourceModule: "bank_master",
    erpSourceId: row.id,
    partyCode: row.accountNumber || `BANK-${row.id}`,
    partyName: formatBankAccountMaster(row),
  });

  syncBankLedgerDisplayNames();
  return row;
}

export function computeBankGroupSummaries(): BankGroupSummary[] {
  const records = loadChartOfAccounts();
  const masters = loadBankAccountMasters();
  return getBankGroups(records).map((group) => {
    const accounts = getBankAccountLedgersUnderGroup(records, group.id);
    const linked = masters.filter((m) => m.bankGroupCoaId === group.id && m.status === "active");
    const totalBalance = accounts.reduce(
      (s, l) => s + computeLedgerCurrentBalance(l).amount,
      0,
    );
    const unreconciledCount = linked.filter((m) => m.reconciliationStatus !== "reconciled").length;
    return {
      bankGroupCoaId: group.id,
      bankName: group.accountName,
      accountCount: accounts.length,
      totalBalance,
      unreconciledCount,
    };
  });
}

export function listAccountsForBankGroup(bankGroupCoaId: number): BankAccountMaster[] {
  return loadBankAccountMasters().filter(
    (m) => m.bankGroupCoaId === bankGroupCoaId && m.status === "active",
  );
}

export function loadBankAccountsForReconciliation(): {
  id: number;
  name: string;
  displayLabel: string;
  accountNumber: string;
  bankName: string;
  coaLedgerId: number;
  status: "active" | "inactive";
}[] {
  syncBankLedgerDisplayNames();
  return loadBankAccountMasters()
    .filter((m) => m.status === "active")
    .map((m) => ({
      id: m.id,
      name: m.accountNickname,
      displayLabel: formatBankAccountMaster(m),
      accountNumber: m.accountNumber,
      bankName: m.bankName,
      coaLedgerId: m.coaLedgerId,
      status: m.status,
    }));
}

export function ensureDemoBankCoaStructure(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(SEED_FLAG_KEY)) return;

  const records = loadChartOfAccounts();
  const bankSub = getBankAccountsSubGroup(records);
  if (!bankSub) return;

  const hasGroups = records.some((r) => r.parentAccountId === bankSub.id && r.bankGroupFlag);
  if (!hasGroups) {
    const hdfc = createBankGroup("HDFC Bank");
    const icici = createBankGroup("ICICI Bank");

    createBankAccountWithLedger({
      bankName: "HDFC Bank",
      bankGroupCoaId: hdfc.id,
      accountNickname: "HDFC Current A/c",
      accountNumber: "5020000004499",
      ifsc: "HDFC0001234",
      branchName: "Mumbai Main",
      accountType: "Current",
      openingBalance: 250000,
      reconciliationEnabled: true,
      defaultForReceipts: true,
      defaultForPayments: false,
    });
    createBankAccountWithLedger({
      bankName: "HDFC Bank",
      bankGroupCoaId: hdfc.id,
      accountNickname: "HDFC Collection A/c",
      accountNumber: "5020000007821",
      ifsc: "HDFC0001234",
      branchName: "Mumbai Main",
      accountType: "Current",
      openingBalance: 180000,
      reconciliationEnabled: true,
      defaultForReceipts: false,
      defaultForPayments: true,
    });
    createBankAccountWithLedger({
      bankName: "HDFC Bank",
      bankGroupCoaId: hdfc.id,
      accountNickname: "HDFC Salary A/c",
      accountNumber: "5020000001134",
      ifsc: "HDFC0001234",
      branchName: "Mumbai Main",
      accountType: "Current",
      openingBalance: 95000,
      reconciliationEnabled: true,
      defaultForReceipts: false,
      defaultForPayments: false,
    });
    createBankAccountWithLedger({
      bankName: "ICICI Bank",
      bankGroupCoaId: icici.id,
      accountNickname: "ICICI Current A/c",
      accountNumber: "006501234567",
      ifsc: "ICIC0001234",
      branchName: "Pune Branch",
      accountType: "Current",
      openingBalance: 120000,
      reconciliationEnabled: true,
      defaultForReceipts: false,
      defaultForPayments: false,
    });
  }

  localStorage.setItem(SEED_FLAG_KEY, "1");
  syncBankLedgerDisplayNames();
}

export function syncMastersFromCoaLedgers(): void {
  const records = loadChartOfAccounts();
  const masters = loadBankAccountMasters();
  const ledgers = records.filter((r) => isBankAccountLedger(r));
  let changed = false;
  for (const ledger of ledgers) {
    if (masters.some((m) => m.coaLedgerId === ledger.id)) continue;
    const parent = records.find((r) => r.id === ledger.parentAccountId);
    if (!parent?.bankGroupFlag) continue;
    masters.push({
      id: nextId(masters),
      coaLedgerId: ledger.id,
      bankGroupCoaId: parent.id,
      bankName: parent.accountName,
      accountNickname: ledger.accountName,
      accountNumber: "",
      ifsc: "",
      branchName: "",
      accountType: "Current",
      openingBalance: ledger.openingBalance,
      balanceType: ledger.balanceType,
      reconciliationEnabled: true,
      defaultForReceipts: false,
      defaultForPayments: false,
      reconciliationStatus: "unreconciled",
      status: ledger.status,
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
    });
    changed = true;
  }
  if (changed) saveBankAccountMasters(masters);
}

export function loadBankAccounts(): BankAccountMaster[] {
  ensureDemoBankCoaStructure();
  syncMastersFromCoaLedgers();
  return loadBankAccountMasters();
}

export function addBankAccount(
  input: CreateBankAccountInput,
): BankAccountMaster {
  ensureDemoBankCoaStructure();
  return createBankAccountWithLedger(input);
}

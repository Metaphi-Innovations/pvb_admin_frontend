import {
  type AccountType,
  type ChartOfAccount,
  type ErpUsageModule,
  loadChartOfAccounts,
  saveChartOfAccounts,
} from "../../data";

export type { ChartOfAccount, AccountType, ErpUsageModule };
export { loadChartOfAccounts, saveChartOfAccounts };

export const ACCOUNT_TYPE_OPTIONS: AccountType[] = [
  "Asset",
  "Liability",
  "Income",
  "Expense",
  "Equity",
];

export const ERP_USAGE_OPTIONS: { value: ErpUsageModule; label: string }[] = [
  { value: "procurement", label: "Procurement" },
  { value: "sales", label: "Sales" },
  { value: "tada_claims", label: "TA/DA Claims" },
  { value: "payments", label: "Payments" },
  { value: "journal", label: "Journal" },
];

const TYPE_BASE: Record<AccountType, number> = {
  Asset: 1000,
  Liability: 2000,
  Income: 3000,
  Expense: 4000,
  Equity: 5000,
};

export interface ChartOfAccountFormValues {
  accountName: string;
  accountType: AccountType;
  parentAccountId: number | null;
  description: string;
  status: "active" | "inactive";
  usedIn: ErpUsageModule[];
}

export const DEFAULT_COA_FORM: ChartOfAccountFormValues = {
  accountName: "",
  accountType: "Expense",
  parentAccountId: null,
  description: "",
  status: "active",
  usedIn: [],
};

export function generateAccountCode(
  accountType: AccountType,
  records: ChartOfAccount[],
): string {
  const base = TYPE_BASE[accountType];
  const reserved = new Set(
    records.filter((r) => r.isSystem).map((r) => parseInt(r.accountCode, 10)),
  );
  const nums = records
    .filter((r) => r.accountType === accountType)
    .map((r) => parseInt(r.accountCode, 10))
    .filter((n) => !Number.isNaN(n) && n >= base && n < base + 900);
  let next = nums.length ? Math.max(...nums) + 10 : base + 10;
  while (reserved.has(next)) next += 10;
  return String(next);
}

export function getParentAccountOptions(
  records: ChartOfAccount[],
  accountType: AccountType,
  excludeId?: number,
): ChartOfAccount[] {
  return records.filter(
    (r) =>
      r.accountType === accountType &&
      r.id !== excludeId &&
      (r.isSystem || !r.parentAccountId),
  );
}

export function resolveParentName(
  records: ChartOfAccount[],
  parentId: number | null,
): string {
  if (!parentId) return "";
  return records.find((r) => r.id === parentId)?.accountName ?? "";
}

export function recordToForm(r: ChartOfAccount): ChartOfAccountFormValues {
  return {
    accountName: r.accountName,
    accountType: r.accountType,
    parentAccountId: r.parentAccountId,
    description: r.description,
    status: r.status,
    usedIn: [...r.usedIn],
  };
}

export function formToRecord(
  form: ChartOfAccountFormValues,
  id: number,
  accountCode: string,
  records: ChartOfAccount[],
  existing?: ChartOfAccount,
): ChartOfAccount {
  const parentName = resolveParentName(records, form.parentAccountId);
  return {
    id,
    accountCode: existing?.isSystem ? existing.accountCode : accountCode,
    accountName: form.accountName.trim(),
    accountType: existing?.isSystem ? existing.accountType : form.accountType,
    parentAccountId: form.parentAccountId,
    parentAccount: parentName,
    description: form.description.trim(),
    status: form.status,
    usedIn: form.usedIn,
    isSystem: existing?.isSystem ?? false,
    createdBy: existing?.createdBy ?? "Admin",
    updatedBy: "Admin",
  };
}

export function validateCoaForm(
  form: ChartOfAccountFormValues,
  records: ChartOfAccount[],
  editingId?: number,
): string | null {
  if (!form.accountName.trim()) return "Account name is required.";
  const dup = records.find(
    (r) =>
      r.id !== editingId &&
      r.accountName.toLowerCase() === form.accountName.trim().toLowerCase(),
  );
  if (dup) return "An account with this name already exists.";
  return null;
}

export function canDeleteCoa(record: ChartOfAccount, records: ChartOfAccount[]): boolean {
  if (record.isSystem) return false;
  const hasChildren = records.some((r) => r.parentAccountId === record.id);
  return !hasChildren;
}

export function formatUsedIn(modules: ErpUsageModule[]): string {
  if (!modules.length) return "—";
  return modules
    .map((m) => ERP_USAGE_OPTIONS.find((o) => o.value === m)?.label ?? m)
    .join(", ");
}
